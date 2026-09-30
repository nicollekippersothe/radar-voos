"""Analisa as leituras do coletor e procura o padrão das quedas de última hora.

Lê todos os arquivos em dados/leituras/, monta a série de preço de cada voo
(origem, destino, data, companhia, hora de saída) e, pros voos que já
decolaram, mede quanto o preço caiu nas últimas 48 horas em relação ao que
custava antes. Gera relatorios/AAAA-MM-DD.md e relatorios/voos.csv.

Definições:
  preco_ref   menor preço lido entre 7 dias e 48 h antes da partida (ou a
              primeira leitura, se o voo só foi visto dentro das 48 h)
  min_48h     menor preço lido nas últimas 48 h antes da partida
  min_24h     idem, últimas 24 h
  queda_48h   1 - min_48h / preco_ref  (quanto caiu, em %)
  queda_24h   1 - min_24h / preco_ref

Uma "queda de última hora" é queda_48h >= 30%. Isso é o que o produto vai
alertar. O relatório conta quantas vezes aconteceu, onde e quando.
"""

import collections
import csv
import datetime as dt
import glob
import gzip
import os
import statistics
import sys

BRASILIA = dt.timezone(dt.timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.abspath(__file__))
PASTA_LEITURAS = os.path.join(RAIZ, "dados", "leituras")
PASTA_RELATORIOS = os.path.join(RAIZ, "relatorios")
LIMIARES = (0.30, 0.50, 0.70)


