import { marked } from "marked";
import { relatorio, leituras, nome, CIDADES } from "@/lib/dados";
import { modelo, estimar, curvaRota, recomendar, FAIXA_NOME } from "@/lib/modelo";
import { reais, diaCurto, diaLongo, hojeIso, somaDias } from "@/lib/formato";
import { Vazio, Secao } from "../blocos";
import { FormRota } from "../filtros";
import { Compra } from "../compra";
import { Horas } from "../horas";
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
      <h1 className="t-display max-w-[10ch]">Vai baixar<br />o preço?</h1>
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
  const e = estimar(m, { origem, destino, companhia: cia || "-", h_saida: sp.faixa === "manha" ? "08:00" : sp.faixa === "tarde" ? "14:00" : sp.faixa === "noite" ? "20:00" : sp.faixa === "madrugada" ? "02:00" : "-" });
  const rota = m.rotas[`${origem}-${destino}`];

  // Ranking de rotas por chance, só as que já têm base razoável.
  const ranking = Object.entries(m.nos)
    .filter(([k, no]) => !k.includes("|") && k.startsWith(origem + "-") && no.n >= 5)
    .sort((a, b) => b[1].p - a[1].p);
  const maiorP = ranking.length ? ranking[0][1].p : 1;

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
        <Numero rotulo="Chance de baixar 30% ou mais" valor={`${Math.round(100 * e.p)}%`} nota={`${e.k} de ${e.n} voos de ${e.nivel}`} destaque />
        <Numero
          rotulo="Quando cai, vai de quanto pra quanto"
          valor={e.de ? `${reais(e.de)} → ${reais(e.pra)}` : "sem caso"}
          nota={e.de ? (e.pra_p25 ? `metade dos casos termina entre ${reais(e.pra_p25)} e ${reais(e.pra_p75)}` : `queda mediana de ${Math.round(100 * e.queda_med)}%`) : "nenhum voo baixou ainda"}
          pequeno
        />
        <Numero rotulo="Quando o mínimo aparece" valor={e.horas_antes_med ? `${Math.round(e.horas_antes_med)} h antes` : "sem caso"} nota="mediana, antes da partida" />
      </div>
      {rota && (
        <p className="mt-[1em] max-w-[60ch] text-muted-foreground">
          Nesse trecho, o voo mais barato do dia costuma sair por {reais(rota.tipico)}. O menor preço já visto foi {reais(rota.menor_visto)}.
          {e.p >= 0.2 ? " Vale acompanhar: um em cada " + Math.round(1 / e.p) + " voos baixa de preço antes de decolar." : " A baixa de última hora é rara aqui; se o preço está bom, não espere."}
        </p>
      )}

      <Compra curva={curvaRota(m, origem, destino)} dataVoo={dataVoo} hoje={hoje} rotaNome={`${nome(origem)} → ${nome(destino)}`} />

      <Secao rotulo={`${m.base} voos observados até decolar`} titulo={`Saindo de ${nome(origem)}: onde a queda é mais comum`} />
      {ranking.length === 0 && <p className="text-muted-foreground">Ainda não há voos suficientes saindo de {nome(origem)} pra montar o ranking.</p>}
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

      <Secao rotulo="todas as rotas juntas" titulo="Padrões gerais da rede" />
      <div className="grid gap-[2em] md:grid-cols-2">
        <Corte titulo="Por horário do voo" dados={m.cortes.faixa} rotulo={(k) => FAIXA_NOME[k] || k} />
        <Corte titulo="Por dia da semana do voo" dados={m.cortes.dia} rotulo={(k) => DIAS[k] || k} />
        <Corte titulo="Por companhia" dados={m.cortes.cia} rotulo={(k) => k} />
        <Corte titulo="Direto ou com parada" dados={m.cortes.tipo} rotulo={(k) => (k === "parada" ? "com parada" : k)} />
      </div>

      <Horas m={m} origem={origem} destino={destino} rotaNome={`${nome(origem)} → ${nome(destino)}`} />

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
