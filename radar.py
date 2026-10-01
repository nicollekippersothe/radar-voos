"""Radar de voos: procura passagens baratas no Google Voos e abre uma issue quando acha.

Configuração por variável de ambiente:
  ORIGEM      código IATA de origem (padrão SAO, que cobre GRU, CGH e VCP)
  DESTINO     código IATA de destino (padrão FLN)
  PRECO_MAX   preço máximo em reais (padrão 500)
  DIAS        quantos dias à frente olhar, contando hoje (padrão 14)
  GITHUB_TOKEN / GITHUB_REPOSITORY   quando presentes, o alerta vira issue no repo
"""

import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ORIGEM = os.environ.get("ORIGEM", "SAO")
DESTINO = os.environ.get("DESTINO", "FLN")
PRECO_MAX = int(os.environ.get("PRECO_MAX", "500"))
DIAS = int(os.environ.get("DIAS", "14"))
LABEL = f"alerta-{ORIGEM}-{DESTINO}".lower()

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
VOO_RX = re.compile(
    r'aria-label="A partir de (\d+) Reais brasileiros\. '
    r"(Voo direto da [\w ]+?|Voo da [\w ]+? com \d paradas?)\."
    r'[^"]*?Sai do aeroporto ([^"]*?) às (\d\d:\d\d)'
    r'[^"]*?chega no aeroporto ([^"]*?) às (\d\d:\d\d)'
    r'[^"]*?Duração total: ([^.]*)\.'
)


def buscar(data, origem=None, destino=None):
    origem = origem or ORIGEM
    destino = destino or DESTINO
    q = f"Flights to {destino} from {origem} on {data} one way"
    url = "https://www.google.com/travel/flights?" + urllib.parse.urlencode(
        {"q": q, "curr": "BRL", "hl": "pt-BR", "gl": "BR"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR"})
    with urllib.request.urlopen(req, timeout=60) as r:
        pagina = html.unescape(r.read().decode("utf-8", "replace"))
    voos = []
    for preco, tipo, saida, h_saida, chegada, h_chegada, duracao in set(VOO_RX.findall(pagina)):
        voos.append({
            "data": data,
            "preco": int(preco),
            "tipo": tipo,
            "saida": saida,
            "h_saida": h_saida,
            "chegada": chegada,
            "h_chegada": h_chegada,
            "duracao": duracao,
        })
    return voos


def chave(v):
    return f"{v['data']} {v['h_saida']} {v['tipo']} R$ {v['preco']}"


def linha(v):
    d = dt.date.fromisoformat(v["data"]).strftime("%d/%m")
    return (
        f"- **R$ {v['preco']}** · {d} · {v['h_saida']} → {v['h_chegada']} · {v['tipo']} "
        f"({v['duracao']}) · {v['saida']} → {v['chegada']} <!-- {chave(v)} -->"
    )


def github(metodo, caminho, corpo=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{os.environ['GITHUB_REPOSITORY']}{caminho}",
        data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={
            "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or "null")


def avisar(baratos):
    link = (
        "https://www.google.com/travel/flights?q="
        + urllib.parse.quote(f"Flights to {DESTINO} from {ORIGEM} one way")
        + "&curr=BRL&hl=pt-BR"
    )
    if not (os.environ.get("GITHUB_TOKEN") and os.environ.get("GITHUB_REPOSITORY")):
        print("\n".join(linha(v) for v in baratos))
        return

    abertas = github("GET", f"/issues?state=open&labels={LABEL}&per_page=1")
    if abertas:
        issue = abertas[0]
        ja_avisados = issue["body"] or ""
        for c in github("GET", f"/issues/{issue['number']}/comments?per_page=100"):
            ja_avisados += c["body"]
        novos = [v for v in baratos if chave(v) not in ja_avisados]
        if not novos:
            print("Nada novo desde o último alerta.")
            return
        github("POST", f"/issues/{issue['number']}/comments", {
            "body": "Novos voos abaixo do limite:\n\n" + "\n".join(linha(v) for v in novos)
            + f"\n\n[Ver no Google Voos]({link})",
        })
        print(f"Comentei {len(novos)} voo(s) novo(s) na issue #{issue['number']}.")
        return

    try:
        github("POST", "/labels", {"name": LABEL, "color": "0e8a16"})
    except urllib.error.HTTPError:
        pass  # o label já existe
    menor = baratos[0]
    nova = github("POST", "/issues", {
        "title": f"✈️ {ORIGEM} → {DESTINO} por R$ {menor['preco']}",
        "labels": [LABEL],
        "body": f"Voos por até R$ {PRECO_MAX} nos próximos {DIAS} dias:\n\n"
        + "\n".join(linha(v) for v in baratos)
        + f"\n\n[Ver no Google Voos]({link})\n\n"
        "Feche esta issue pra zerar o alerta. Enquanto ela estiver aberta, "
        "voos novos entram como comentário.\n\n"
        "Os preços vêm de uma consulta automática. Confira no site antes de comprar.",
    })
    print(f"Abri a issue #{nova['number']}.")


def main():
    hoje = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date()
    todos, falhas = [], 0
    for i in range(DIAS):
        data = (hoje + dt.timedelta(days=i)).isoformat()
        try:
            voos = buscar(data)
        except Exception as e:
            print(f"{data}: erro na busca ({e})", file=sys.stderr)
            voos = []
        if not voos:
            falhas += 1
        menor = min((v["preco"] for v in voos), default=None)
        print(f"{data}: {len(voos)} voos, menor R$ {menor}")
        todos += voos
        time.sleep(2)

    if falhas == DIAS:
        sys.exit("Nenhuma data retornou voos. O Google pode ter mudado a página ou bloqueado a consulta.")

    baratos = sorted((v for v in todos if v["preco"] <= PRECO_MAX), key=lambda v: (v["preco"], v["data"], v["h_saida"]))
    if baratos:
        avisar(baratos)
    else:
        print(f"Nenhum voo {ORIGEM} → {DESTINO} por até R$ {PRECO_MAX}.")


if __name__ == "__main__":
    main()
