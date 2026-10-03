import { marked } from "marked";
import { relatorio, leituras, nome, CIDADES } from "@/lib/dados";
import { modelo, estimar, curvaRota, recomendar, FAIXA_NOME } from "@/lib/modelo";
import { reais, diaCurto, diaLongo, hojeIso, somaDias } from "@/lib/formato";
import { Vazio, Secao } from "../blocos";
import { FormRota } from "../filtros";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DIAS = { Mon: "segunda", Tue: "terça", Wed: "quarta", Thu: "quinta", Fri: "sexta", Sat: "sábado", Sun: "domingo" };

export default async function Padroes({ searchParams }) {
  const sp = await searchParams;
  const [md, m, { voos }] = await Promise.all([relatorio(), modelo(), leituras()]);
  const origem = (sp.origem || "SAO").toUpperCase();
  const destino = (sp.destino || "FLN").toUpperCase();
  const cia = sp.cia || "";
  const hoje = hojeIso();
  const dataVoo = /^\d{4}-\d{2}-\d{2}$/.test(sp.data || "") && sp.data >= hoje ? sp.data : somaDias(hoje, 2);

  const cabecalho = (
    <section className="mb-[2.5em] flex flex-col gap-[1em]">
      <span className="t-kicker text-brand">Viagens de última hora</span>
      <h1 className="t-display max-w-[10ch]">Vai cair<br />ou não vai?</h1>
      <p className="t-lead max-w-[42ch] text-muted-foreground">
        O radar acompanha cada voo até decolar e anota quando o preço despenca nas últimas 48 horas. Isto é o que ele aprendeu até agora.
      </p>
    </section>
  );

  if (!m || !m.base) {
    return (
      <>
        {cabecalho}
        <Vazio titulo="Ainda aprendendo" texto="O primeiro resultado sai depois que os primeiros voos observados decolarem, em 2 a 3 dias de coleta." />
      </>
    );
  }

  const origens = [...new Set(Object.keys(m.rotas).map((r) => r.split("-")[0]))].sort();
  const destinos = [...new Set(Object.keys(m.rotas).filter((r) => r.startsWith(origem + "-")).map((r) => r.split("-")[1]))].sort();
  const cias = [...new Set(voos.filter((v) => v.origem === origem && v.destino === destino).map((v) => v.companhia))].sort();
  const e = estimar(m, { origem, destino, companhia: cia || "—", h_saida: sp.faixa === "manha" ? "08:00" : sp.faixa === "tarde" ? "14:00" : sp.faixa === "noite" ? "20:00" : sp.faixa === "madrugada" ? "02:00" : "—" });
  const rota = m.rotas[`${origem}-${destino}`];

  // Ranking de rotas por chance, só as que já têm base razoável.
  const ranking = Object.entries(m.nos)
    .filter(([k, no]) => !k.includes("|") && no.n >= 10)
    .sort((a, b) => b[1].p - a[1].p);
  const maiorP = ranking.length ? ranking[0][1].p : 1;

  const horas = Object.entries(m.hora_do_min || {}).map(([h, n]) => [Number(h), n]);
  const maxHora = Math.max(1, ...horas.map(([, n]) => n));

  const html = md ? marked.parse(md).replace(/^<h1>.*?<\/h1>\s*/, "").replace(/<table>/g, '<div class="overflow-x-auto"><table>').replace(/<\/table>/g, "</table></div>") : "";

  return (
    <>
      {cabecalho}

      <FormRota
        origem={origem} origens={origens.map((o) => [o, nome(o)])}
        destino={destino} destinos={(destinos.length ? destinos : [destino]).map((d) => [d, nome(d)])}
        cia={cia} cias={[["", "Qualquer companhia"], ...cias.map((c) => [c, c])]}
        faixa={sp.faixa || ""}
        data={dataVoo} minData={hoje}
      />

      <div className="mt-[3em] grid gap-[1em] sm:grid-cols-3">
        <Numero rotulo="Chance de cair 30% ou mais" valor={`${Math.round(100 * e.p)}%`} nota={`${e.k} de ${e.n} voos de ${e.nivel}`} destaque />
        <Numero
          rotulo="Quando cai, vai de quanto pra quanto"
          valor={e.de ? `${reais(e.de)} → ${reais(e.pra)}` : "sem caso"}
          nota={e.de ? (e.pra_p25 ? `metade dos casos termina entre ${reais(e.pra_p25)} e ${reais(e.pra_p75)}` : `queda mediana de ${Math.round(100 * e.queda_med)}%`) : "nenhum voo caiu ainda"}
          pequeno
        />
        <Numero rotulo="Quando o mínimo aparece" valor={e.horas_antes_med ? `${Math.round(e.horas_antes_med)} h antes` : "sem caso"} nota="mediana, antes da partida" />
      </div>
      {rota && (
        <p className="mt-[1em] max-w-[60ch] text-muted-foreground">
          Nesse trecho, o voo mais barato do dia costuma sair por {reais(rota.tipico)}. O menor preço já visto foi {reais(rota.menor_visto)}.
          {e.p >= 0.2 ? " Vale acompanhar: um em cada " + Math.round(1 / e.p) + " voos cai antes de decolar." : " Queda de última hora é rara aqui; se o preço está bom, não espere."}
        </p>
      )}

      <Compra curva={curvaRota(m, origem, destino)} dataVoo={dataVoo} hoje={hoje} rotaNome={`${nome(origem)} → ${nome(destino)}`} />

      <Secao rotulo={`${m.base} voos observados até decolar`} titulo="Onde a queda é mais comum" />
      <ol className="entra flex flex-col gap-[0.25em] rounded-lg border bg-card p-[0.75em]">
        {ranking.map(([k, no]) => {
          const [o, d] = k.split("-");
          const sel = k === `${origem}-${destino}`;
          return (
            <li key={k}>
              <a href={`?origem=${o}&destino=${d}`} className={cn("grid min-h-[44px] grid-cols-[9em_1fr_auto] items-center gap-[1em] rounded-md px-[0.75em] py-[0.5em] transition-colors hover:bg-muted/70", sel && "bg-muted")}>
                <span className="text-[0.9em]">{nome(o)} → {nome(d)}</span>
                <span className="h-[0.75em] overflow-hidden rounded-sm bg-muted"><i className={cn("block h-full rounded-sm", sel ? "bg-brand" : "bg-foreground/70")} style={{ width: `${Math.max(3, (100 * no.p) / maiorP)}%` }} /></span>
                <span className="t-num text-[0.9em]"><b className="font-display text-[1.2em] font-semibold">{Math.round(100 * no.p)}%</b> <span className="text-muted-foreground">de {no.n}</span></span>
              </a>
            </li>
          );
        })}
      </ol>

      <div className="mt-[3em] grid gap-[2em] md:grid-cols-2">
        <Corte titulo="Por horário do voo" dados={m.cortes.faixa} rotulo={(k) => FAIXA_NOME[k] || k} />
        <Corte titulo="Por dia da semana do voo" dados={m.cortes.dia} rotulo={(k) => DIAS[k] || k} />
        <Corte titulo="Por companhia" dados={m.cortes.cia} rotulo={(k) => k} />
        <Corte titulo="Direto ou com parada" dados={m.cortes.tipo} rotulo={(k) => (k === "parada" ? "com parada" : k)} />
      </div>

      {horas.length > 0 && (
        <>
          <Secao rotulo="hora do dia" titulo="A que horas o preço bate o mínimo" />
          <div className="flex items-end gap-[2px] rounded-lg border bg-card p-[1em]" role="img" aria-label="Quantidade de mínimos por hora do dia">
            {Array.from({ length: 24 }, (_, h) => {
              const n = (horas.find(([hh]) => hh === h) || [h, 0])[1];
              return (
                <div key={h} className="flex flex-1 flex-col items-center gap-[0.25em]">
                  <i className="block w-full rounded-sm bg-foreground/70" style={{ height: `${Math.max(2, (120 * n) / maxHora)}px` }} title={`${h}h: ${n}`} />
                  {h % 6 === 0 && <span className="t-num text-[0.65em] text-muted-foreground">{h}h</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-[0.75em] max-w-[60ch] text-[0.85em] text-muted-foreground">Horário em que a leitura mais barata foi registrada, nos voos que caíram 30% ou mais. É quando vale abrir o radar.</p>
        </>
      )}

      {md && (
        <details className="mt-[3em] rounded-lg border bg-card p-[1.25em]">
          <summary className="cursor-pointer font-medium">Tabelas completas do relatório</summary>
          <article className="prose prose-neutral dark:prose-invert mt-[1em] max-w-[82ch] prose-headings:font-display prose-headings:tracking-[-0.03em] prose-h2:t-h3 prose-table:text-[0.85em] prose-th:t-label prose-th:text-muted-foreground prose-td:t-num" dangerouslySetInnerHTML={{ __html: html }} />
        </details>
      )}

      <p className="mt-[3em] max-w-[60ch] text-[0.85em] leading-[1.4] text-muted-foreground">
        Como funciona: cada voo é lido a cada 30 min nos 3 dias antes de sair. Queda de última hora é quando o preço fica 30% ou mais abaixo do menor valor visto antes das 48 h finais. A chance é a frequência observada, puxada pra média geral enquanto a amostra é pequena.
      </p>
    </>
  );
}

function Numero({ rotulo, valor, nota, destaque, pequeno }) {
  return (
    <div className={cn("rounded-lg border p-[1.25em]", destaque ? "border-brand/40 bg-brand/5" : "bg-card")}>
      <div className="t-label text-muted-foreground">{rotulo}</div>
      <div className={cn("t-num mt-[0.25em]", pequeno ? "t-h3" : "t-h2", destaque && "text-brand")}>{valor}</div>
      <div className="mt-[0.25em] text-[0.85em] text-muted-foreground">{nota}</div>
    </div>
  );
}

function Corte({ titulo, dados, rotulo }) {
  const linhas = Object.entries(dados || {}).filter(([, no]) => no.n >= 5).sort((a, b) => b[1].p - a[1].p);
  if (!linhas.length) return null;
  const maior = linhas[0][1].p || 1;
  return (
    <div>
      <div className="t-label mb-[0.75em] text-muted-foreground">{titulo}</div>
      <ol className="flex flex-col gap-[0.25em] rounded-lg border bg-card p-[0.75em]">
        {linhas.map(([k, no]) => (
          <li key={k} className="grid min-h-[2.25em] grid-cols-[7em_1fr_auto] items-center gap-[0.75em] px-[0.5em]">
            <span className="text-[0.9em]">{rotulo(k)}</span>
            <span className="h-[0.6em] overflow-hidden rounded-sm bg-muted"><i className="block h-full rounded-sm bg-foreground/70" style={{ width: `${Math.max(3, (100 * no.p) / maior)}%` }} /></span>
            <span className="t-num text-[0.9em]"><b className="font-semibold">{Math.round(100 * no.p)}%</b> <span className="text-muted-foreground">de {no.n}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Compra({ curva, dataVoo, hoje, rotaNome }) {
  if (!curva) {
    return (
      <>
        <Secao rotulo="melhor data pra comprar" titulo="Ainda aprendendo" />
        <Vazio titulo="Sem base de antecedência" texto="Preciso ver os mesmos voos em dias diferentes antes de decolar pra dizer quando compensa comprar. Isso aparece sozinho em alguns dias." />
      </>
    );
  }
  const r = recomendar(curva, dataVoo, hoje, { somaDias });
  const faixas = [...curva.faixas].sort((a, b) => b.de - a.de); // da mais longe pra mais perto
  const maxRel = Math.max(...faixas.map((f) => f.rel));
  const incompleto = r.maxDias < 14;

  const quando = r.janela.de === r.janela.ate ? `em ${diaCurto(r.janela.de)}` : `entre ${diaCurto(r.janela.de)} e ${diaCurto(r.janela.ate)}`;
  let titulo, texto;
  if (r.semDados) {
    titulo = "Ainda não sei pra essa antecedência";
    texto = `Faltam ${r.ate} dias pro voo e só observei voos de até ${r.maxDias} dia${r.maxDias === 1 ? "" : "s"} antes de decolar. Nos dados que tenho, o preço esperado é menor ${r.melhor.rotulo}, ${quando}. Volto com a resposta pra essa data quando a leitura de 30 dias acumular.`;
  } else if (r.acao === "agora") {
    titulo = "Compre agora.";
    texto = `Faltam ${r.ate} dia${r.ate === 1 ? "" : "s"} e você já está na faixa em que o preço esperado é o menor (${r.melhor.rotulo}). Esperar mais não costuma compensar.`;
  } else if (r.acao === "espera") {
    titulo = r.melhor.ate === 0 ? "Espere até o dia do voo." : `Espere até ${diaCurto(r.janela.ate)}.`;
    texto = `O preço esperado é menor ${r.melhor.rotulo}, ${quando}. Esperando, você paga em média ${Math.round(100 * r.economiaPct)}% menos, uns ${reais(r.economiaRs)}. É média, não garantia: o voo pode esgotar a tarifa barata.`;
  } else {
    titulo = "Compre agora.";
    texto = `A faixa mais barata (${r.melhor.rotulo}) já passou pra esse voo. Daqui pra frente o preço esperado só sobe${r.economiaPct > 0 ? `, em média ${Math.round(100 * r.economiaPct)}% acima do melhor momento` : ""}.`;
  }

  return (
    <>
      <Secao rotulo={`melhor data pra comprar · ${rotaNome} · voo em ${diaCurto(dataVoo)}`} titulo="Quando comprar" />
      <div className="mb-[1em] rounded-lg border border-brand/40 bg-brand/5 p-[1.25em]">
        <p className="t-h3">{titulo}</p>
        <p className="mt-[0.5em] max-w-[62ch] text-muted-foreground">{texto}</p>
      </div>
      <div className="t-label mb-[0.75em] text-muted-foreground">Preço esperado por antecedência, curva {curva.fonte}</div>
      <ol className="flex flex-col gap-[0.25em] rounded-lg border bg-card p-[0.75em]">
        {faixas.map((f) => {
          const best = f.i === r.melhor.i;
          const aqui = r.atual && f.i === r.atual.i;
          return (
            <li key={f.i} className={cn("grid min-h-[44px] grid-cols-[8.5em_1fr_auto] items-center gap-[1em] rounded-md px-[0.75em] py-[0.5em]", aqui && "bg-muted")}>
              <span className="flex flex-col text-[0.9em]">
                {f.rotulo}
                {aqui && <span className="t-label text-brand">você está aqui</span>}
              </span>
              <span className="h-[0.75em] overflow-hidden rounded-sm bg-muted">
                <i className={cn("block h-full rounded-sm", best ? "bg-brand" : "bg-foreground/70")} style={{ width: `${Math.max(4, (100 * f.rel) / maxRel)}%` }} />
              </span>
              <span className="t-num text-[0.9em]">
                <b className={cn("font-display text-[1.2em] font-semibold", best && "text-brand")}>{reais(Math.round(curva.base * f.rel))}</b>
                <span className="text-muted-foreground"> · {Math.round(100 * f.mudou)}% mudaram · {f.n} voos</span>
              </span>
            </li>
          );
        })}
      </ol>
      {incompleto && (
        <p className="mt-[0.75em] max-w-[62ch] text-[0.85em] text-muted-foreground">
          Por enquanto só acompanhei os voos de até {r.maxDias} dia{r.maxDias === 1 ? "" : "s"} antes da decolagem. A leitura de 30 dias à frente passou a rodar todo dia, e as faixas de 3 a 30 dias entram aqui sozinhas conforme os voos acumulam.
        </p>
      )}
    </>
  );
}
