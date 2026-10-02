import { leituras, nome } from "../lib/dados";
import { reais, intervalo, duracao, paradas, diaCurto, horaLeitura, hojeIso, somaDias, linkGoogle } from "../lib/formato";
import { Chevron, Seta, Aviao } from "./icones";

export const dynamic = "force-dynamic";

const JANELAS = [
  ["0", "hoje"],
  ["1", "até amanhã"],
  ["3", "3 dias"],
  ["7", "7 dias"],
  ["14", "14 dias"],
  ["30", "30 dias"],
];

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const valor = Number(sp.valor || 500);
  const dias = Number(sp.dias || 3);
  const { voos, lidoEm } = await leituras();

  const hoje = hojeIso();
  const limite = somaDias(hoje, dias);

  const candidatos = voos.filter((v) => v.origem === origem && v.preco <= valor && v.data_voo >= hoje && v.data_voo <= limite);
  const porDestino = new Map();
  for (const v of candidatos) {
    const atual = porDestino.get(v.destino);
    if (!atual || v.preco < atual.preco || (v.preco === atual.preco && v.paradas < atual.paradas)) porDestino.set(v.destino, v);
  }
  const lista = [...porDestino.values()].sort((a, b) => a.preco - b.preco);
  const origens = [...new Set(voos.map((v) => v.origem))].sort();
  const semLeituras = voos.length === 0;

  return (
    <>
      <h1 className="display">Pra onde dá pra ir?</h1>
      <p className="sub">
        Voos só de ida, lidos no Google Voos {horaLeitura(lidoEm)}.
      </p>

      <form className="frase" method="get">
        Saindo de{" "}
        <label className="campo">
          <select name="origem" defaultValue={origem} aria-label="Origem">
            {(origens.length ? origens : [origem]).map((o) => <option key={o} value={o}>{nome(o)}</option>)}
          </select>
          <span className="seta"><Seta /></span>
        </label>
        , com até{" "}
        <label className="campo">
          <span aria-hidden="true">R$&nbsp;</span>
          <input className="num" type="number" name="valor" defaultValue={valor} min="100" step="50" aria-label="Valor máximo em reais" />
        </label>
        , nos próximos{" "}
        <label className="campo">
          <select name="dias" defaultValue={String(dias)} aria-label="Janela de dias">
            {JANELAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <span className="seta"><Seta /></span>
        </label>
        <button className="enviar" type="submit">Ver opções</button>
      </form>

      {lista.length === 0 ? (
        <div className="vazio entra">
          <div className="icone"><Aviao /></div>
          <h3>{semLeituras ? "Ainda sem leituras" : `Nada por até ${reais(valor)}`}</h3>
          <p>
            {semLeituras
              ? "O coletor grava a primeira leitura assim que começar a rodar. Volte em alguns minutos."
              : `Saindo de ${nome(origem)} nesse período, nenhum voo coube no valor. Experimente um valor maior ou uma janela mais longa.`}
          </p>
          {!semLeituras && (
            <a className="botao" href={`/?origem=${origem}&valor=${Math.round(valor * 1.5 / 50) * 50}&dias=${Math.max(dias, 7)}`}>
              Tentar com {reais(Math.round(valor * 1.5 / 50) * 50)} em 7 dias
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="secao-titulo">
            {lista.length === 1 ? "1 destino" : `${lista.length} destinos`} por até {reais(valor)}
          </div>
          <div className="grupo">
            {lista.map((v) => (
              <a
                className="linha entra"
                key={v.destino}
                href={linkGoogle(v.origem, v.destino, v.data_voo)}
                target="_blank"
                rel="noopener"
                aria-label={`${nome(v.destino)}, ${reais(v.preco)}, ${diaCurto(v.data_voo)}, ${v.companhia}, ${paradas(v.paradas)}. Abre no Google Voos`}
              >
                <div>
                  <div className="titulo">
                    {nome(v.destino)}
                    {v.paradas === 0 && <span className="etiqueta">direto</span>}
                  </div>
                  <div className="detalhe">
                    {diaCurto(v.data_voo)} · {v.companhia}
                    {v.paradas > 0 && ` · ${paradas(v.paradas)}`} · {duracao(v.duracao_min)}
                    <br />
                    <span className="num">{intervalo(v.h_saida, v.h_chegada)}</span>
                  </div>
                </div>
                <div className="preco display num">
                  {reais(v.preco)}
                  <small>Google Voos</small>
                </div>
                <span className="chevron"><Chevron /></span>
              </a>
            ))}
          </div>
          <div className="acoes">
            {lista.slice(0, 3).map((v) => (
              <a key={v.destino} className="botao" href={`/melhor-dia?origem=${v.origem}&destino=${v.destino}`}>
                Comparar dias: {nome(v.destino)}
              </a>
            ))}
          </div>
        </>
      )}

      <p className="aviso">
        Preços lidos em buscador público, com horário de leitura. Mudam a qualquer momento.
        A compra é feita no site da companhia ou agência. O radar não vende passagens.
      </p>
    </>
  );
}
