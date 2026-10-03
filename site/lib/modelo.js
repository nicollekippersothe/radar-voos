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
  const faixaRs = e.de && e.pra ? ` Quando cai, vai de R$ ${e.de} pra R$ ${e.pra}.` : "";
  if (e.p >= 0.2) return { tom: "espera", curto: `cai ${Math.round(100 * e.p)}% das vezes`, longo: `Voos assim caíram ${Math.round(100 * e.p)}% das vezes nas 48 h antes de sair, uns ${Math.round(e.horas_antes_med || 0)} h antes.${faixaRs} Se não precisa decidir agora, dá pra esperar.`, e, abaixo };
  return { tom: "neutro", curto: `cai ${Math.round(100 * e.p)}% das vezes`, longo: `Voos assim raramente caem na última hora (${Math.round(100 * e.p)}% das vezes). Esperar costuma não compensar.`, e, abaixo };
}

/** Curva de preço por antecedência do trecho; cai na curva geral se o trecho tem pouca base. */
export function curvaRota(m, origem, destino) {
  const c = m?.curva;
  if (!c) return null;
  const r = c[`${origem}-${destino}`];
  if (r && r.faixas.length >= 2) return { ...r, fonte: "do trecho" };
  const g = c.geral;
  return g && g.faixas.length >= 2 ? { ...g, fonte: "de todas as rotas" } : null;
}

/**
 * Melhor data pra comprar um voo numa data.
 * Compara o preço esperado da faixa em que a pessoa está hoje com o da faixa mais barata.
 */
export function recomendar(curva, dataVoo, hoje, { diaIso, somaDias }) {
  if (!curva || !dataVoo) return null;
  const ate = Math.round((new Date(dataVoo + "T12:00:00Z") - new Date(hoje + "T12:00:00Z")) / 86400000);
  if (ate < 0) return null;
  const faixas = curva.faixas;
  const melhor = faixas.reduce((a, b) => (b.rel < a.rel ? b : a));
  const atual = faixas.find((f) => ate >= f.de && ate <= f.ate) || null;
  const maxDias = Math.max(...faixas.map((f) => f.ate));
  const janela = { de: somaDias(dataVoo, -melhor.ate), ate: somaDias(dataVoo, -melhor.de) };
  let acao;
  if (atual && atual.i === melhor.i) acao = "agora";
  else if (ate > melhor.ate) acao = "espera";
  else acao = "passou";
  // Se a antecedência pedida passa do que já foi observado, não dá pra comparar com "hoje".
  const semDados = !atual && ate > maxDias;
  const ref = atual || faixas.find((f) => f.de <= Math.min(ate, maxDias) && Math.min(ate, maxDias) <= f.ate) || null;
  const economiaPct = ref && ref.rel > melhor.rel ? (ref.rel - melhor.rel) / ref.rel : 0;
  const economiaRs = ref ? Math.round(curva.base * Math.max(0, ref.rel - melhor.rel)) : 0;
  return { ate, atual, melhor, janela, acao, semDados, economiaPct, economiaRs, maxDias };
}
