// Passagens fora do normal, detectadas pelo oportunidades.py a cada leitura (relatorios/oportunidades.json).
import { baixar } from "./dados";

/** Oportunidades abertas e ainda a tempo de comprar. Vazio se o arquivo não existe. */
export async function oportunidades() {
  const bruto = await baixar("relatorios/oportunidades.json");
  if (!bruto) return { lista: [], atualizadoEm: "" };
  try {
    const j = JSON.parse(bruto.toString("utf-8"));
    const lista = Object.values(j.eventos || {})
      .filter((e) => e.status === "aberta" && e.horas_ate_saida > 0)
      .sort((a, b) => a.preco - b.preco);
    return { lista, atualizadoEm: j.atualizado_em || "" };
  } catch {
    return { lista: [], atualizadoEm: "" };
  }
}
