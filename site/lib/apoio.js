// Apoio da audiência: Pix, meta de custo e contador de oportunidades. Tudo vem de variáveis de ambiente,
// pra a chave e os valores não ficarem no repositório. Sem configuração, o bloco de apoio não aparece.
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { oportunidades } from "./oportunidades";
import { baixar } from "./dados";

export function configApoio() {
  const chave = (process.env.RADAR_PIX_CHAVE || "").trim();
  const nome = (process.env.RADAR_PIX_NOME || "Radar de Voos").trim();
  const cidade = (process.env.RADAR_PIX_CIDADE || "Sao Paulo").trim();
  const apoiaUrl = (process.env.RADAR_APOIA_URL || "").trim();
  const custo = Number(process.env.RADAR_CUSTO_MES || 0);
  const arrecadado = Number(process.env.RADAR_APOIO_MES || 0);
  return { chave, nome, cidade, apoiaUrl, custo, arrecadado, ativo: Boolean(chave || apoiaUrl) };
}

function campo(id, valor) {
  return id + String(valor.length).padStart(2, "0") + valor;
}

function semAcento(s, max) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-]/g, "").slice(0, max).toUpperCase();
}

function crc16(texto) {
  let crc = 0xffff;
  for (const c of Buffer.from(texto, "utf-8")) {
    crc ^= c << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Pix "copia e cola" estático, sem valor: a pessoa escolhe quanto doar. */
export function pixPayload({ chave, nome, cidade }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const corpo =
    campo("00", "01") + campo("01", "11") + campo("26", conta) + campo("52", "0000") + campo("53", "986") +
    campo("58", "BR") + campo("59", semAcento(nome, 25) || "RADAR") + campo("60", semAcento(cidade, 15) || "BRASIL") +
    campo("62", campo("05", "***")) + "6304";
  return corpo + crc16(corpo);
}

export async function pixQrSvg(payload) {
  return QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

/** Oportunidades dos últimos dias (o registro guarda 7) e quanto estavam abaixo do preço mediano da rota. */
export async function resumoOportunidades() {
  const bruto = await baixar("relatorios/oportunidades.json");
  if (!bruto) return null;
  try {
    const eventos = Object.values(JSON.parse(bruto.toString("utf-8")).eventos || {});
    const validos = eventos.filter((e) => e.mediana_rota > 0 && e.preco_inicial > 0 && e.preco_inicial < e.mediana_rota);
    const abaixo = validos.reduce((s, e) => s + (e.mediana_rota - e.preco_inicial), 0);
    return { total: validos.length, abaixo: Math.round(abaixo) };
  } catch {
    return null;
  }
}

/** Nomes do mural, de site/apoiadores.json (lista de textos). Vazio se não existe. */
export async function apoiadores() {
  try {
    const lista = JSON.parse(await readFile(path.join(process.cwd(), "apoiadores.json"), "utf-8"));
    return Array.isArray(lista) ? lista.filter((n) => typeof n === "string" && n.trim()).map((n) => n.trim()) : [];
  } catch {
    return [];
  }
}
