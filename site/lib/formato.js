// Formatação de texto seguindo as regras tipográficas: espaço fixo em "R$ 576",
// meia-risca em intervalos, abreviações sem ponto final.

const NBSP = " ";
const MEIA_RISCA = "–";

export function reais(n) {
  return "R$" + NBSP + Number(n).toLocaleString("pt-BR");
}

export function intervalo(a, b) {
  return `${a}${MEIA_RISCA}${b}`;
}

export function duracao(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m}${NBSP}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function paradas(n) {
  if (n === 0) return "direto";
  return n === 1 ? `1${NBSP}parada` : `${n}${NBSP}paradas`;
}

export function diaCurto(iso) {
  const d = new Date(iso + "T12:00:00-03:00");
  const s = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return s.replace(".", "").replace(",", "");
}

export function diaLongo(iso) {
  const d = new Date(iso + "T12:00:00-03:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function horaLeitura(lidoEm) {
  if (!lidoEm) return "";
  return `às ${lidoEm.slice(11)} de ${diaCurto(lidoEm.slice(0, 10))}`;
}

export function hojeIso() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0, 10);
}

export function somaDias(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function linkGoogle(origem, destino, data) {
  const q = `Flights to ${destino} from ${origem} on ${data} one way`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&curr=BRL&hl=pt-BR`;
}
