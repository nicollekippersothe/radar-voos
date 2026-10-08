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

/** "lido 13:30" se foi hoje, "lido 07/10 13:30" se não. Vazio sem horário. */
export function lidoCurto(lidoEm) {
  if (!lidoEm || lidoEm.length < 16) return "";
  const hora = lidoEm.slice(11, 16);
  return lidoEm.slice(0, 10) === hojeIso() ? `lido ${hora}` : `lido ${lidoEm.slice(8, 10)}/${lidoEm.slice(5, 7)} ${hora}`;
}

/** Horário de leitura de um voo. Voos depois de 3 dias só entram na leitura diária, então o horário geral não vale pra eles. */
export function lidoVoo(v, lidoEm) {
  if (v.lido_em) return lidoCurto(v.lido_em);
  if (v.data_voo && v.data_voo > somaDias(hojeIso(), 3)) return "lido 1 vez por dia";
  return lidoCurto(lidoEm);
}
