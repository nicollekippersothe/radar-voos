// Cliente da API do Worker (cloudflare/). Ligado quando RADAR_API está definida,
// por exemplo https://radar-voos.SEU-USUARIO.workers.dev
const BASE = (process.env.RADAR_API || "").replace(/\/$/, "");

export const temApi = () => BASE !== "";

/** GET na API. Devolve o JSON, ou null se a API não respondeu (a tela mostra o aviso de erro). */
export async function chamar(caminho, params = {}) {
  const qs = new URLSearchParams(params).toString();
  try {
    const r = await fetch(`${BASE}${caminho}${qs ? "?" + qs : ""}`, { next: { revalidate: 120 } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
