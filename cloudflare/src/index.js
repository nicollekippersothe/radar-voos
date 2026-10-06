// Worker do Radar de Voos.
//
//  1. Relógio: a cada 30 min manda o GitHub rodar o coletor (o cron do GitHub atrasa; o da
//     Cloudflare não). A coleta continua no GitHub, que já funciona e não tem o limite de
//     10 ms de CPU e 50 chamadas por execução do plano gratuito do Worker.
//  2. Resultados calculados: uma vez por dia roda materializar.sql no D1.
//  3. API de leitura (só GET) pro site, em cima do banco D1.

import MATERIALIZAR from "../materializar.sql";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
};

// ------------------------------------------------------------------ agendador

async function dispararColeta(env, inputs = null) {
  if (!env.GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN não configurado: nada a disparar.");
    return false;
  }
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/coletor.yml/dispatches`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "radar-voos-agendador",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ ref: env.GITHUB_REF || "main", ...(inputs ? { inputs } : {}) }),
  });
  if (r.status !== 204) {
    console.error(`GitHub recusou o disparo: ${r.status} ${(await r.text()).slice(0, 200)}`);
    return false;
  }
  return true;
}

// Separa o arquivo .sql em comandos: tira os comentários de linha e corta em ponto e vírgula.
function comandos(sql) {
  return sql
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\n|$)/)
    .map((c) => c.trim())
    .filter(Boolean);
}

async function materializar(env) {
  // batch() roda tudo numa transação: ou atualiza os resultados inteiros, ou nenhum.
  await env.DB.batch(comandos(MATERIALIZAR).map((c) => env.DB.prepare(c)));
}

// ------------------------------------------------------------------------ API

const hojeBrasilia = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const somaDias = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// Cidades que o site aceita pedir (as mesmas de cobertura.py). Pedido fora da lista é recusado.
const CIDADES = new Set((
  "RBR MCZ MCP MAO SSA FOR BSB VIX GYN SLZ CGB CGR BHZ BEL JPA CWB REC THE RIO NAT POA PVH BVB FLN SAO AJU PMW " +
  "IGU BPS IOS JDO PNZ LDB MGF UDI RAO JOI NVT IMP MAB STM CXJ VDC MOC XAP CKS"
).split(" "));
const MAX_DINAMICAS = 150; // vigiadas + na fila. Protege o tempo do coletor e a cota do D1.

const cod = (v, padrao) => (/^[A-Za-z]{3}$/.test(v || "") ? v.toUpperCase() : padrao);
const inteiro = (v, padrao, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
};
const mediana = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quartis = (xs) => {
  if (xs.length < 4) return [null, null];
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
  return [q(0.25), q(0.75)];
};

const AGORA = "CAST(strftime('%s','now') AS INTEGER)";

// Horário da última coleta, no mesmo formato do CSV ("2026-10-02 14:55", Brasília).
async function ultimaColeta(env) {
  const r = await env.DB.prepare("SELECT valor FROM meta WHERE chave = 'ultima_sync'").first();
  if (!r) return null;
  return new Date(Number(r.valor) * 1000 - 3 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}
const PESO_PAI = 10; // mesma suavização do analise.py

const rotas = {
  // Voos mais baratos por destino, o que ainda não decolou: a tela "Pra onde dá pra ir?".
  async "/api/destinos"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "SAO");
    const valor = inteiro(url.searchParams.get("valor"), 500, 50, 20000);
    const dias = inteiro(url.searchParams.get("dias"), 3, 0, 30);
    const hoje = hojeBrasilia();
    // Junta com a lista de trechos pra buscar cada destino pelo índice (origem, destino, data).
    // CROSS JOIN fixa a ordem (trechos primeiro): com JOIN comum o SQLite varre todos os voos da
    // origem, umas 9 mil linhas, em vez de buscar por destino.
    // Em empate de preço, fica o voo com menos paradas e depois o que sai antes.
    const { results } = await env.DB.prepare(
      `SELECT destino, preco, id, data_voo, h_saida, h_chegada, companhia, paradas, duracao_min
         FROM (
           SELECT v.destino, v.ultimo_preco AS preco, v.id, v.data_voo, v.h_saida, v.h_chegada,
                  v.companhia, v.paradas, v.duracao_min,
                  ROW_NUMBER() OVER (PARTITION BY v.destino
                                     ORDER BY v.ultimo_preco, v.paradas, v.data_voo, v.h_saida) AS rn
             FROM trechos t
             CROSS JOIN v_voo v ON v.origem = t.origem AND v.destino = t.destino
            WHERE t.origem = ?1 AND v.data_voo BETWEEN ?3 AND ?4
              AND v.ultimo_preco > 0 AND v.ultimo_preco <= ?2 AND v.partida > ${AGORA}
         )
        WHERE rn = 1
        ORDER BY preco`
    ).bind(origem, valor, hoje, somaDias(hoje, dias)).all();
    return { origem, valor, dias, lido_em: await ultimaColeta(env), destinos: results };
  },

  // Menor preço por dia de um trecho: a tela "Qual dia é mais barato?".
  async "/api/dias"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "SAO");
    const destino = cod(url.searchParams.get("destino"), "FLN");
    const diretos = url.searchParams.get("diretos") !== "0";
    const { results } = await env.DB.prepare(
      `SELECT data_voo, MIN(ultimo_preco) AS preco, COUNT(*) AS voos
         FROM v_voo
        WHERE origem = ?1 AND destino = ?2 AND ultimo_preco > 0 AND data_voo >= ?3
          AND partida > ${AGORA} AND (?4 = 0 OR paradas = 0)
        GROUP BY data_voo ORDER BY data_voo`
    ).bind(origem, destino, hojeBrasilia(), diretos ? 1 : 0).all();
    return { origem, destino, lido_em: await ultimaColeta(env), dias: results };
  },

  // Voos de um dia, do mais barato pro mais caro.
  async "/api/voos"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "SAO");
    const destino = cod(url.searchParams.get("destino"), "FLN");
    const data = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("data") || "") ? url.searchParams.get("data") : hojeBrasilia();
    const { results } = await env.DB.prepare(
      `SELECT id, data_voo, h_saida, h_chegada, companhia, paradas, duracao_min, ultimo_preco AS preco
         FROM v_voo
        WHERE origem = ?1 AND destino = ?2 AND data_voo = ?3 AND ultimo_preco > 0 AND partida > ${AGORA}
        ORDER BY ultimo_preco, paradas, h_saida LIMIT 100`
    ).bind(origem, destino, data).all();
    return { origem, destino, data, lido_em: await ultimaColeta(env), voos: results };
  },

  // Trechos acompanhados, pros seletores do site.
  async "/api/trechos"(url, env) {
    const { results } = await env.DB.prepare("SELECT origem, destino FROM trechos ORDER BY origem, destino").all();
    return { trechos: results };
  },

  // Histórico de preço de um voo, pra desenhar o gráfico dele.
  async "/api/serie"(url, env) {
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id)) return { erro: "id inválido" };
    const voo = await env.DB.prepare("SELECT * FROM v_voo WHERE id = ?1").bind(id).first();
    const { results } = await env.DB.prepare(
      "SELECT lido_em AS t, preco FROM precos WHERE voo_id = ?1 ORDER BY lido_em"
    ).bind(id).all();
    return { voo, pontos: results };
  },

  // Chance de queda, de quanto pra quanto e curva por antecedência de um trecho.
  async "/api/trecho"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "SAO");
    const destino = cod(url.searchParams.get("destino"), "FLN");
    const cia = url.searchParams.get("cia") || "";
    const faixa = ["madrugada", "manha", "tarde", "noite"].includes(url.searchParams.get("faixa")) ? url.searchParams.get("faixa") : "";

    const geral = await env.DB.prepare("SELECT valor FROM meta WHERE chave = 'queda_geral'").first();
    const [gn, gk] = geral ? geral.valor.split(",").map(Number) : [0, 0];
    const pGeral = gn ? gk / gn : 0.3;

    const { results: linhas } = await env.DB.prepare(
      `SELECT companhia, faixa, preco_ref, min_48h, queda_48h, horas_antes_do_min
         FROM queda_voo WHERE origem = ?1 AND destino = ?2`
    ).bind(origem, destino).all();

    // Mesma hierarquia do analise.py: rota > rota+companhia > rota+companhia+horário,
    // cada nível suavizado pelo de cima.
    const nivel = (filtro, pPai, nome) => {
      const vs = linhas.filter(filtro);
      const caidos = vs.filter((v) => v.queda_48h >= 0.3);
      const n = vs.length, k = caidos.length;
      const [p25, p75] = quartis(caidos.map((v) => v.min_48h));
      return {
        nivel: nome, n, k,
        p: (k + PESO_PAI * pPai) / (n + PESO_PAI),
        queda_med: caidos.length ? mediana(caidos.map((v) => v.queda_48h)) : null,
        horas_antes_med: caidos.length ? mediana(caidos.map((v) => v.horas_antes_do_min)) : null,
        de: caidos.length ? Math.round(mediana(caidos.map((v) => v.preco_ref))) : null,
        pra: caidos.length ? Math.round(mediana(caidos.map((v) => v.min_48h))) : null,
        pra_p25: p25, pra_p75: p75,
      };
    };
    const rota = nivel(() => true, pGeral, "rota");
    const porCia = cia ? nivel((v) => v.companhia === cia, rota.p, "rota e companhia") : null;
    const fino = cia && faixa ? nivel((v) => v.companhia === cia && v.faixa === faixa, (porCia || rota).p, "rota, companhia e horário") : null;
    const escolhido = [fino, porCia, rota].find((x) => x && x.n >= 3) || { nivel: "todas as rotas", n: gn, k: gk, p: pGeral };

    const { results: curva } = await env.DB.prepare(
      "SELECT i, rotulo, de_dias AS de, ate_dias AS ate, n, rel, preco_medio_voo AS base FROM curva_trecho WHERE origem = ?1 AND destino = ?2 ORDER BY i"
    ).bind(origem, destino).all();
    let curvaUsada = { fonte: "do trecho", faixas: curva };
    if (curva.length < 2) {
      const { results: g } = await env.DB.prepare(
        "SELECT i, rotulo, de_dias AS de, ate_dias AS ate, n, rel, preco_medio_voo AS base FROM curva_trecho WHERE origem = '*' ORDER BY i"
      ).all();
      curvaUsada = { fonte: "de todas as rotas", faixas: g };
    }
    return { origem, destino, chance: escolhido, curva: curvaUsada, base: curvaUsada.faixas[0]?.base ?? null };
  },

  // Segunda fonte: o que outro buscador viu pra cada dia, ao lado do menor preço do Google.
  async "/api/fontes"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "SAO");
    const destino = cod(url.searchParams.get("destino"), "FLN");
    const { results } = await env.DB.prepare(
      `SELECT r.data_voo, r.fonte, r.preco AS referencia, r.companhia, r.link,
              (SELECT MIN(v.ultimo_preco) FROM voos v
                WHERE v.origem = r.origem AND v.destino = r.destino AND v.data_voo = r.data_voo AND v.ultimo_preco > 0) AS google
         FROM referencia r
        WHERE r.origem = ?1 AND r.destino = ?2 AND r.data_voo >= ?3
        ORDER BY r.data_voo, r.fonte`
    ).bind(origem, destino, hojeBrasilia()).all();
    return { origem, destino, datas: results };
  },

  // Pedido de trecho novo. O coletor lê a fila a cada rodada, passa a vigiar o trecho e tira da fila.
  // Responde: vigiado, na_fila, cheio ou invalido.
  async "/api/pedir"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "");
    const destino = cod(url.searchParams.get("destino"), "");
    if (!CIDADES.has(origem) || !CIDADES.has(destino) || origem === destino) return { status: "invalido" };
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS fila (origem TEXT NOT NULL, destino TEXT NOT NULL, pedido_em INTEGER NOT NULL, PRIMARY KEY (origem, destino))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS vigiadas (origem TEXT NOT NULL, destino TEXT NOT NULL, desde INTEGER NOT NULL, PRIMARY KEY (origem, destino))"),
    ]);
    const tem = await env.DB.prepare(
      `SELECT (SELECT 1 FROM voos WHERE origem = ?1 AND destino = ?2 LIMIT 1) AS voo,
              (SELECT 1 FROM vigiadas WHERE origem = ?1 AND destino = ?2) AS vig,
              (SELECT 1 FROM fila WHERE origem = ?1 AND destino = ?2) AS fila,
              (SELECT COUNT(*) FROM vigiadas) + (SELECT COUNT(*) FROM fila) AS total`
    ).bind(origem, destino).first();
    if (tem.voo || tem.vig) return { status: "vigiado" };
    if (tem.fila) return { status: "na_fila" };
    if (tem.total >= MAX_DINAMICAS) return { status: "cheio" };
    await env.DB.prepare("INSERT OR IGNORE INTO fila (origem, destino, pedido_em) VALUES (?1, ?2, ?3)")
      .bind(origem, destino, Math.floor(Date.now() / 1000)).run();
    return { status: "na_fila" };
  },

  // Atualização de um trecho, pedida pela página quando alguém abre. Dispara uma leitura só desse trecho
  // (os dois sentidos). Limites: dado com menos de 8 min não precisa, 1 pedido por trecho a cada 10 min,
  // no máximo 5 trechos por 10 min no total. Responde: disparado, fresco, recente, ocupado, sem_token ou invalido.
  async "/api/atualizar"(url, env) {
    const origem = cod(url.searchParams.get("origem"), "");
    const destino = cod(url.searchParams.get("destino"), "");
    if (!CIDADES.has(origem) || !CIDADES.has(destino) || origem === destino) return { status: "invalido" };
    const agora = Math.floor(Date.now() / 1000);
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS atualizacoes (origem TEXT NOT NULL, destino TEXT NOT NULL, em INTEGER NOT NULL, PRIMARY KEY (origem, destino))").run();
    const sync = await env.DB.prepare("SELECT valor FROM meta WHERE chave = 'ultima_sync'").first();
    if (sync && agora - Number(sync.valor) < 8 * 60) return { status: "fresco", idade_s: agora - Number(sync.valor) };
    const est = await env.DB.prepare(
      `SELECT (SELECT em FROM atualizacoes WHERE origem = ?1 AND destino = ?2) AS ultimo,
              (SELECT COUNT(*) FROM atualizacoes WHERE em > ?3) AS ultimos`
    ).bind(origem, destino, agora - 600).first();
    if (est.ultimo && agora - est.ultimo < 600) return { status: "recente", espere_s: 600 - (agora - est.ultimo) };
    if (est.ultimos >= 5) return { status: "ocupado" };
    const ok = await dispararColeta(env, { rotas: `${origem}-${destino},${destino}-${origem}` });
    if (!ok) return { status: "sem_token" };
    await env.DB.prepare("INSERT INTO atualizacoes (origem, destino, em) VALUES (?1, ?2, ?3) ON CONFLICT(origem, destino) DO UPDATE SET em = excluded.em")
      .bind(origem, destino, agora).run();
    return { status: "disparado" };
  },

  // Versão publicada. Serve pra confirmar que o deploy automático (Workers Builds) está funcionando.
  async "/api/versao"() {
    return { versao: "2026-10-06-d", rotas: Object.keys(rotas).length };
  },

  // Saúde: o que tem no banco e quando foi a última coleta.
  async "/api/saude"(url, env) {
    const q = (sql) => env.DB.prepare(sql).first();
    const [voos, precos, queda, ref, sync, mat] = await Promise.all([
      q("SELECT COUNT(*) AS n FROM voos"),
      q("SELECT COUNT(*) AS n FROM precos"),
      q("SELECT COUNT(*) AS n FROM queda_voo"),
      q("SELECT COUNT(*) AS n FROM referencia"),
      q("SELECT valor FROM meta WHERE chave = 'ultima_sync'"),
      q("SELECT valor FROM meta WHERE chave = 'queda_ate'"),
    ]);
    const iso = (s) => (s ? new Date(Number(s) * 1000).toISOString() : null);
    return {
      voos: voos.n, precos: precos.n, voos_com_queda_medida: queda.n, referencias: ref.n,
      ultima_coleta: iso(sync?.valor), ultima_materializacao: iso(mat?.valor),
    };
  },
};

export default {
  async scheduled(controller, env, ctx) {
    if (controller.cron === "10 9 * * *") ctx.waitUntil(materializar(env));
    else ctx.waitUntil(dispararColeta(env));
  },

  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...JSON_HEADERS, "access-control-allow-methods": "GET" } });
    }
    const url = new URL(request.url);
    const rota = rotas[url.pathname];
    if (request.method !== "GET" || !rota) {
      return new Response(JSON.stringify({ erro: "não encontrado", rotas: Object.keys(rotas) }), { status: 404, headers: JSON_HEADERS });
    }
    try {
      const corpo = await rota(url, env);
      return new Response(JSON.stringify(corpo), {
        headers: { ...JSON_HEADERS, "cache-control": ["/api/pedir", "/api/atualizar"].includes(url.pathname) ? "no-store" : "public, max-age=120, s-maxage=300" },
      });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ erro: "falha ao consultar o banco" }), { status: 500, headers: JSON_HEADERS });
    }
  },
};
