"""Coletor: lê o preço de cada voo das rotas vigiadas e guarda tudo em dados/leituras/.

É a fase 0 do produto (ver docs/06-roteiro.md). Não alerta ninguém. Só acumula
histórico pra depois descobrir com que frequência, em que rota e em que horário
o preço cai perto da partida.

Cada execução gera um arquivo dados/leituras/AAAA-MM-DD/HHMM.csv.gz com uma
linha por voo lido. O analise.py junta tudo.

Variáveis de ambiente:
  JANELA_CURTA   dias à frente lidos em toda execução (padrão 2, ou seja hoje, amanhã e depois)
  JANELA_LONGA   dias à frente lidos a cada 20 h, ou quando FORCAR_LONGA=1 (padrão 30)
  ROTAS          lista "SAO-FLN,FLN-SAO" pra sobrescrever rotas.py (útil pra testar)
  THREADS        buscas em paralelo (padrão 6)
"""

import concurrent.futures as cf
import csv
import datetime as dt
import gzip
import io
import os
import sys
import time

import radar
from rotas import ROTAS

BRASILIA = dt.timezone(dt.timedelta(hours=-3))
JANELA_CURTA = int(os.environ.get("JANELA_CURTA", "2"))
JANELA_LONGA = int(os.environ.get("JANELA_LONGA", "30"))
THREADS = int(os.environ.get("THREADS", "6"))
PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados", "leituras")

COLUNAS = [
    "lido_em", "origem", "destino", "data_voo", "companhia", "h_saida", "h_chegada",
    "paradas", "duracao_min", "preco", "aeroporto_saida", "aeroporto_chegada",
]


def companhia_e_paradas(tipo):
    # "Voo direto da Gol" ou "Voo da LATAM com 1 parada"
    if tipo.startswith("Voo direto da "):
        return tipo[len("Voo direto da "):], 0
    nome, _, resto = tipo[len("Voo da "):].partition(" com ")
    return nome, int(resto.split()[0])


def duracao_em_min(texto):
    # "1 h 10 min", "7 h 35 min", "1 h", "55 min"
    h = m = 0
    partes = texto.split()
    for i, p in enumerate(partes):
        if p == "h":
            h = int(partes[i - 1])
        elif p == "min":
            m = int(partes[i - 1])
    return h * 60 + m


def ler(par):
    origem, destino, data, lido_em = par
    for tentativa in range(3):
        try:
            voos = radar.buscar(data, origem, destino)
            break
        except Exception as e:
            if tentativa == 2:
                print(f"{origem}-{destino} {data}: falhou ({e})", file=sys.stderr)
                return []
            time.sleep(5 * (tentativa + 1))
    linhas = []
    for v in voos:
        companhia, paradas = companhia_e_paradas(v["tipo"])
        linhas.append([
            lido_em, origem, destino, data, companhia, v["h_saida"], v["h_chegada"],
            paradas, duracao_em_min(v["duracao"]), v["preco"], v["saida"], v["chegada"],
        ])
    return linhas


def ultima_leitura_longa():
    """Horário da última leitura de 30 dias, lido do próprio arquivo. None se nunca rodou."""
    caminho = os.path.join(PASTA, "..", "ultimo-30d.csv.gz")
    try:
        with gzip.open(caminho, "rt", encoding="utf-8") as f:
            next(f)
            return dt.datetime.strptime(next(f).split(",")[0], "%Y-%m-%d %H:%M").replace(tzinfo=BRASILIA)
    except Exception:
        return None


def main():
    agora = dt.datetime.now(BRASILIA).replace(second=0, microsecond=0)
    hoje = agora.date()
    lido_em = agora.strftime("%Y-%m-%d %H:%M")

    # A janela longa roda quando a última leitura longa tem mais de 20 h (ou nunca rodou),
    # em vez de depender de o cron cair entre 6h00 e 6h29, que o GitHub não garante.
    ultima = ultima_leitura_longa()
    longa = os.environ.get("FORCAR_LONGA") == "1" or ultima is None or agora - ultima > dt.timedelta(hours=20)
    dias = JANELA_LONGA if longa else JANELA_CURTA
    datas = [(hoje + dt.timedelta(days=i)).isoformat() for i in range(dias + 1)]

    rotas = os.environ.get("ROTAS")
    rotas = [tuple(r.split("-")) for r in rotas.split(",")] if rotas else ROTAS
    pares = [(o, d, data, lido_em) for o, d in rotas for data in datas]

    print(f"{lido_em}: {len(rotas)} rotas × {len(datas)} datas = {len(pares)} buscas")
    linhas, vazias = [], 0
    with cf.ThreadPoolExecutor(THREADS) as ex:
        for resultado in ex.map(ler, pares):
            if not resultado:
                vazias += 1
            linhas += resultado

    if not linhas:
        sys.exit("Nenhuma busca retornou voos. O Google pode ter mudado a página ou bloqueado a consulta.")
    if vazias > len(pares) // 2:
        print(f"Atenção: {vazias} de {len(pares)} buscas voltaram vazias.", file=sys.stderr)

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(COLUNAS)
    w.writerows(linhas)
    pasta = os.path.join(PASTA, hoje.isoformat())
    os.makedirs(pasta, exist_ok=True)
    caminho = os.path.join(pasta, agora.strftime("%H%M") + ".csv.gz")
    with gzip.open(caminho, "wt", encoding="utf-8") as f:
        f.write(buf.getvalue())
    # Cópia com nome fixo pro site ler sem precisar listar a pasta.
    nome_fixo = "ultimo-30d.csv.gz" if dias == JANELA_LONGA else "ultimo.csv.gz"
    with gzip.open(os.path.join(PASTA, "..", nome_fixo), "wt", encoding="utf-8") as f:
        f.write(buf.getvalue())
    print(f"{len(linhas)} voos gravados em {os.path.relpath(caminho)} ({vazias} buscas vazias)")


if __name__ == "__main__":
    main()
