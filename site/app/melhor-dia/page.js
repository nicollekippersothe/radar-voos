import { leituras, nome } from "../../lib/dados";
import { reais, intervalo, duracao, paradas, diaCurto, diaLongo, horaLeitura, hojeIso, linkGoogle } from "../../lib/formato";
import { Chevron, Seta, Aviao } from "../icones";

export const dynamic = "force-dynamic";

export default async function MelhorDia({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const destino = (sp.destino || "FLN").toUpperCase();
  const soDiretos = sp.diretos !== "0";
  const { voos, lidoEm } = await leituras();

  const hoje = hojeIso();
  const doTrecho = voos.filter((v) => v.origem === origem && v.destino === destino && v.data_voo >= hoje && (!soDiretos || v.paradas === 0));
  const porDia = new Map();
  for (const v of doTrecho) {
    const atual = porDia.get(v.data_voo);
    if (!atual || v.preco < atual.preco) porDia.set(v.data_voo, v);
  }
  const dias = [...porDia.values()].sort((a, b) => a.data_voo.localeCompare(b.data_voo));
  const menor = dias.length ? Math.min(...dias.map((d) => d.preco)) : 0;
  const maior = dias.length ? Math.max(...dias.map((d) => d.preco)) : 1;
  const origens = [...new Set(voos.map((v) => v.origem))].sort();
  const destinos = [...new Set(voos.filter((v) => v.origem === origem).map((v) => v.destino))].sort();
  const diaSel = sp.dia || (dias.find((d) => d.preco === menor) || {}).data_voo;
  const todosDoDia = doTrecho.filter((v) => v.data_voo === diaSel).sort((a, b) => a.preco - b.preco);
  const mostrarTodos = sp.todos === "1";
  const voosDoDia = mostrarTodos ? todosDoDia : todosDoDia.slice(0, 10);
  const base = `?origem=${origem}&destino=${destino}&diretos=${soDiretos ? 1 : 0}`;

  return (
    <>
      <h1 className="display">Qual dia é mais barato?</h1>
      <p className="sub">
        Menor preço por dia, lido {horaLeitura(lidoEm)}. Os próximos 3 dias atualizam a cada 30 min; o resto, uma vez por dia.
      </p>

      <form className="frase" method="get">
        De{" "}
        <label className="campo">
          <select name="origem" defaultValue={origem} aria-label="Origem">
            {(origens.length ? origens : [origem]).map((o) => <option key={o} value={o}>{nome(o)}</option>)}
          </select>
          <span className="seta"><Seta /></span>
        </label>
        {" "}pra{" "}
        <label className="campo">
          <select name="destino" defaultValue={destino} aria-label="Destino">
            {(destinos.length ? destinos : [destino]).map((d) => <option key={d} value={d}>{nome(d)}</option>)}
          </select>
          <span className="seta"><Seta /></span>
        </label>
        ,{" "}
        <label className="campo">
          <select name="diretos" defaultValue={soDiretos ? "1" : "0"} aria-label="Tipo de voo">
            <option value="1">só diretos</option>
            <option value="0">com paradas também</option>
          </select>
          <span className="seta"><Seta /></span>
        </label>
        <button className="enviar" type="submit">Comparar</button>
      </form>

      {dias.length === 0 ? (
        <div className="vazio entra">
          <div className="icone"><Aviao /></div>
          <h3>Sem leituras pra {nome(origem)} → {nome(destino)}</h3>
          <p>Esse trecho pode não estar na lista vigiada, ou o coletor ainda não passou por ele.</p>
          <a className="botao" href="/">Ver pra onde dá pra ir</a>
        </div>
      ) : (
        <>
          <div className="secao-titulo">Menor preço por dia</div>
          <div className="dias entra">
            {dias.map((d) => (
              <a
                className={`dia ${d.preco === menor ? "menor" : ""}`}
                key={d.data_voo}
                href={`${base}&dia=${d.data_voo}`}
                aria-current={d.data_voo === diaSel ? "true" : undefined}
                aria-label={`${diaLongo(d.data_voo)}, ${reais(d.preco)}${d.preco === menor ? ", o mais barato" : ""}`}
              >
                <span className="rotulo">{diaCurto(d.data_voo)}</span>
                <span className="trilho"><i style={{ width: `${Math.max(6, (100 * d.preco) / maior)}%` }} /></span>
                <span className="valor display num">{reais(d.preco)}</span>
              </a>
            ))}
          </div>

          {voosDoDia.length > 0 && (
            <>
              <div className="secao-titulo">{diaLongo(diaSel)}</div>
              <div className="grupo">
                {voosDoDia.map((v, i) => (
                  <a
                    className="linha entra"
                    key={i}
                    href={linkGoogle(v.origem, v.destino, v.data_voo)}
                    target="_blank"
                    rel="noopener"
                    aria-label={`${v.companhia}, ${intervalo(v.h_saida, v.h_chegada)}, ${paradas(v.paradas)}, ${reais(v.preco)}. Abre no Google Voos`}
                  >
                    <div>
                      <div className="titulo">
                        {v.companhia}
                        {v.paradas === 0 ? <span className="etiqueta">direto</span> : <span className="etiqueta neutra">{paradas(v.paradas)}</span>}
                      </div>
                      <div className="detalhe">
                        <span className="num">{intervalo(v.h_saida, v.h_chegada)}</span> · {duracao(v.duracao_min)}
                      </div>
                    </div>
                    <div className="preco display num">{reais(v.preco)}</div>
                    <span className="chevron"><Chevron /></span>
                  </a>
                ))}
              </div>
              {todosDoDia.length > voosDoDia.length && (
                <div className="acoes">
                  <a className="botao" href={`${base}&dia=${diaSel}&todos=1`}>
                    Ver todos os {todosDoDia.length} voos
                  </a>
                </div>
              )}
            </>
          )}
        </>
      )}

      <p className="aviso">
        Quando o coletor tiver semanas de histórico, esta tela mostra também o menor preço já visto no trecho
        e a chance de cair antes do dia. Hoje mostra só a última leitura.
      </p>
    </>
  );
}