def carregar():
    """Devolve {chave_do_voo: [(lido_em, preco), ...]} ordenado por horário de leitura."""
    series = collections.defaultdict(list)
    arquivos = sorted(glob.glob(os.path.join(PASTA_LEITURAS, "*", "*.csv.gz")))
    for arq in arquivos:
        with gzip.open(arq, "rt", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                chave = (r["origem"], r["destino"], r["data_voo"], r["companhia"], r["h_saida"], int(r["paradas"]))
                lido = dt.datetime.strptime(r["lido_em"], "%Y-%m-%d %H:%M").replace(tzinfo=BRASILIA)
                series[chave].append((lido, int(r["preco"])))
    for s in series.values():
        s.sort()
    return series, len(arquivos)


def resumir(chave, serie, agora):
    origem, destino, data_voo, companhia, h_saida, paradas = chave
    partida = dt.datetime.fromisoformat(f"{data_voo} {h_saida}").replace(tzinfo=BRASILIA)
    if partida > agora:
        return None  # ainda não decolou, não dá pra fechar a conta
    antes_48 = [(t, p) for t, p in serie if partida - dt.timedelta(days=7) <= t < partida - dt.timedelta(hours=48)]
    ult_48 = [(t, p) for t, p in serie if t >= partida - dt.timedelta(hours=48)]
    ult_24 = [(t, p) for t, p in serie if t >= partida - dt.timedelta(hours=24)]
    if not ult_48:
        return None
    if antes_48:
        preco_ref = min(p for _, p in antes_48)
    else:
        preco_ref = ult_48[0][1]
    min_48 = min(ult_48, key=lambda x: x[1])
    min_24 = min(ult_24, key=lambda x: x[1]) if ult_24 else (None, None)
    queda_48 = 1 - min_48[1] / preco_ref
    # quanto tempo o preço ficou no mínimo (ou até 10% acima dele) dentro das 48 h
    teto = min_48[1] * 1.10
    duracao_min = sum(
        1 for t, p in ult_48 if p <= teto
    )  # em número de leituras; vira minutos no relatório com o intervalo médio
    return {
        "origem": origem, "destino": destino, "data_voo": data_voo, "companhia": companhia,
        "h_saida": h_saida, "paradas": paradas, "leituras": len(serie),
        "primeira_leitura": serie[0][0].strftime("%Y-%m-%d %H:%M"),
        "preco_ref": preco_ref, "min_48h": min_48[1],
        "min_48h_em": min_48[0].strftime("%Y-%m-%d %H:%M"),
        "horas_antes_do_min": round((partida - min_48[0]).total_seconds() / 3600, 1),
        "min_24h": min_24[1] if min_24[1] is not None else "",
        "ultimo_preco": ult_48[-1][1],
        "queda_48h": round(queda_48, 3),
        "queda_24h": round(1 - min_24[1] / preco_ref, 3) if min_24[1] is not None else "",
        "leituras_no_minimo": duracao_min,
    }


def pct(n, total):
    return f"{100 * n / total:.1f}%" if total else "n/d"


def faixa_hora(h):
    h = int(h[:2])
    if h < 6:
        return "madrugada (0-6h)"
    if h < 12:
        return "manhã (6-12h)"
    if h < 18:
        return "tarde (12-18h)"
    return "noite (18-24h)"


def relatorio(voos, n_arquivos, series, agora):
    L = []
    L.append(f"# Relatório do coletor · {agora.strftime('%d/%m/%Y %H:%M')}\n")
    L.append(f"- Arquivos lidos: {n_arquivos}")
    L.append(f"- Voos com série de preço: {len(series)}")
    L.append(f"- Voos já decolados com leitura nas últimas 48 h (base da análise): {len(voos)}\n")

    if not voos:
        L.append("Ainda não há voo decolado com leituras suficientes. Volte amanhã.\n")
        return "\n".join(L)

    L.append("## Quedas de última hora (últimas 48 h antes da partida)\n")
    L.append("| Limiar | Voos que caíram | % do total |")
    L.append("|---|---|---|")
    for lim in LIMIARES:
        n = sum(1 for v in voos if v["queda_48h"] >= lim)
        L.append(f"| ≥ {int(lim * 100)}% | {n} | {pct(n, len(voos))} |")
    quedas = [v["queda_48h"] for v in voos]
    L.append(f"\nMediana da variação nas 48 h: {statistics.median(quedas) * 100:+.1f}% "
             f"(negativo = subiu). Média: {statistics.mean(quedas) * 100:+.1f}%.\n")

    def tabela(titulo, agrupador, rotulo):
        grupos = collections.defaultdict(list)
        for v in voos:
            grupos[agrupador(v)].append(v)
        L.append(f"## {titulo}\n")
        L.append(f"| {rotulo} | Voos | ≥30% | ≥50% | Maior queda | Mediana |")
        L.append("|---|---|---|---|---|---|")
        for g, vs in sorted(grupos.items(), key=lambda kv: -sum(1 for v in kv[1] if v["queda_48h"] >= 0.3) / len(kv[1])):
            n30 = sum(1 for v in vs if v["queda_48h"] >= 0.3)
            n50 = sum(1 for v in vs if v["queda_48h"] >= 0.5)
            maior = max(v["queda_48h"] for v in vs)
            med = statistics.median(v["queda_48h"] for v in vs)
            L.append(f"| {g} | {len(vs)} | {n30} ({pct(n30, len(vs))}) | {n50} ({pct(n50, len(vs))}) | {maior * 100:.0f}% | {med * 100:+.0f}% |")
        L.append("")

    tabela("Por rota", lambda v: f"{v['origem']} → {v['destino']}", "Rota")
    tabela("Por companhia", lambda v: v["companhia"], "Companhia")
    tabela("Por horário de saída do voo", lambda v: faixa_hora(v["h_saida"]), "Faixa")
    tabela("Por dia da semana do voo", lambda v: dt.date.fromisoformat(v["data_voo"]).strftime("%a"), "Dia")
    tabela("Direto ou com parada", lambda v: "direto" if v["paradas"] == 0 else "com parada", "Tipo")

    # Quando a queda acontece: horas antes da partida e hora do dia da leitura
    caidos = [v for v in voos if v["queda_48h"] >= 0.3]
    if caidos:
        L.append("## Quando o mínimo aparece (só voos que caíram ≥ 30%)\n")
        L.append("| Horas antes da partida | Voos |")
        L.append("|---|---|")
        faixas = [(0, 3), (3, 6), (6, 12), (12, 24), (24, 48)]
        for a, b in faixas:
            n = sum(1 for v in caidos if a <= v["horas_antes_do_min"] < b)
            L.append(f"| {a} a {b} h | {n} |")
        L.append("")
        L.append("| Hora do dia em que o mínimo foi lido | Voos |")
        L.append("|---|---|")
        por_hora = collections.Counter(int(v["min_48h_em"][11:13]) for v in caidos)
        for h in sorted(por_hora):
            L.append(f"| {h:02d}h | {por_hora[h]} |")
        L.append("")
        L.append(f"Leituras seguidas no mínimo (ou até 10% acima): mediana de "
                 f"{statistics.median(v['leituras_no_minimo'] for v in caidos):.0f} leituras. "
                 f"Com leitura a cada 30 min, é o tempo que o usuário tem pra reagir.\n")

    L.append("## As 20 maiores quedas\n")
    L.append("| Rota | Voo | Cia | Preço antes | Mínimo | Queda | Quando (h antes) |")
    L.append("|---|---|---|---|---|---|---|")
    for v in sorted(voos, key=lambda v: -v["queda_48h"])[:20]:
        d = dt.date.fromisoformat(v["data_voo"]).strftime("%d/%m")
        L.append(f"| {v['origem']}→{v['destino']} | {d} {v['h_saida']} | {v['companhia']} | R$ {v['preco_ref']} | R$ {v['min_48h']} | {v['queda_48h'] * 100:.0f}% | {v['min_48h_em'][5:]} ({v['horas_antes_do_min']}) |")
    L.append("")

    L.append("## Menor preço absoluto visto por rota (qualquer antecedência)\n")
    L.append("| Rota | Menor preço | Voo | Lido em |")
    L.append("|---|---|---|---|")
    menor = {}
    for chave, serie in series.items():
        rota = f"{chave[0]} → {chave[1]}"
        t, p = min(serie, key=lambda x: x[1])
        if rota not in menor or p < menor[rota][0]:
            menor[rota] = (p, f"{chave[2][5:]} {chave[4]} {chave[3]}", t.strftime("%d/%m %H:%M"))
    for rota, (p, voo, t) in sorted(menor.items(), key=lambda kv: kv[1][0]):
        L.append(f"| {rota} | R$ {p} | {voo} | {t} |")
    L.append("")
    L.append("Leitura: se a linha '≥ 50%' ficar abaixo de 1% depois de 4 semanas, a queda de última hora é rara demais "
             "pra sustentar o produto sozinha. Acima de 5% em alguma rota, tem produto.")
    return "\n".join(L)


def main():
    agora = dt.datetime.now(BRASILIA)
    series, n_arquivos = carregar()
    if not series:
        sys.exit("Nenhuma leitura em dados/leituras/.")
    voos = [r for r in (resumir(k, s, agora) for k, s in series.items()) if r]
    os.makedirs(PASTA_RELATORIOS, exist_ok=True)
    if voos:
        with open(os.path.join(PASTA_RELATORIOS, "voos.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(voos[0].keys()))
            w.writeheader()
            w.writerows(sorted(voos, key=lambda v: -v["queda_48h"]))
    texto = relatorio(voos, n_arquivos, series, agora)
    caminho = os.path.join(PASTA_RELATORIOS, agora.strftime("%Y-%m-%d") + ".md")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(texto)
    with open(os.path.join(PASTA_RELATORIOS, "ultimo.md"), "w", encoding="utf-8") as f:
        f.write(texto)
    print(texto)


if __name__ == "__main__":
    main()
