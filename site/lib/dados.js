import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";

const REPO = process.env.RADAR_REPO || "nicollekippersothe/radar-voos";
const RAMO = process.env.RADAR_RAMO || "main";
const BASE = `https://raw.githubusercontent.com/${REPO}/${RAMO}`;

export const CIDADES = {
  SAO: "São Paulo", FLN: "Florianópolis", RIO: "Rio de Janeiro", POA: "Porto Alegre",
  CWB: "Curitiba", BHZ: "Belo Horizonte", BSB: "Brasília", SSA: "Salvador", REC: "Recife",
  FOR: "Fortaleza", CGB: "Cuiabá", GYN: "Goiânia",
};

export function nome(codigo) {
  return CIDADES[codigo] || codigo;
}

/** Baixa um arquivo do repositório. Tenta o raw primeiro; se falhar, usa a API do GitHub. */
async function baixar(caminho) {
  // RADAR_LOCAL=../ lê os arquivos do disco, pra desenvolver sem depender do GitHub.
  if (process.env.RADAR_LOCAL) {
    try { return await readFile(path.join(process.env.RADAR_LOCAL, caminho)); } catch { return null; }
  }
  let r = await fetch(`${BASE}/${caminho}`, { next: { revalidate: 300 } });
  if (!r.ok) {
    r = await fetch(`https://api.github.com/repos/${REPO}/contents/${caminho}?ref=${encodeURIComponent(RAMO)}`, {
      // GITHUB_TOKEN (opcional) sobe o limite da API de 60 pra 5.000 pedidos por hora.
      headers: {
        Accept: "application/vnd.github.raw",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 300 },
    });
  }
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

async function baixarCsv(caminho) {
  const bruto = await baixar(caminho);
  if (!bruto) return null;
  const texto = gunzipSync(bruto).toString("utf-8");
  const linhas = texto.trim().split("\n");
  const cab = linhas.shift().split(",");
  return linhas.map((l) => {
    // os nomes de aeroporto têm vírgula? não, mas o csv pode ter aspas; tratamento simples
    const campos = [];
    let atual = "", aspas = false;
    for (const c of l) {
      if (c === '"') aspas = !aspas;
      else if (c === "," && !aspas) { campos.push(atual); atual = ""; }
      else atual += c;
    }
    campos.push(atual);
    const o = {};
    cab.forEach((k, i) => (o[k] = campos[i]));
    o.preco = Number(o.preco);
    o.paradas = Number(o.paradas);
    o.duracao_min = Number(o.duracao_min);
    return o;
  });
}

/** Junta a leitura curta (mais recente) com a de 30 dias; pra cada voo fica a leitura mais nova. */
export async function leituras() {
  const [curta, longa] = await Promise.all([baixarCsv("dados/ultimo.csv.gz"), baixarCsv("dados/ultimo-30d.csv.gz")]);
  // Os dois arquivos indisponíveis é falha de leitura, não ausência de dados.
  const erro = curta === null && longa === null;
  const porVoo = new Map();
  for (const v of [...(longa || []), ...(curta || [])]) {
    const k = `${v.origem}|${v.destino}|${v.data_voo}|${v.companhia}|${v.h_saida}|${v.paradas}`;
    const atual = porVoo.get(k);
    if (!atual || atual.lido_em < v.lido_em) porVoo.set(k, v);
  }
  const todas = [...porVoo.values()];
  const lidoEm = todas.reduce((m, v) => (v.lido_em > m ? v.lido_em : m), "");
  return { voos: todas, lidoEm, erro };
}

export async function relatorio() {
  const bruto = await baixar("relatorios/ultimo.md");
  return bruto ? bruto.toString("utf-8") : null;
}

export function diaCurto(iso) {
  const d = new Date(iso + "T12:00:00-03:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
}

export function reais(n) {
  return "R$ " + n.toLocaleString("pt-BR");
}

export function duracao(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m}min`;
}
