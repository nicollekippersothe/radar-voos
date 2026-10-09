"""Compara o menor preço por dia do Aviasales (API aberta do Travelpayouts) com o do Google Voos, saindo de uma origem.

Roda no Actions (fontes.yml), onde está o segredo TRAVELPAYOUTS_TOKEN. Não usa o banco D1.
Grava relatorios/fontes-<origem>.json e imprime o resumo.
  python comparar_fontes.py [ORIGEM]
"""

import collections
import csv
import datetime as dt
import glob
import gzip
import json
import os
import statistics as st
import sys

import referencia
from rotas import ROTAS

RAIZ = os.path.dirname(os.path.abspath(__file__))
BRASILIA = dt.timezone(dt.timedelta(hours=-3))


def google_por_dia(origem):
    """{(destino, data): menor preço} da leitura mais recente de cada janela (curta e de 30 dias)."""
    menor = {}
    arqs = [os.path.join(RAIZ, "dados", "ultimo.csv.gz"), os.path.join(RAIZ, "dados", "ultimo-30d.csv.gz")]
    for fn in arqs:
        if not os.path.exists(fn):
            continue
        with gzip.open(fn, "rt", encoding="utf-8") as f:
            leitor = csv.reader(f)
            next(leitor, None)
            for r in leitor:
                if r[1] != origem:
                    continue
                try:
                    p = int(r[9])
                except ValueError:
                    continue
                if p > 0:
                    k = (r[2], r[3])
                    if k not in menor or p < menor[k]:
                        menor[k] = p
    return menor


def principal(origem="FLN"):
    hoje = dt.datetime.now(BRASILIA).date()
    rotas = [r for r in ROTAS if r[0] == origem]
    ref = referencia.coletar(rotas, hoje)
    if not ref:
        sys.exit("Sem referência: falta o segredo TRAVELPAYOUTS_TOKEN ou a API não respondeu.")
    goog = google_por_dia(origem)
    por_rota = collections.defaultdict(list)
    for o, d, data, preco, cia, paradas, link in ref:
        por_rota[d].append((data, preco, goog.get((d, data))))
    saida = {"origem": origem, "gerado_em": dt.datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M"), "rotas": {}}
    todas = []
    for d, itens in sorted(por_rota.items()):
        com = [(data, a, g) for data, a, g in itens if g]
        rat = [a / g for _, a, g in com]
        linha = {
            "dias_aviasales": len(itens), "dias_google": len({k for k in goog if k[0] == d}), "dias_com_os_dois": len(com),
            "mediana_aviasales_sobre_google": round(st.median(rat), 2) if rat else None,
            "aviasales_mais_barato_3pct": sum(1 for x in rat if x < 0.97),
            "aviasales_mais_caro_15pct": sum(1 for x in rat if x > 1.15),
            "muito_abaixo_do_google_30pct": [{"data": data, "aviasales": a, "google": g} for data, a, g in com if a < 0.7 * g],
        }
        saida["rotas"][d] = linha
        todas += rat
    if todas:
        s = sorted(todas)
        saida["geral"] = {"pares": len(todas), "mediana": round(st.median(todas), 2),
                          "p25": round(s[len(s) // 4], 2), "p75": round(s[3 * len(s) // 4], 2),
                          "aviasales_mais_barato_3pct": round(100 * sum(1 for x in todas if x < 0.97) / len(todas)),
                          "aviasales_mais_caro_15pct": round(100 * sum(1 for x in todas if x > 1.15) / len(todas))}
    os.makedirs(os.path.join(RAIZ, "relatorios"), exist_ok=True)
    with open(os.path.join(RAIZ, "relatorios", f"fontes-{origem.lower()}.json"), "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
    for d, l in saida["rotas"].items():
        print(f"{origem}->{d}: aviasales {l['dias_aviasales']} dias, google {l['dias_google']}, ambos {l['dias_com_os_dois']}, "
              f"mediana aviasales/google {l['mediana_aviasales_sobre_google']}, mais barato (>3%) {l['aviasales_mais_barato_3pct']}, "
              f"mais caro (>15%) {l['aviasales_mais_caro_15pct']}")
    print("geral:", saida.get("geral"))


if __name__ == "__main__":
    principal(sys.argv[1] if len(sys.argv) > 1 else "FLN")
