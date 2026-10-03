// Lê relatorios/modelo.json (gerado pelo analise.py) e responde, pra um voo,
// qual a chance de cair nas 48 h antes de decolar, quanto e quando.
import { baixar } from "./dados";

export async function modelo() {
  const bruto = await baixar("relatorios/modelo.json");
  if (!bruto) return null;
  try { return JSON.parse(bruto.toString("utf-8")); } catch { return null; }
}

export function faixaCurta(h) {
  const n = Number(String(h).slice(0, 2));
  return n < 6 ? "madrugada" : n < 12 ? "manha" : n < 18 ? "tarde" : "noite";
}

export const FAIXA_NOME = { madrugada: "madrugada", manha: "manhã", tarde: "tarde", noite: "noite" };

/** Desce do geral até o nó mais fino que tem dados e devolve a estimativa. */
export function estimar(m, { origem, destino, companhia, h_saida }) {
  if (!m) return null;
  const rota = `${origem}-${destino}`;
  const chaves = [
    [`${rota}|${companhia}|${faixaCurta(h_saida)}`, "rota, companhia e horário"],
    [`${rota}|${companhia}`, "rota e companhia"],
    [rota, "rota"],
  ];
  for (const [k, nivel] of chaves) {
    const no = m.nos[k];
    if (no && no.n >= 3) return { ...no, nivel, chave: k };
  }
  return { ...m.geral, nivel: "todas as rotas", chave: "geral" };
}

/** Estado do voo em relação ao que já custou: referência antes das 48 h e mínimo visto. */
export function estado(m, v) {
  if (!m) return null;
  return m.abertos[[v.origem, v.destino, v.data_voo, v.companhia, v.h_saida, v.paradas].join("|")] || null;
}

export function tipico(m, origem, destino) {
  return m?.rotas?.[`${origem}-${destino}`] || null;
}

/** Veredito em uma frase, pra lista e pra tela do voo. */
export function veredito(m, v) {
  const e = estimar(m, v);
  const t = tipico(m, v.origem, v.destino);
  const s = estado(m, v);
  if (!e) return null;
  const abaixo = t?.tipico ? 1 - v.preco / t.tipico : null;
  const jaCaiu = s && s.ref && v.preco <= s.ref * (1 - (m.limiar || 0.3));
  if (jaCaiu) return { tom: "bom", curto: "já caiu", longo: `Já caiu ${Math.round(100 * (1 - v.preco / s.ref))}% em relação ao que custava antes. É o momento.`, e, abaixo };
  if (abaixo !== null && abaixo >= 0.15) return { tom: "bom", curto: `${Math.round(100 * abaixo)}% abaixo do comum`, longo: `Está ${Math.round(100 * abaixo)}% abaixo do que esse trecho costuma custar (R$ ${t.tipico}). Compra.`, e, abaixo };
  if (e.p >= 0.2) return { tom: "espera", curto: `cai ${Math.round(100 * e.p)}% das vezes`, longo: `Voos assim caíram ${Math.round(100 * e.p)}% das vezes nas 48 h antes de sair, em média ${Math.round(100 * (e.queda_med || 0))}%, uns ${Math.round(e.horas_antes_med || 0)} h antes. Se não precisa decidir agora, dá pra esperar.`, e, abaixo };
  return { tom: "neutro", curto: `cai ${Math.round(100 * e.p)}% das vezes`, longo: `Voos assim raramente caem na última hora (${Math.round(100 * e.p)}% das vezes). Esperar costuma não compensar.`, e, abaixo };
}
