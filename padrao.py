"""Padrão de preço nas últimas horas antes do voo: quando e quanto o preço cai de verdade.

Lê todo o histórico em dados/leituras, monta a série de cada voo já partido e mede:
  - ruído: leituras que saltam pra mais de 2x a mediana do próprio voo;
  - queda sustentada: o preço estável nas últimas 6 h contra a base (mediana de 48 a 12 h antes);
  - achados: voos cujo preço final ficou a 60% da base ou menos, e em até R$ 600.
Grava relatorios/padrao-ultima-hora.json e imprime um resumo. Roda no Actions (padrao.yml) ou local.
"""

import collections
import csv
import datetime as dt
import glob
import gzip
import json
import os
import statistics as st

import limpeza

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados", "leituras")


def carregar():
    series = collections.defaultdict(list)
    for fn in sorted(glob.glob(os.path.join(PASTA, "*", "*.csv.gz"))):
        for r in list(csv.reader(gzip.open(fn, "rt")))[1:]:
            try:
                p = int(r[9])
            except ValueError:
                continue
            if p > 0:
                series[(r[1], r[2], r[3], r[4], r[5], r[7])].append((dt.datetime.strptime(r[0], "%Y-%m-%d %H:%M"), p))
    limpa = {}
    for k, v in series.items():
        menor = {}
        for t, p in v:  # um preço por instante (o menor, como o D1)
            if t not in menor or p < menor[t]:
                menor[t] = p
        limpa[k] = limpeza.limpar(sorted(menor.items()))
    return limpa


def saida(k):
    return dt.datetime.strptime(k[2] + " " + k[4], "%Y-%m-%d %H:%M")


def horas(k, t):
    return (saida(k) - t).total_seconds() / 3600


def main():
    series = carregar()
    todas = [t for v in series.values() for t, _ in v]
    corte = max(todas) - dt.timedelta(hours=2)
    fech = {k: v for k, v in series.items() if saida(k) < corte and len(v) >= 8}

    leituras = picos = voos_pico = 0
    for v in fech.values():
        med = st.median(p for _, p in v)
        n = sum(1 for _, p in v if p > 2 * med)
        leituras += len(v); picos += n; voos_pico += n > 0

    aval = []
    for k, v in fech.items():
        base = [p for t, p in v if 12 < horas(k, t) <= 48]
        fim = [(t, p) for t, p in v if 0 <= horas(k, t) <= 6]
        if len(base) < 4 or len(fim) < 3:
            continue
        est = None
        for i in range(len(fim) - 1):  # nível estável: repetido em duas leituras seguidas (±2%)
            if abs(fim[i][1] - fim[i + 1][1]) <= 0.02 * fim[i][1]:
                est = min(est, fim[i][1]) if est else fim[i][1]
        if est is not None:
            aval.append((k, st.median(base), est))

    def taxa(sel, lim):
        return round(100 * sum(1 for _, b, e in sel if e / b <= lim) / max(len(sel), 1), 1)

    por_cia = {}
    for c in {k[3] for k, _, _ in aval}:
        sel = [x for x in aval if x[0][3] == c]
        if len(sel) >= 30:
            por_cia[c] = {"voos": len(sel), "queda20_pct": taxa(sel, 0.8)}
    por_faixa = {}
    for h in range(0, 24, 3):
        sel = [x for x in aval if int(x[0][4][:2]) // 3 * 3 == h]
        if sel:
            por_faixa[f"{h:02d}-{h + 2:02d}h"] = {"voos": len(sel), "queda20_pct": taxa(sel, 0.8)}

    achados = sorted(((k, b, e) for k, b, e in aval if e <= 0.6 * b and e <= 600), key=lambda x: x[2] / x[1])
    final = []
    for k, v in fech.items():
        ult = [p for t, p in v if 0 <= horas(k, t) <= 8]
        if len(ult) >= 3:
            final.append((k, min(ult)))
    fln = [(k, p) for k, p in final if k[0] == "FLN"]

    rel = {
        "voos_partidos": len(fech),
        "ruido": {"leituras_acima_2x_mediana_pct": round(100 * picos / leituras, 1), "voos_afetados_pct": round(100 * voos_pico / len(fech), 1)},
        "voos_avaliados": len(aval),
        "queda_sustentada": {"20pct": taxa(aval, 0.8), "30pct": taxa(aval, 0.7)},
        "alta_sustentada_30pct": round(100 * sum(1 for _, b, e in aval if e / b >= 1.3) / max(len(aval), 1), 1),
        "por_companhia": por_cia,
        "por_faixa_de_saida": por_faixa,
        "achados": len(achados),
        "achados_pct": round(100 * len(achados) / max(len(aval), 1), 1),
        "preco_final_8h": {"mediana": int(st.median(p for _, p in final)) if final else None,
                           "ate_500_pct": round(100 * sum(1 for _, p in final if p <= 500) / max(len(final), 1), 1)},
        "floripa": {"voos": len(fln), "menor_final": min((p for _, p in fln), default=None)},
        "melhores_achados": [{"trecho": f"{k[0]}-{k[1]}", "data": k[2], "saida": k[4], "cia": k[3], "base": int(b), "final": e} for k, b, e in achados[:15]],
        "periodo": [min(todas).isoformat(timespec="minutes"), max(todas).isoformat(timespec="minutes")],
    }
    os.makedirs("relatorios", exist_ok=True)
    with open("relatorios/padrao-ultima-hora.json", "w", encoding="utf-8") as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in rel.items() if k != "melhores_achados"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
