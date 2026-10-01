import { leituras, nome, CIDADES, diaCurto, reais, duracao } from "../lib/dados";

export const dynamic = "force-dynamic";

function linkGoogle(o, d, data) {
  const q = `Flights to ${d} from ${o} on ${data} one way`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&curr=BRL&hl=pt-BR`;
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const valor = Number(sp.valor || 500);
  const dias = Number(sp.dias || 3);
  const { voos, lidoEm } = await leituras();

  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const limite = new Date(hoje); limite.setDate(limite.getDate() + dias);
  const limiteIso = limite.toISOString().slice(0, 10);
  const hojeIso = hoje.toISOString().slice(0, 10);

  const candidatos = voos.filter((v) => v.origem === origem && v.preco <= valor && v.data_voo >= hojeIso && v.data_voo <= limiteIso);
  const porDestino = new Map();
  for (const v of candidatos) {
    const atual = porDestino.get(v.destino);
    if (!atual || v.preco < atual.preco || (v.preco === atual.preco && v.paradas < atual.paradas)) porDestino.set(v.destino, v);
  }
  const lista = [...porDestino.values()].sort((a, b) => a.preco - b.preco);
  const origens = [...new Set(voos.map((v) => v.origem))].sort();

  return (
    <>
      <h1>Pra onde dá pra ir?</h1>
      <p className="sub">Voos só de ida, lidos no Google Voos {lidoEm ? `às ${lidoEm.slice(11)} de ${diaCurto(lidoEm.slice(0, 10))}` : ""}.</p>
      <form className="frase" method="get">
        Saindo de{" "}
        <select name="origem" defaultValue={origem}>
          {origens.map((o) => <option key={o} value={o}>{nome(o)}</option>)}
        </select>
        , com até R${" "}
        <input type="number" name="valor" defaultValue={valor} min="100" step="50" />
        , nos próximos{" "}
        <select name="dias" defaultValue={dias}>
          <option value="0">hoje</option>
          <option value="1">até amanhã</option>
          <option value="3">3 dias</option>
          <option value="7">7 dias</option>
          <option value="14">14 dias</option>
          <option value="30">30 dias</option>
        </select>
        <button type="submit">Ver opções</button>
      </form>

      {lista.length === 0 && (
        <div className="vazio">
          Nada por até {reais(valor)} saindo de {nome(origem)} nesse período. Aumente o valor ou a janela.
          {voos.length === 0 && " (Ainda não há leituras publicadas. O coletor grava a primeira assim que começar a rodar.)"}
        </div>
      )}

      {lista.map((v) => (
        <div className="cartao" key={v.destino}>
          <div className="topo">
            <span className="destino">{nome(v.destino)}</span>
            <span className="preco">{reais(v.preco)}</span>
          </div>
          <div className="detalhe">
            {diaCurto(v.data_voo)} · {v.companhia} · {v.paradas === 0 ? "direto" : `${v.paradas} parada${v.paradas > 1 ? "s" : ""}`} · {duracao(v.duracao_min)}
            <br />sai {v.h_saida}, chega {v.h_chegada}
          </div>
          <div className="acoes">
            <a className="botao principal" href={linkGoogle(v.origem, v.destino, v.data_voo)} target="_blank" rel="noopener">Ver no Google Voos</a>
            <a className="botao" href={`/melhor-dia?origem=${v.origem}&destino=${v.destino}`}>Comparar dias</a>
          </div>
        </div>
      ))}

      <p className="aviso">
        Preços lidos em buscador público, com horário de leitura. Mudam a qualquer momento. A compra é feita no site da companhia ou agência.
        O radar não vende passagens.
      </p>
    </>
  );
}
