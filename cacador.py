"""Caçador de tarifas fora do normal saindo de uma origem (piloto: Florianópolis).

Dois usos:
  python cacador.py relatorio [ORIGEM]   lê o histórico e mede as quedas isoladas: quando começam, quanto
                                          duram, quanto custavam e a que horas do dia aparecem.
  python cacador.py varrer [ORIGEM]      relê os trechos da origem a cada poucos minutos durante cerca de 25
                                          minutos e grava em dados/cacador/ORIGEM/AAAA-MM-DD.csv.gz, pra medir
                                          quedas curtas que a leitura de 30 em 30 minutos não pega.

Queda isolada: preço a 60% ou menos da mediana do mesmo voo nas 6 h em volta, sem que o resto da companhia
na origem tenha caído junto (queda em bloco é falha de leitura, ver oportunidades.py).
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
import time

RAIZ = os.path.dirname(os.path.abspath(__file__))
LEITURAS = os.path.join(RAIZ, "dados", "leituras")
CACADOR = os.path.join(RAIZ, "dados", "cacador")
SAIDA = os.path.join(RAIZ, "relatorios", "cacador-{}.json")
BRASILIA = dt.timezone(dt.timedelta(hours=-3))

QUEDA = 0.60            # preço <= 60% da mediana do voo
JANELA = dt.timedelta(hours=6)
LACUNA = dt.timedelta(minutes=45)   # leituras seguidas: intervalo de até 45 min
MIN_VIZINHAS = 8
BLOCO_PCT = 0.12        # fração da companhia em queda ao mesmo tempo = falha de leitura
MIN_GRUPO = 6


def arquivos(origem):
    fs = sorted(glob.glob(os.path.join(LEITURAS, "*", "*.csv.gz")))
    fs += sorted(glob.glob(os.path.join(CACADOR, origem, "*.csv.gz")))
    return fs


def carregar(origem):
    """{voo: {instante: menor preço}} para os voos que saem de `origem`."""
    series = collections.defaultdict(dict)
    for fn in arquivos(origem):
        with gzip.open(fn, "rt", encoding="utf-8") as f:
            leitor = csv.reader(f)
            next(leitor, None)
            for r in leitor:
                if len(r) < 10 or r[1] != origem:
                    continue
                try:
                    p = int(r[9])
                except ValueError:
                    continue
                if p <= 0:
                    continue
                k = (r[1], r[2], r[3], r[4], r[5], int(r[7]))
                t = dt.datetime.strptime(r[0], "%Y-%m-%d %H:%M")
                if t not in series[k] or p < series[k][t]:
                    series[k][t] = p
    return series


def partida(k):
    return dt.datetime.strptime(f"{k[2]} {k[4]}", "%Y-%m-%d %H:%M")


def eventos(series):
    """Quedas isoladas: lista de dicts, uma por sequência contínua de leituras baixas."""
    # fração de voos de cada companhia em queda por instante (queda em bloco = falha de leitura)
    em_queda = collections.defaultdict(lambda: [0, 0])
    mediana_voo = {}
    for k, d in series.items():
        ts = sorted(d)
        mediana_voo[k] = {}
        for t in ts:
            viz = [d[u] for u in ts if u != t and abs(u - t) <= JANELA]
            if len(viz) < MIN_VIZINHAS:
                continue
            m = st.median(viz)
            mediana_voo[k][t] = m
            g = em_queda[(k[3], t)]
            g[1] += 1
            g[0] += d[t] <= QUEDA * m
    achados = []
    for k, d in series.items():
        ts = sorted(mediana_voo[k])
        i = 0
        while i < len(ts):
            t = ts[i]
            q, n = em_queda[(k[3], t)]
            if d[t] <= QUEDA * mediana_voo[k][t] and not (n >= MIN_GRUPO and q / n >= BLOCO_PCT):
                j = i
                while (j + 1 < len(ts) and ts[j + 1] - ts[j] <= LACUNA and d[ts[j + 1]] <= QUEDA * mediana_voo[k][ts[j + 1]]):
                    j += 1
                precos = [d[u] for u in ts[i:j + 1]]
                normal = st.median([mediana_voo[k][u] for u in ts[i:j + 1]])
                achados.append({
                    "origem": k[0], "destino": k[1], "data": k[2], "saida": k[4], "companhia": k[3], "paradas": k[5],
                    "inicio": ts[i].strftime("%Y-%m-%d %H:%M"), "fim": ts[j].strftime("%Y-%m-%d %H:%M"),
                    "leituras": j - i + 1,
                    "duracao_min": int((ts[j] - ts[i]).total_seconds() / 60) + 30,
                    "menor_preco": min(precos), "preco_normal": int(normal),
                    "queda_pct": round(100 * (1 - min(precos) / normal)),
                    "horas_ate_partida": round((partida(k) - ts[i]).total_seconds() / 3600, 1),
                    "hora_do_inicio": ts[i].hour,
                })
                i = j + 1
            else:
                i += 1
    return achados


def relatorio(origem):
    series = carregar(origem)
    ev = eventos(series)
    voos = len(series)
    dur = sorted(e["duracao_min"] for e in ev)
    por_hora = collections.Counter(e["hora_do_inicio"] for e in ev)
    por_cia = collections.Counter(e["companhia"] for e in ev)
    por_destino = collections.Counter(e["destino"] for e in ev)
    longos = sorted([e for e in ev if e["duracao_min"] >= 90], key=lambda e: e["menor_preco"] / e["preco_normal"])
    out = {
        "origem": origem, "gerado_em": dt.datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M"),
        "voos_observados": voos, "eventos": len(ev),
        "duracao_min": ({"mediana": dur[len(dur) // 2], "p25": dur[len(dur) // 4], "p75": dur[3 * len(dur) // 4]} if dur else None),
        "uma_leitura_so_pct": round(100 * sum(1 for e in ev if e["leituras"] == 1) / len(ev)) if ev else 0,
        "inicio_por_hora": {f"{h:02d}h": por_hora.get(h, 0) for h in range(24)},
        "por_companhia": dict(por_cia), "por_destino": dict(por_destino),
        "melhores": longos[:20],
        "recentes": sorted(ev, key=lambda e: e["inicio"], reverse=True)[:20],
    }
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA.format(origem.lower()), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{origem}: {voos} voos observados, {len(ev)} quedas isoladas")
    if dur:
        print(f"duração: mediana {out['duracao_min']['mediana']} min, p25 {out['duracao_min']['p25']}, p75 {out['duracao_min']['p75']}; "
              f"{out['uma_leitura_so_pct']}% apareceram em uma leitura só")
    print("início por hora:", {h: n for h, n in out["inicio_por_hora"].items() if n})
    for e in longos[:10]:
        print(f"  {e['origem']}->{e['destino']} {e['data']} {e['saida']} {e['companhia']}: R$ {e['menor_preco']} (normal {e['preco_normal']}) "
              f"de {e['inicio']} a {e['fim']} = {e['duracao_min']} min, {e['horas_ate_partida']} h antes da partida")


def varrer(origem, minutos=25, intervalo=300, dias=3):
    sys.path.insert(0, RAIZ)
    import coletor
    from rotas import ROTAS
    destinos = sorted({d for o, d in ROTAS if o == origem})
    fim = time.time() + minutos * 60
    pasta = os.path.join(CACADOR, origem)
    os.makedirs(pasta, exist_ok=True)
    linhas = []
    n = 0
    while True:
        t0 = time.time()
        agora = dt.datetime.now(BRASILIA).replace(second=0, microsecond=0)
        lido_em = agora.strftime("%Y-%m-%d %H:%M")
        datas = [(agora.date() + dt.timedelta(days=i)).isoformat() for i in range(dias + 1)]
        for d in destinos:
            for data in datas:
                linhas += coletor.ler((origem, d, data, lido_em))
        n += 1
        print(f"{lido_em}: varredura {n}, {len(linhas)} linhas acumuladas")
        if time.time() + intervalo >= fim:
            break
        time.sleep(max(0, intervalo - (time.time() - t0)))
    if not linhas:
        sys.exit("nenhuma linha lida")
    caminho = os.path.join(pasta, agora.strftime("%Y-%m-%d") + ".csv.gz")
    existe = os.path.exists(caminho)
    antigas = ""
    if existe:
        with gzip.open(caminho, "rt", encoding="utf-8") as f:
            antigas = f.read()
    with gzip.open(caminho, "wt", encoding="utf-8") as f:
        if antigas:
            f.write(antigas)
        else:
            f.write(",".join(coletor.COLUNAS) + "\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerows(linhas)
    print(f"{len(linhas)} linhas em {os.path.relpath(caminho, RAIZ)}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "relatorio"
    org = sys.argv[2] if len(sys.argv) > 2 else "FLN"
    relatorio(org) if cmd == "relatorio" else varrer(org)
