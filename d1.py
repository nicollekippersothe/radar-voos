"""Sincroniza as leituras do coletor com o banco D1 da Cloudflare.

O banco guarda um preço só quando ele muda (ver cloudflare/schema.sql). A cada
rodada do coletor este módulo:

  1. lê do banco o preço vigente dos voos da janela que a rodada cobriu;
  2. compara com o que acabou de ser lido;
  3. grava só o que mudou: voo novo, preço novo, ou voo que saiu da lista.

O banco é a fonte da verdade do estado, então se uma rodada falhar a seguinte
corrige sozinha (perde-se só o ponto intermediário). Se as variáveis de ambiente
não estiverem configuradas, não faz nada e o coletor segue gravando só os CSV.

Variáveis:
  CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (permissão D1 Edit), D1_DATABASE_ID
  D1_LIMITE_DIARIO   trava de escritas por dia UTC (padrão 90000; o gratuito é 100000)

Uso avulso:
  python d1.py backfill [--max-escritas 40000]   carrega o histórico dos CSV
  python d1.py saude                              mostra contagens e a cota do dia
"""

import argparse
import collections
import csv
import datetime as dt
import glob
import gzip
import hashlib
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request

BRASILIA = dt.timezone(dt.timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.abspath(__file__))
LIMITE_DIARIO = int(os.environ.get("D1_LIMITE_DIARIO") or "90000")
SAIU_DA_LISTA = 0

# Custo em linhas escritas (o D1 conta uma por tabela e uma por índice tocado).
CUSTO_VOO_NOVO = 3  # voos + 1 índice + precos
CUSTO_MUDANCA = 2   # update em voos + precos


# ---------------------------------------------------------------- identidade

def chave_voo(origem, destino, data_voo, companhia, h_saida, paradas):
    return f"{origem}|{destino}|{data_voo}|{companhia}|{h_saida}|{int(paradas)}"


def id_voo(chave):
    """Hash de 48 bits: cabe no INTEGER do SQLite e num Number do JavaScript."""
    return int(hashlib.blake2b(chave.encode("utf-8"), digest_size=6).hexdigest(), 16)


def epoch(lido_em):
    """'2026-10-02 14:55' (Brasília) -> segundos desde 1970 (UTC)."""
    return int(dt.datetime.strptime(lido_em, "%Y-%m-%d %H:%M").replace(tzinfo=BRASILIA).timestamp())


def partida_epoch(data_voo, h_saida):
    return int(dt.datetime.fromisoformat(f"{data_voo} {h_saida}").replace(tzinfo=BRASILIA).timestamp())


# -------------------------------------------------------------------- bancos

def lit(v):
    """Literal SQL. Os valores vêm do próprio coletor, mas escapa mesmo assim."""
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(int(v)) if float(v).is_integer() else repr(float(v))
    s = str(v).replace("\x00", "").replace("'", "''")
    return f"'{s}'"


