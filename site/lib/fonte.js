// De onde vêm os preços que as telas mostram.
//  - Com RADAR_API: do banco D1, pela API do Worker. Rápido, sem baixar CSV de 27 mil linhas.
//  - Sem RADAR_API: dos CSV do repositório, como antes. Serve de reserva e pra desenvolver.
import { leituras } from "./dados";
import { chamar, temApi } from "./api";
import { hojeIso, somaDias } from "./formato";

/** Pra tela "Pra onde dá pra ir?": o voo mais barato de cada destino. */
export async function dadosHome({ origem, valor, dias }) {
  if (temApi()) {
    const [r, t] = await Promise.all([
      chamar("/api/destinos", { origem, valor, dias }),
      chamar("/api/trechos"),
    ]);
    const origens = [...new Set((t?.trechos || []).map((x) => x.origem))].sort();
    return {
      lista: (r?.destinos || []).map((d) => ({ ...d, origem })),
      origens,
      lidoEm: r?.lido_em || "",
      erro: r === null || t === null,
      semLeituras: t !== null && origens.length === 0,
    };
  }
  const { voos, lidoEm, erro } = await leituras();
  const hoje = hojeIso();
  const limite = somaDias(hoje, dias);
  const porDestino = new Map();
  for (const v of voos) {
    if (v.origem !== origem || v.preco > valor || v.data_voo < hoje || v.data_voo > limite) continue;
    const atual = porDestino.get(v.destino);
    if (!atual || v.preco < atual.preco || (v.preco === atual.preco && v.paradas < atual.paradas)) porDestino.set(v.destino, v);
  }
  return {
    lista: [...porDestino.values()].sort((a, b) => a.preco - b.preco),
    origens: [...new Set(voos.map((v) => v.origem))].sort(),
    lidoEm, erro, semLeituras: voos.length === 0,
  };
}

/** Pra tela "Qual dia é mais barato?": menor preço por dia e os voos do dia escolhido. */
export async function dadosDia({ origem, destino, soDiretos, dia }) {
  if (temApi()) {
    const [r, t] = await Promise.all([
      chamar("/api/dias", { origem, destino, diretos: soDiretos ? 1 : 0 }),
      chamar("/api/trechos"),
    ]);
    const trechos = t?.trechos || [];
    const dias = (r?.dias || []).map((d) => ({ ...d, origem, destino }));
    const menor = dias.length ? Math.min(...dias.map((d) => d.preco)) : 0;
    const diaSel = dia || (dias.find((d) => d.preco === menor) || {}).data_voo;
    const v = diaSel ? await chamar("/api/voos", { origem, destino, data: diaSel }) : null;
    return {
      dias,
      diaSel,
      todosDoDia: (v?.voos || []).filter((x) => !soDiretos || x.paradas === 0).map((x) => ({ ...x, origem, destino })),
      origens: [...new Set(trechos.map((x) => x.origem))].sort(),
      destinos: [...new Set(trechos.filter((x) => x.origem === origem).map((x) => x.destino))].sort(),
      lidoEm: r?.lido_em || "",
      erro: r === null || t === null,
    };
  }
  const { voos, lidoEm, erro } = await leituras();
  const hoje = hojeIso();
  const doTrecho = voos.filter((v) => v.origem === origem && v.destino === destino && v.data_voo >= hoje && (!soDiretos || v.paradas === 0));
  const porDia = new Map();
  for (const v of doTrecho) {
    const atual = porDia.get(v.data_voo);
    if (!atual || v.preco < atual.preco) porDia.set(v.data_voo, v);
  }
  const dias = [...porDia.values()].sort((a, b) => a.data_voo.localeCompare(b.data_voo));
  const menor = dias.length ? Math.min(...dias.map((d) => d.preco)) : 0;
  const diaSel = dia || (dias.find((d) => d.preco === menor) || {}).data_voo;
  return {
    dias, diaSel,
    todosDoDia: doTrecho.filter((v) => v.data_voo === diaSel).sort((a, b) => a.preco - b.preco),
    origens: [...new Set(voos.map((v) => v.origem))].sort(),
    destinos: [...new Set(voos.filter((v) => v.origem === origem).map((v) => v.destino))].sort(),
    lidoEm, erro,
  };
}

/** Segunda fonte (Aviasales): menor preço visto nas últimas 48 h por dia, num trecho. Vazio sem API. */
export async function referencias(origem, destino) {
  if (!temApi()) return [];
  const r = await chamar("/api/fontes", { origem, destino });
  // O Aviasales escolhe a moeda pelo país de quem acessa. Força reais, que é o que mostramos.
  const emReais = (l) => (/[?&]currency=/.test(l) ? l : l + (l.includes("?") ? "&" : "?") + "currency=brl");
  return (r?.datas || []).filter((x) => x.referencia > 0 && x.link).map((x) => ({ ...x, link: emReais(x.link) }));
}

/** A oferta do Aviasales que vale mostrar na lista: dentro da janela e do valor, e pelo menos 3% abaixo do Google. */
export function melhorReferencia(refs, { hoje, limite, valor, precoGoogle }) {
  let melhor = null;
  for (const x of refs) {
    if (x.data_voo < hoje || x.data_voo > limite || x.referencia > valor) continue;
    if (x.referencia > precoGoogle * 0.97) continue;
    if (!melhor || x.referencia < melhor.referencia) melhor = x;
  }
  return melhor;
}

/** Pede ao Worker pra passar a vigiar um trecho. Devolve vigiado, na_fila, cheio ou invalido (null sem API ou se falhou). */
export async function pedirTrecho(origem, destino) {
  if (!temApi()) return null;
  const r = await chamar("/api/pedir", { origem, destino });
  return r?.status || null;
}
