import { leituras, nome, diaCurto, reais, duracao } from "../../lib/dados";

export const dynamic = "force-dynamic";

export default async function MelhorDia({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const destino = (sp.destino || "FLN").toUpperCase();
  const soDiretos = sp.diretos !== "0";
  const { voos, lidoEm } = await leituras();

  const hojeIso = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0, 10);
  const doTrecho = voos.filter((v) => v.origem === origem && v.destino === destino && v.data_voo >= hojeIso && (!soDiretos || v.paradas === 0));
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
  const voosDoDia = doTrecho.filter((v) => v.data_voo === diaSel).sort((a, b) => a.preco - b.preco);

  return (
    <>
      <h1>Qual dia é mais barato?</h1>
      <p className="sub">Menor preço por dia, lido {lidoEm ? `às ${lidoEm.slice(11)} de ${diaCurto(lidoEm.slice(0, 10))}` : ""}. Os próximos 3 dias são atualizados a cada 30 min; o resto, uma vez por dia.</p>
      <form className="frase" method="get">
        De{" "}
        <select name="origem" defaultValue={origem}>{origens.map((o) => <option key={o} value={o}>{nome(o)}</option>)}</select>
        {" "}pra{" "}
        <select name="destino" defaultValue={destino}>{(destinos.length ? destinos : [destino]).map((d) => <option key={d} value={d}>{nome(d)}</option>)}</select>
        ,{" "}
        <select name="diretos" defaultValue={soDiretos ? "1" : "0"}>
          <option value="1">só diretos</option>
          <option value="0">com paradas também</option>
        </select>
        <button type="submit">Comparar</button>
      </form>

      {dias.length === 0 && <div className="vazio">Sem leituras pra {nome(origem)} → {nome(destino)}. Esse trecho pode não estar em rotas.py.</div>}

      <div className="barras">
        {dias.map((d) => (
          <a className={`barra ${d.preco === menor ? "menor" : ""}`} key={d.data_voo} href={`?origem=${origem}&destino=${destino}&diretos=${soDiretos ? 1 : 0}&dia=${d.data_voo}`} style={{ color: "inherit", textDecoration: "none" }}>
            <span>{diaCurto(d.data_voo)}</span>
            <span className="faixa"><i style={{ width: `${Math.max(8, (100 * d.preco) / maior)}%` }} /></span>
            <span>{reais(d.preco)}</span>
          </a>
        ))}
      </div>

      {voosDoDia.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.05rem" }}>Voos de {diaCurto(diaSel)}</h2>
          <table>
            <thead><tr><th>Preço</th><th>Cia</th><th>Horário</th><th>Tipo</th></tr></thead>
            <tbody>
              {voosDoDia.map((v, i) => (
                <tr key={i}><td><b>{reais(v.preco)}</b></td><td>{v.companhia}</td><td>{v.h_saida} → {v.h_chegada}</td><td>{v.paradas === 0 ? "direto" : `${v.paradas} parada`} · {duracao(v.duracao_min)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="aviso">
        Quando o coletor tiver semanas de histórico, essa tela vai mostrar também o menor preço já visto nesse trecho e a chance de cair antes do dia.
        Hoje ela mostra só a última leitura.
      </p>
    </>
  );
}