class D1Rest:
    """Fala com o D1 pela API REST da Cloudflare."""

    def __init__(self, conta, banco, token):
        self.url = f"https://api.cloudflare.com/client/v4/accounts/{conta}/d1/database/{banco}/query"
        self.token = token

    def _post(self, sql):
        corpo = json.dumps({"sql": sql}).encode("utf-8")
        ultimo = None
        for tentativa in range(4):
            req = urllib.request.Request(
                self.url, data=corpo, method="POST",
                headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    dados = json.load(r)
                if not dados.get("success"):
                    raise RuntimeError(f"D1 recusou: {dados.get('errors')}")
                return dados["result"]
            except urllib.error.HTTPError as e:
                detalhe = e.read().decode("utf-8", "replace")[:300]
                ultimo = RuntimeError(f"D1 HTTP {e.code}: {detalhe}")
                if e.code < 500 and e.code != 429:
                    raise ultimo
            except (urllib.error.URLError, TimeoutError) as e:
                ultimo = e
            time.sleep(2 ** tentativa)
        raise ultimo

    def executar(self, sql):
        self._post(sql)

    def consultar(self, sql):
        resultado = self._post(sql)
        return resultado[-1].get("results", [])


class Local:
    """SQLite local com a mesma interface. Serve pra testar sem gastar cota."""

    def __init__(self, caminho=":memory:"):
        self.con = sqlite3.connect(caminho)
        self.con.row_factory = sqlite3.Row

    def executar(self, sql):
        self.con.executescript(sql)
        self.con.commit()

    def consultar(self, sql):
        return [dict(r) for r in self.con.execute(sql).fetchall()]


class Arquivo:
    """Em vez de executar, acumula o SQL num arquivo. Serve pra carregar com o wrangler
    (npx wrangler d1 execute radar --remote --file=historico.sql), sem precisar de token de API."""

    def __init__(self, caminho):
        self.f = open(caminho, "w", encoding="utf-8")

    def executar(self, sql):
        self.f.write(sql.rstrip() + "\n")

    def consultar(self, sql):
        raise NotImplementedError("Arquivo só grava")

    def fechar(self):
        self.f.close()


def banco_do_ambiente():
    conta = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    banco = os.environ.get("D1_DATABASE_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if conta and banco and token:
        return D1Rest(conta, banco, token)
    return None


# ----------------------------------------------------------------- diferenças

def agrupar(linhas):
    """Linhas do coletor -> {id: dict do voo}, ficando com o menor preço se houver duplicata."""
    voos = {}
    for r in linhas:
        lido_em, origem, destino, data_voo, companhia, h_saida, h_chegada, paradas, duracao, preco = r[:10]
        preco = int(preco)
        if preco <= 0:
            continue
        i = id_voo(chave_voo(origem, destino, data_voo, companhia, h_saida, paradas))
        atual = voos.get(i)
        if atual is None or preco < atual["preco"]:
            voos[i] = {"id": i, "origem": origem, "destino": destino, "data_voo": data_voo,
                       "h_saida": h_saida, "h_chegada": h_chegada, "companhia": companhia,
                       "paradas": int(paradas), "duracao_min": int(duracao) if str(duracao).strip() else None,
                       "preco": preco, "lido_em": lido_em}
    return voos


def diferencas(atuais, estado, buscas_ok, agora_ep):
    """Compara a rodada com o estado do banco.

    atuais     {id: voo} lido agora
    estado     {id: {ultimo_preco, origem, destino, data_voo, h_saida}} do banco, na janela da rodada
    buscas_ok  {(origem, destino, data_voo)} das buscas que voltaram com voos. Só nelas
               um voo ausente conta como "saiu da lista". Busca vazia pode ser bloqueio.
    """
    novos, mudou, sumiu = [], [], []
    for i, v in atuais.items():
        antes = estado.get(i)
        if antes is None:
            novos.append(v)
        elif int(antes["ultimo_preco"]) != v["preco"]:
            mudou.append(v)
    for i, e in estado.items():
        if i in atuais or int(e["ultimo_preco"]) == SAIU_DA_LISTA:
            continue
        if (e["origem"], e["destino"], e["data_voo"]) not in buscas_ok:
            continue
        if partida_epoch(e["data_voo"], e["h_saida"]) <= agora_ep + 600:
            continue  # decolou ou está decolando: sumir da lista é normal
        sumiu.append(i)
    return novos, mudou, sumiu


# ------------------------------------------------------------------ gravação

def _em_blocos(itens, tamanho):
    for k in range(0, len(itens), tamanho):
        yield itens[k:k + tamanho]


def sql_gravar(novos, mudou, sumiu, ts):
    """Gera os comandos SQL, em blocos que cabem no limite de 100 KB por comando."""
    cmds = []
    cols = "(id, origem, destino, data_voo, h_saida, h_chegada, companhia, paradas, duracao_min, ultimo_preco)"
    for bloco in _em_blocos(novos + mudou, 500):
        vals = ",".join(
            "(" + ",".join(lit(x) for x in (v["id"], v["origem"], v["destino"], v["data_voo"], v["h_saida"],
                                           v["h_chegada"], v["companhia"], v["paradas"], v["duracao_min"], v["preco"])) + ")"
            for v in bloco)
        cmds.append(f"INSERT INTO voos {cols} VALUES {vals} "
                    "ON CONFLICT(id) DO UPDATE SET ultimo_preco = excluded.ultimo_preco;")
    for bloco in _em_blocos(sumiu, 800):
        cmds.append(f"UPDATE voos SET ultimo_preco = 0 WHERE id IN ({','.join(str(i) for i in bloco)});")
    if novos:
        pares = sorted({(v["origem"], v["destino"]) for v in novos})
        cmds.append("INSERT OR IGNORE INTO trechos (origem, destino) VALUES "
                    + ",".join(f"({lit(o)},{lit(d)})" for o, d in pares) + ";")
    pontos = [(v["id"], ts, v["preco"]) for v in novos + mudou] + [(i, ts, SAIU_DA_LISTA) for i in sumiu]
    for bloco in _em_blocos(pontos, 2000):
        vals = ",".join(f"({a},{b},{c})" for a, b, c in bloco)
        cmds.append(f"INSERT OR IGNORE INTO precos (voo_id, lido_em, preco) VALUES {vals};")
    return cmds


def ajustar_ao_orcamento(novos, mudou, sumiu, orcamento):
    """Corta o que não cabe na cota do dia. O que ficar de fora volta como 'novo' ou 'mudou'
    na rodada seguinte, porque o estado vem do banco. Prioridade: saídas da lista, mudanças
    de preço, e por fim voos novos, dos que decolam primeiro pros mais distantes."""
    novos = sorted(novos, key=lambda v: (v["data_voo"], v["h_saida"]))
    usado, saida = 0, {}
    for nome, lista, c in (("sumiu", sumiu, CUSTO_MUDANCA), ("mudou", mudou, CUSTO_MUDANCA), ("novos", novos, CUSTO_VOO_NOVO)):
        n = max(0, min(len(lista), (orcamento - usado) // c))
        saida[nome] = lista[:n]
        usado += n * c
    return saida["novos"], saida["mudou"], saida["sumiu"]


def custo(novos, mudou, sumiu):
    return len(novos) * CUSTO_VOO_NOVO + (len(mudou) + len(sumiu)) * CUSTO_MUDANCA


def _chave_cota(agora_ep):
    return "escritas:" + dt.datetime.fromtimestamp(agora_ep, dt.timezone.utc).strftime("%Y-%m-%d")


def escritas_hoje(banco, agora_ep):
    r = banco.consultar(f"SELECT valor FROM meta WHERE chave = {lit(_chave_cota(agora_ep))};")
    return int(r[0]["valor"]) if r else 0


def sincronizar(linhas, dias, agora, banco=None, verbose=True):
    """Chamado pelo coletor depois de gravar o CSV. Devolve um resumo ou None se desligado."""
    banco = banco or banco_do_ambiente()
    if banco is None:
        return None
    agora_ep = int(agora.timestamp())
    atuais = agrupar(linhas)
    if not atuais:
        return {"novos": 0, "mudou": 0, "sumiu": 0, "escritas": 0}
    buscas_ok = {(v["origem"], v["destino"], v["data_voo"]) for v in atuais.values()}
    hoje = agora.date().isoformat()
    ate = (agora.date() + dt.timedelta(days=dias)).isoformat()
    rotas = {(o, d) for o, d, _ in buscas_ok}
    # Uma consulta por trecho, unidas. Com OR o SQLite usa só o prefixo "origem" do índice e lê
    # muito mais linhas (medido: 127 mil passos contra 204 por trecho); com UNION ALL cada parte
    # busca direto pelo índice (origem, destino, data_voo).
    # O D1 aceita no máximo 5 partes unidas por consulta, então vai em blocos de 5 trechos.
    estado = {}
    for bloco in _em_blocos(sorted(rotas), 5):
        por_trecho = " UNION ALL ".join(
            "SELECT id, origem, destino, data_voo, h_saida, ultimo_preco FROM voos "
            f"WHERE origem = {lit(o)} AND destino = {lit(d)} AND data_voo BETWEEN {lit(hoje)} AND {lit(ate)}"
            for o, d in bloco)
        estado.update({int(r["id"]): r for r in banco.consultar(por_trecho + ";")})
    novos, mudou, sumiu = diferencas(atuais, estado, buscas_ok, agora_ep)
    total = len(novos) + len(mudou) + len(sumiu)
    usado = escritas_hoje(banco, agora_ep)
    orcamento = LIMITE_DIARIO - usado - 2  # 2 escritas do controle
    novos, mudou, sumiu = ajustar_ao_orcamento(novos, mudou, sumiu, orcamento)
    adiado = total - (len(novos) + len(mudou) + len(sumiu))
    gasto = custo(novos, mudou, sumiu) + 2
    if adiado and verbose:
        print(f"D1: cota do dia quase no fim ({usado} de {LIMITE_DIARIO}); {adiado} alterações ficam pra próxima rodada.",
              file=sys.stderr)
    for cmd in sql_gravar(novos, mudou, sumiu, agora_ep):
        banco.executar(cmd)
    chave = lit(_chave_cota(agora_ep))
    banco.executar(f"INSERT INTO meta (chave, valor) VALUES ({chave}, '{usado + gasto}') "
                   "ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;"
                   f"INSERT INTO meta (chave, valor) VALUES ('ultima_sync', '{agora_ep}') "
                   "ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;")
    resumo = {"novos": len(novos), "mudou": len(mudou), "sumiu": len(sumiu), "escritas": gasto, "adiado": adiado}
    if verbose:
        print(f"D1: {len(novos)} voos novos, {len(mudou)} preços mudaram, {len(sumiu)} saíram da lista "
              f"(~{gasto} escritas; {usado + gasto} hoje).")
    return resumo


# ------------------------------------------------------------- histórico (CSV)

def reproduzir_historico(pasta=None):
    """Reexecuta todas as rodadas arquivadas em ordem e devolve só as mudanças.

    Devolve (voos, pontos): voos {id: dict com preco final} e pontos [(id, ts, preco)].
    Usa a mesma regra de diferença da sincronização ao vivo, sobre um estado em memória.
    """
    pasta = pasta or os.path.join(RAIZ, "dados", "leituras")
    arquivos = sorted(glob.glob(os.path.join(pasta, "*", "*.csv.gz")))
    voos, estado, pontos = {}, {}, []
    for arq in arquivos:
        with gzip.open(arq, "rt", encoding="utf-8") as f:
            linhas = [[r[c] for c in ("lido_em", "origem", "destino", "data_voo", "companhia", "h_saida",
                                      "h_chegada", "paradas", "duracao_min", "preco")]
                      for r in csv.DictReader(f)]
        if not linhas:
            continue
        ts = epoch(linhas[0][0])
        atuais = agrupar(linhas)
        buscas_ok = {(v["origem"], v["destino"], v["data_voo"]) for v in atuais.values()}
        datas = [v["data_voo"] for v in atuais.values()]
        dmin, dmax = min(datas), max(datas)
        no_escopo = {i: e for i, e in estado.items()
                     if dmin <= e["data_voo"] <= dmax and (e["origem"], e["destino"], e["data_voo"]) in buscas_ok}
        novos, mudou, sumiu = diferencas(atuais, no_escopo, buscas_ok, ts)
        for v in novos + mudou:
            voos[v["id"]] = v
            estado[v["id"]] = {"ultimo_preco": v["preco"], "origem": v["origem"], "destino": v["destino"],
                               "data_voo": v["data_voo"], "h_saida": v["h_saida"]}
            pontos.append((v["id"], ts, v["preco"]))
        for i in sumiu:
            estado[i]["ultimo_preco"] = SAIU_DA_LISTA
            voos[i]["preco"] = SAIU_DA_LISTA
            pontos.append((i, ts, SAIU_DA_LISTA))
    return voos, pontos


def backfill(banco, max_escritas=40000, so_relevantes=True, verbose=True):
    """Carrega o histórico dos CSV no banco, respeitando um teto de escritas.

    Sem esse teto, o histórico sozinho passaria da cota do dia. Roda de novo no dia
    seguinte pra continuar: tudo é INSERT OR IGNORE, então repetir não duplica.
    so_relevantes pula voos que só foram vistos uma vez e ainda não decolaram, porque
    a sincronização ao vivo já os pega com o mesmo preço.
    """
    voos, pontos = reproduzir_historico()
    por_voo = collections.defaultdict(list)
    for p in pontos:
        por_voo[p[0]].append(p)
    agora = int(time.time())
    escolhidos = []
    for i, ps in por_voo.items():
        v = voos[i]
        decolou = partida_epoch(v["data_voo"], v["h_saida"]) <= agora
        if so_relevantes and not decolou and len(ps) < 2:
            continue
        escolhidos.append(i)
    # Voos já decolados primeiro: são a base do modelo de queda.
    escolhidos.sort(key=lambda i: (partida_epoch(voos[i]["data_voo"], voos[i]["h_saida"]) > agora,
                                   voos[i]["data_voo"]))
    gasto, n_voos, n_pontos = 0, 0, 0
    lote_voos, lote_pontos = [], []
    cols = "(id, origem, destino, data_voo, h_saida, h_chegada, companhia, paradas, duracao_min, ultimo_preco)"

    def descarrega():
        nonlocal lote_voos, lote_pontos
        if lote_voos:
            vals = ",".join("(" + ",".join(lit(x) for x in (v["id"], v["origem"], v["destino"], v["data_voo"],
                            v["h_saida"], v["h_chegada"], v["companhia"], v["paradas"], v["duracao_min"],
                            v["preco"])) + ")" for v in lote_voos)
            banco.executar(f"INSERT OR IGNORE INTO voos {cols} VALUES {vals};")
        for bloco in _em_blocos(lote_pontos, 2000):
            vals = ",".join(f"({a},{b},{c})" for a, b, c in bloco)
            banco.executar(f"INSERT OR IGNORE INTO precos (voo_id, lido_em, preco) VALUES {vals};")
        lote_voos, lote_pontos = [], []

    for i in escolhidos:
        custo_voo = CUSTO_VOO_NOVO - 1 + len(por_voo[i])
        if gasto + custo_voo > max_escritas:
            break
        v = dict(voos[i])
        # estado final do voo = último ponto da série
        v["preco"] = por_voo[i][-1][2]
        lote_voos.append(v)
        lote_pontos.extend(por_voo[i])
        gasto += custo_voo
        n_voos += 1
        n_pontos += len(por_voo[i])
        if len(lote_voos) >= 400:
            descarrega()
    descarrega()
    if verbose:
        print(f"backfill: {n_voos} de {len(escolhidos)} voos, {n_pontos} pontos de preço, ~{gasto} escritas.")
        if n_voos < len(escolhidos):
            print("Parou no teto de escritas. Rode de novo amanhã pra continuar.")
    return {"voos": n_voos, "pontos": n_pontos, "escritas": gasto, "restantes": len(escolhidos) - n_voos}


def saude(banco):
    r = {}
    for nome, sql in (("voos", "SELECT COUNT(*) AS n FROM voos"),
                      ("precos", "SELECT COUNT(*) AS n FROM precos"),
                      ("referencia", "SELECT COUNT(*) AS n FROM referencia")):
        r[nome] = banco.consultar(sql + ";")[0]["n"]
    agora = int(time.time())
    r["escritas_hoje"] = escritas_hoje(banco, agora)
    ult = banco.consultar("SELECT valor FROM meta WHERE chave = 'ultima_sync';")
    r["ultima_sync"] = dt.datetime.fromtimestamp(int(ult[0]["valor"]), BRASILIA).strftime("%d/%m %H:%M") if ult else None
    return r


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("backfill")
    b.add_argument("--max-escritas", type=int, default=40000)
    b.add_argument("--tudo", action="store_true", help="inclui voos vistos uma vez só")
    b.add_argument("--saida", help="grava um arquivo .sql em vez de falar com a API")
    sub.add_parser("saude")
    args = ap.parse_args()
    if args.cmd == "backfill" and args.saida:
        arq = Arquivo(args.saida)
        backfill(arq, args.max_escritas, so_relevantes=not args.tudo)
        arq.fechar()
        return
    banco = banco_do_ambiente()
    if banco is None:
        sys.exit("Faltam CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID e CLOUDFLARE_API_TOKEN.")
    if args.cmd == "backfill":
        backfill(banco, args.max_escritas, so_relevantes=not args.tudo)
    else:
        print(json.dumps(saude(banco), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
