"""Detecta e registra passagens de última hora fora do normal.

Roda depois de cada leitura (workflow do coletor). Olha os voos que saem nas próximas 24 h e marca:
  queda   o preço atual está 50% ou mais abaixo da base do próprio voo (mediana das leituras até 3 h atrás)
          e a 70% ou menos da mediana da rota nas próximas 72 h;
  barato  o preço atual está a 45% ou menos da mediana da rota nas próximas 72 h, e até R$ 500.
Um alerta por rota e dia (o voo mais barato; os parecidos entram como contagem). Calibrado no histórico
de 30/set a 5/out de 2026: dá cerca de 8 por dia. Só vale se o preço se repete em 2 leituras seguidas (evita leitura isolada) e depois da limpeza de picos
(limpeza.py). Cada oportunidade vira um registro com início, menor preço, e como terminou (partiu,
sumiu da lista ou voltou ao normal). Isso mede o quanto elas duram e o quanto acertamos.

Grava relatorios/oportunidades.json.  Teste retroativo: python oportunidades.py --teste
"""

import collections
import csv
import datetime as dt
import glob
import gzip
import hashlib
import json
import os
import statistics as st
import sys

import limpeza

BRASILIA = dt.timezone(dt.timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(RAIZ, "dados", "leituras")
SAIDA = os.path.join(RAIZ, "relatorios", "oportunidades.json")

DIAS_HISTORICO = 4
HORIZONTE_H = 24
MIN_ANTES_H = 0.75
QUEDA_MIN = 0.50
QUEDA_FATOR_ROTA = 0.70
BARATO_FATOR = 0.45
BARATO_TETO = 500
MIN_LEITURAS_BASE = 6
MIN_VOOS_ROTA = 8
GUARDAR_DIAS = 7


def carregar(dias=DIAS_HISTORICO, ate=None):
    """{chave: {lido_em: menor preço}} dos últimos `dias` dias de leituras."""
    ate = ate or dt.datetime.now(BRASILIA).replace(tzinfo=None)
    de = (ate - dt.timedelta(days=dias)).date().isoformat()
    series = collections.defaultdict(dict)
    meta = {}
    for fn in sorted(glob.glob(os.path.join(PASTA, "*", "*.csv.gz"))):
        if fn.split(os.sep)[-2] < de:
            continue
        with gzip.open(fn, "rt", encoding="utf-8") as f:
            leitor = csv.reader(f)
            next(leitor, None)
            for r in leitor:
                try:
                    p = int(r[9])
                except ValueError:
                    continue
                if p <= 0:
                    continue
                t = dt.datetime.strptime(r[0], "%Y-%m-%d %H:%M")
                if t > ate:
                    continue
                k = (r[1], r[2], r[3], r[4], r[5], int(r[7]))
                d = series[k]
                if t not in d or p < d[t]:
                    d[t] = p
                    meta[k] = r[6]
    return series, meta


def partida(k):
    return dt.datetime.strptime(f"{k[2]} {k[4]}", "%Y-%m-%d %H:%M")


def detectar(series, meta, agora):
    """Lista de oportunidades abertas em `agora` (datetime ingênuo, hora de Brasília)."""
    atual = {}   # chave -> (preço atual estável, série limpa)
    for k, d in series.items():
        h = (partida(k) - agora).total_seconds() / 3600
        if not (MIN_ANTES_H <= h <= 72):
            continue
        s = limpeza.limpar(sorted((t, p) for t, p in d.items() if t <= agora))
        recentes = [p for t, p in s if t >= agora - dt.timedelta(minutes=90)]
        if len(recentes) < 2 or s[-1][0] < agora - dt.timedelta(minutes=45):
            continue  # não está sendo listado agora, ou só uma leitura
        atual[k] = (max(recentes[-2:]), s)

    por_rota = collections.defaultdict(list)
    for k, (p, _) in atual.items():
        por_rota[(k[0], k[1])].append(p)
    med_rota = {r: st.median(v) for r, v in por_rota.items() if len(v) >= MIN_VOOS_ROTA}

    achados = []
    for k, (p, s) in atual.items():
        h = (partida(k) - agora).total_seconds() / 3600
        if h > HORIZONTE_H:
            continue
        base_pts = [q for t, q in s if t <= agora - dt.timedelta(hours=3)]
        base = st.median(base_pts) if len(base_pts) >= MIN_LEITURAS_BASE else None
        tipo = None
        mr = med_rota.get((k[0], k[1]))
        if base and 1 - p / base >= QUEDA_MIN and (mr is None or p <= QUEDA_FATOR_ROTA * mr):
            tipo = "queda"
        elif (k[0], k[1]) in med_rota and p <= BARATO_FATOR * med_rota[(k[0], k[1])] and p <= BARATO_TETO:
            tipo = "barato"
        if tipo:
            achados.append({
                "origem": k[0], "destino": k[1], "data": k[2], "saida": k[4], "chegada": meta.get(k, ""),
                "companhia": k[3], "paradas": k[5], "tipo": tipo, "preco": p,
                "base": int(base) if base else None,
                "mediana_rota": int(med_rota[(k[0], k[1])]) if (k[0], k[1]) in med_rota else None,
                "horas_ate_saida": round(h, 1),
            })
    # um por rota e dia: fica o mais barato, os outros viram contagem
    melhores = {}
    for a in achados:
        g = (a["origem"], a["destino"], a["data"])
        if g not in melhores:
            melhores[g] = [a, 1]
        else:
            melhores[g][1] += 1
            if a["preco"] < melhores[g][0]["preco"]:
                melhores[g][0] = a
    return [{**a, "voos_parecidos": n - 1} for a, n in melhores.values()]


def identificador(a):
    return hashlib.sha1(f"{a['origem']}{a['destino']}{a['data']}".encode()).hexdigest()[:10]


def atualizar(registro, achados, series, agora):
    """Junta as oportunidades de agora ao registro e fecha as que acabaram."""
    ev = registro.setdefault("eventos", {})
    agora_s = agora.strftime("%Y-%m-%d %H:%M")
    vistos = set()
    for a in achados:
        i = identificador(a)
        vistos.add(i)
        e = ev.get(i)
        if e is None:
            ev[i] = {**a, "id": i, "detectado_em": agora_s, "preco_inicial": a["preco"], "menor_preco": a["preco"],
                     "ultima_vista": agora_s, "status": "aberta"}
        else:
            e.update(preco=a["preco"], ultima_vista=agora_s, status="aberta", horas_ate_saida=a["horas_ate_saida"],
                     saida=a["saida"], chegada=a["chegada"], companhia=a["companhia"], paradas=a["paradas"],
                     tipo=a["tipo"], base=a["base"], mediana_rota=a["mediana_rota"], voos_parecidos=a["voos_parecidos"])
            e["menor_preco"] = min(e["menor_preco"], a["preco"])
    for i, e in ev.items():
        if i in vistos or not e["status"] == "aberta":
            continue
        k = (e["origem"], e["destino"], e["data"], e["companhia"], e["saida"], e["paradas"])
        if partida(k) <= agora:
            e["status"] = "partiu"
        else:
            d = series.get(k, {})
            ult = max(d) if d else None
            if ult is None or ult < agora - dt.timedelta(minutes=60):
                e["status"] = "sumiu"      # saiu da lista: esgotou, cancelou, ou o Google parou de mostrar
            else:
                e["status"] = "voltou"     # continua listado, mas o preço voltou ao normal
                e["preco"] = d[ult]
    corte = (agora - dt.timedelta(days=GUARDAR_DIAS)).strftime("%Y-%m-%d")
    for i in [i for i, e in ev.items() if e["data"] < corte]:
        del ev[i]
    registro["atualizado_em"] = agora_s
    return registro


def resumo(registro):
    ev = list(registro.get("eventos", {}).values())
    cont = collections.Counter(e["status"] for e in ev)
    return {"total": len(ev), **cont}


def principal():
    agora = dt.datetime.now(BRASILIA).replace(tzinfo=None, second=0, microsecond=0)
    series, meta = carregar(ate=agora)
    try:
        with open(SAIDA, encoding="utf-8") as f:
            registro = json.load(f)
    except (OSError, ValueError):
        registro = {}
    achados = detectar(series, meta, agora)
    registro = atualizar(registro, achados, series, agora)
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(registro, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"oportunidades: {len(achados)} abertas agora; registro: {resumo(registro)}")


def teste():
    """Roda o detector em vários instantes do histórico, pra calibrar o ritmo de alertas."""
    series, meta = carregar(dias=30)
    todas = sorted({t for d in series.values() for t in d})
    ini, fim = todas[0] + dt.timedelta(days=3), todas[-1] - dt.timedelta(hours=1)
    pontos = []
    t = ini.replace(minute=0, second=0)
    while t <= fim:
        pontos.append(t); t += dt.timedelta(hours=3)
    novos = {}
    total = 0
    for t in pontos:
        for a in detectar(series, meta, t):
            total += 1
            novos.setdefault(identificador(a), (t, a))
    dias = (pontos[-1] - pontos[0]).total_seconds() / 86400
    print(f"{len(pontos)} instantes em {dias:.1f} dias; oportunidades distintas: {len(novos)} ({len(novos) / dias:.1f} por dia)")
    por_tipo = collections.Counter(a["tipo"] for _, a in novos.values())
    print("por tipo:", dict(por_tipo))
    print("exemplos:")
    for i, (t, a) in sorted(novos.items(), key=lambda x: x[1][1]["preco"])[:12]:
        print(f"  {t:%d/%m %H:%M} {a['origem']}->{a['destino']} {a['data']} {a['saida']} {a['companhia']}: R$ {a['preco']} "
              f"(base {a['base']}, rota {a['mediana_rota']}) [{a['tipo']}] sai em {a['horas_ate_saida']} h")


if __name__ == "__main__":
    teste() if "--teste" in sys.argv else principal()
