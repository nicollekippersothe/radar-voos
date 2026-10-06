"""Mede quanto do Brasil o Aviasales (Travelpayouts) cobre, par a par.

Roda no GitHub Actions (workflow "Cobertura Aviasales"), onde o token é um segredo.
Grava relatorios/cobertura-aviasales.json e imprime um resumo.

Uso local: TRAVELPAYOUTS_TOKEN=... python cobertura.py
"""

import collections
import concurrent.futures as cf
import datetime as dt
import json
import os
import statistics
import sys

import referencia as R

# Códigos de cidade (IATA). Capitais primeiro, depois as cidades médias com mais voo.
CIDADES = (
    "RBR MCZ MCP MAO SSA FOR BSB VIX GYN SLZ CGB CGR BHZ BEL JPA CWB REC THE RIO NAT POA PVH BVB FLN SAO AJU PMW "
    "IGU BPS IOS JDO PNZ LDB MGF UDI RAO JOI NVT IMP MAB STM CXJ VDC MOC XAP CKS"
).split()


def main():
    token = os.environ.get("TRAVELPAYOUTS_TOKEN")
    if not token:
        sys.exit("falta TRAVELPAYOUTS_TOKEN")
    hoje = dt.datetime.now(R.d1.BRASILIA).date()
    hoje_iso = hoje.isoformat()
    limite_iso = (hoje + dt.timedelta(days=30)).isoformat()
    meses = R.meses(hoje, 30)
    pares = [(o, d) for o in CIDADES for d in CIDADES if o != d]
    tarefas = [(o, d, m) for o, d in pares for m in meses]
    itens = collections.defaultdict(list)
    erros = collections.Counter()

    def uma(t):
        o, d, m = t
        try:
            return (o, d), R.pedir(o, d, m, token), None
        except Exception as e:
            return (o, d), [], str(e)[:60]

    with cf.ThreadPoolExecutor(6) as ex:
        for par, lista, erro in ex.map(uma, tarefas):
            itens[par] += lista
            if erro:
                erros[erro] += 1

    saida = []
    for (o, d) in pares:
        dias = R.menor_por_dia(itens[(o, d)], hoje_iso, limite_iso)
        if not dias:
            continue
        precos = [x["preco"] for x in dias.values()]
        saida.append({"origem": o, "destino": d, "dias": len(dias),
                      "menor": min(precos), "mediana": int(statistics.median(precos))})

    os.makedirs("relatorios", exist_ok=True)
    with open("relatorios/cobertura-aviasales.json", "w", encoding="utf-8") as f:
        json.dump({"gerado_em": dt.datetime.now(R.d1.BRASILIA).isoformat(timespec="minutes"),
                   "cidades": CIDADES, "pedidos": len(tarefas), "erros": dict(erros), "pares": saida},
                  f, ensure_ascii=False, indent=1)

    print(f"{len(CIDADES)} cidades, {len(pares)} pares, {len(tarefas)} pedidos, erros: {dict(erros)}")
    print(f"pares com ao menos 1 preço: {len(saida)} ({100 * len(saida) // len(pares)}%)")
    for minimo in (1, 5, 10, 20):
        print(f"  com preço em {minimo}+ dias dos próximos 30: {sum(1 for x in saida if x['dias'] >= minimo)}")
    por_origem = collections.Counter(x["origem"] for x in saida)
    print("destinos cobertos por origem (top 15):", por_origem.most_common(15))
    print("cidades sem nenhum par:", [c for c in CIDADES if c not in por_origem and not any(x['destino'] == c for x in saida)])


if __name__ == "__main__":
    main()
