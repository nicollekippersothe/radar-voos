"""Segunda fonte de preço: API de dados do Aviasales (Travelpayouts).

Não substitui o Google. O Google é lido ao vivo a cada 30 min e dá a série de preço de
cada voo. Esta fonte devolve o MENOR preço que usuários do Aviasales viram nas últimas
48 h pra cada dia e trecho, em cache. Serve pra três coisas:

  - conferir se o Google está coerente (se divergem muito, um dos dois está errado);
  - dar um segundo preço de referência na tela;
  - gerar o link de afiliado (a monetização que você quer em primeiro lugar).

Cobertura de voo doméstico no Brasil precisa ser conferida com o seu token: rode
`python referencia.py SAO FLN` e veja se volta alguma coisa.

Variáveis:
  TRAVELPAYOUTS_TOKEN    token da conta (grátis em travelpayouts.com). Sem ele, não faz nada.
  TRAVELPAYOUTS_MARKER   seu marker de afiliado, anexado aos links
  TRAVELPAYOUTS_URL      só pra testes
"""

import collections
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import d1

URL = os.environ.get("TRAVELPAYOUTS_URL", "https://api.travelpayouts.com/aviasales/v3/prices_for_dates")
SITE = "https://www.aviasales.com"
FONTE = "travelpayouts"
THREADS = 3

CIA = {"G3": "Gol", "AD": "Azul", "LA": "LATAM", "JJ": "LATAM", "2Z": "Passaredo", "TP": "TAP", "AR": "Aerolineas"}


def meses(hoje, dias):
    """['2026-10', '2026-11', ...] cobrindo de hoje até hoje+dias."""
    fim = hoje + dt.timedelta(days=dias)
    saida, d = [], hoje.replace(day=1)
    while d <= fim:
        saida.append(d.strftime("%Y-%m"))
        d = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    return saida


def pedir(origem, destino, mes, token):
    qs = urllib.parse.urlencode({
        "origin": origem, "destination": destino, "departure_at": mes,
        "one_way": "true", "unique": "false", "sorting": "price", "direct": "false",
        "currency": "brl", "limit": 1000, "page": 1, "token": token,
    })
    ultimo = None
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(f"{URL}?{qs}", headers={"Accept": "application/json"}), timeout=30) as r:
                dados = json.load(r)
            if not dados.get("success", True):
                raise RuntimeError(f"API recusou: {dados.get('error')}")
            return dados.get("data") or []
        except urllib.error.HTTPError as e:
            ultimo = RuntimeError(f"HTTP {e.code}")
            if e.code in (400, 401, 403, 404):
                raise ultimo  # erro de pedido ou de token: repetir não resolve
            if e.code == 429:
                time.sleep(5 * (tentativa + 1))  # limite de ritmo: espera mais antes de tentar de novo
                continue
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            ultimo = e
        time.sleep(2 ** tentativa)
    raise ultimo


def menor_por_dia(itens, hoje_iso, limite_iso, marker=""):
    """Reduz a lista de passagens ao menor preço de cada data."""
    melhor = {}
    for it in itens:
        try:
            data = it["departure_at"][:10]
            preco = int(round(float(it["price"])))
        except (KeyError, TypeError, ValueError):
            continue
        if not (hoje_iso <= data <= limite_iso) or preco <= 0:
            continue
        if data not in melhor or preco < melhor[data]["preco"]:
            link = it.get("link") or ""
            if link and marker:
                link += ("&" if "?" in link else "?") + "marker=" + urllib.parse.quote(marker)
            if link:
                link += ("&" if "?" in link else "?") + "currency=brl"  # sem isso a página abre em dólar
            melhor[data] = {
                "preco": preco,
                "companhia": CIA.get(it.get("airline"), it.get("airline")),
                "paradas": int(it.get("transfers") or 0),
                "link": (SITE + link) if link else None,
            }
    return melhor


def coletar(rotas, hoje, dias=30, token=None, marker=None):
    """Devolve linhas [(origem, destino, data_voo, preco, companhia, paradas, link)] com o menor preço por dia."""
    token = token or os.environ.get("TRAVELPAYOUTS_TOKEN")
    marker = marker if marker is not None else os.environ.get("TRAVELPAYOUTS_MARKER", "")
    if not token:
        return []
    hoje_iso = hoje.isoformat()
    limite_iso = (hoje + dt.timedelta(days=dias)).isoformat()
    tarefas = [(o, d, m) for o, d in rotas for m in meses(hoje, dias)]

    def uma(t):
        o, d, m = t
        try:
            return t, pedir(o, d, m, token), None
        except Exception as e:  # uma rota falhar não derruba as outras
            return t, [], e

    linhas, falhas = [], 0
    por_rota = collections.defaultdict(list)
    with cf.ThreadPoolExecutor(THREADS) as ex:
        for (o, d, _), itens, erro in ex.map(uma, tarefas):
            if erro:
                falhas += 1
                if falhas <= 3:
                    print(f"referência {o}-{d}: {erro}", file=sys.stderr)
            por_rota[(o, d)] += itens
    for (o, d), itens in por_rota.items():
        for data, x in sorted(menor_por_dia(itens, hoje_iso, limite_iso, marker).items()):
            linhas.append((o, d, data, x["preco"], x["companhia"], x["paradas"], x["link"]))
    print(f"referência ({FONTE}): {len(linhas)} preços de {len(rotas)} rotas, {falhas} pedidos falharam.")
    return linhas


def gravar_d1(linhas, agora, banco=None):
    """Substitui a referência de cada trecho e dia. São ~900 escritas por dia, pouco perto da cota."""
    banco = banco or d1.banco_do_ambiente()
    if banco is None or not linhas:
        return 0
    ts = int(agora.timestamp())
    # Lotes de 50: com o link de afiliado (~600 bytes) cada linha pesa; 300 estourava o limite de 100 KB por comando do D1.
    for k in range(0, len(linhas), 50):
        vals = ",".join(
            "(" + ",".join(d1.lit(x) for x in (FONTE, o, d, data, preco, cia, paradas, link, ts)) + ")"
            for o, d, data, preco, cia, paradas, link in linhas[k:k + 50])
        banco.executar("INSERT OR REPLACE INTO referencia "
                       f"(fonte, origem, destino, data_voo, preco, companhia, paradas, link, lido_em) VALUES {vals};")
    return len(linhas)


if __name__ == "__main__":
    # Teste rápido do token: python referencia.py SAO FLN
    if len(sys.argv) != 3:
        sys.exit("uso: python referencia.py ORIGEM DESTINO")
    hoje = dt.datetime.now(d1.BRASILIA).date()
    for linha in coletar([(sys.argv[1].upper(), sys.argv[2].upper())], hoje, 14)[:14]:
        print(linha)
