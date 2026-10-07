"""Avisa por Telegram e/ou e-mail as oportunidades novas (relatorios/oportunidades.json) das origens escolhidas.

Roda depois de oportunidades.py. Cada canal só liga se os segredos existirem; sem nenhum, só escreve no log.
  TELEGRAM_TOKEN    token do bot (BotFather)
  TELEGRAM_CHAT_ID  conversa que recebe (o seu id, depois de mandar /start pro bot)
  EMAIL_USUARIO     conta que envia (Gmail com senha de app, SMTP smtp.gmail.com:465)
  EMAIL_SENHA       senha de app, nunca a senha da conta
  EMAIL_DESTINO     quem recebe o e-mail (padrão: a própria conta)
  AVISAR_ORIGENS    códigos separados por vírgula (padrão: FLN)
Cada oportunidade é avisada uma vez; o registro guarda "avisado_em".
"""

import datetime as dt
import json
import os
import smtplib
import sys
import urllib.parse
import urllib.request
from email.message import EmailMessage

RAIZ = os.path.dirname(os.path.abspath(__file__))
ARQ = os.path.join(RAIZ, "relatorios", "oportunidades.json")
BRASILIA = dt.timezone(dt.timedelta(hours=-3))
SITE = "https://radar-voos-gilt.vercel.app"


def link_google(o, d, data):
    q = f"Flights to {d} from {o} on {data} one way"
    return f"https://www.google.com/travel/flights?q={urllib.parse.quote(q)}&curr=BRL&hl=pt-BR"


def linha(e):
    cab = f"{e['origem']} → {e['destino']}, {e['data']} às {e['saida']} ({e['companhia']}"
    cab += ", direto)" if e["paradas"] == 0 else f", {e['paradas']} parada(s))"
    normal = e.get("base") or e.get("mediana_rota")
    txt = f"R$ {e['preco']}" + (f" (normal por volta de R$ {normal})" if normal else "")
    return f"{cab}\n  {txt}, sai em {e['horas_ate_saida']} h\n  Conferir: {link_google(e['origem'], e['destino'], e['data'])}"


def texto(novos):
    corpo = "Passagens fora do normal agora:\n\n" + "\n\n".join(linha(e) for e in novos)
    return corpo + ("\n\nO preço foi lido em buscador público e pode ter mudado. Confira no link antes de decidir."
                    f"\nPainel: {SITE}\n")


def assunto(novos):
    m = novos[0]
    return f"Radar de Voos: {m['origem']} → {m['destino']} por R$ {m['preco']}" + (f" e mais {len(novos) - 1}" if len(novos) > 1 else "")


def enviar_email(usuario, senha, destino, novos):
    msg = EmailMessage()
    msg["Subject"] = assunto(novos)
    msg["From"] = usuario
    msg["To"] = destino
    msg.set_content(texto(novos))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(usuario, senha)
        s.send_message(msg)


def enviar_telegram(token, chat, novos):
    corpo = (assunto(novos) + "\n\n" + texto(novos))[:4000]
    dados = urllib.parse.urlencode({"chat_id": chat, "text": corpo, "disable_web_page_preview": "true"}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=dados)
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            raise RuntimeError(f"Telegram respondeu {r.status}")


def principal():
    usuario, senha = os.environ.get("EMAIL_USUARIO"), os.environ.get("EMAIL_SENHA")
    destino = os.environ.get("EMAIL_DESTINO") or usuario
    token, chat = os.environ.get("TELEGRAM_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    origens = {o.strip() for o in (os.environ.get("AVISAR_ORIGENS") or "FLN").split(",") if o.strip()}
    try:
        with open(ARQ, encoding="utf-8") as f:
            reg = json.load(f)
    except (OSError, ValueError):
        print("avisar: sem registro de oportunidades.")
        return
    novos = [e for e in reg.get("eventos", {}).values()
             if e.get("status") == "aberta" and e["origem"] in origens and not e.get("avisado_em")]
    if not novos:
        print("avisar: nada novo.")
        return
    canais = []
    if token and chat:
        canais.append(("Telegram", lambda: enviar_telegram(token, chat, novos)))
    if usuario and senha and destino:
        canais.append(("e-mail", lambda: enviar_email(usuario, senha, destino, novos)))
    if not canais:
        print(f"avisar: {len(novos)} oportunidade(s) nova(s), mas nenhum canal configurado. Não enviei.")
        return
    novos.sort(key=lambda e: e["preco"])
    enviados = []
    for nome, enviar in canais:
        try:
            enviar()
            enviados.append(nome)
        except Exception as e:
            print(f"avisar: {nome} falhou ({e})", file=sys.stderr)
    if not enviados:
        sys.exit(1)  # não marca como avisado: tenta de novo na próxima rodada
    agora = dt.datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M")
    for e in novos:
        e["avisado_em"] = agora
    with open(ARQ, "w", encoding="utf-8") as f:
        json.dump(reg, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"avisar: {len(novos)} oportunidade(s) enviada(s) por {' e '.join(enviados)}.")


if __name__ == "__main__":
    try:
        principal()
    except Exception as e:
        print(f"avisar: falhou ({e})", file=sys.stderr)
        sys.exit(1)
