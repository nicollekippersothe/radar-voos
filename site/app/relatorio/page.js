import { marked } from "marked";
import { relatorio } from "@/lib/dados";
import { Vazio } from "../blocos";

export const dynamic = "force-dynamic";

export default async function Relatorio() {
  const md = await relatorio();
  const cabecalho = (
    <section className="mb-[2.5em] flex flex-col gap-[1em]">
      <span className="t-kicker text-brand">Viagens de última hora</span>
      <h1 className="t-display max-w-[10ch]">Padrões<br />de queda</h1>
      <p className="t-lead max-w-[42ch] text-muted-foreground">
        O que o coletor aprendeu olhando os preços cair nas 48 horas antes do voo: rotas, companhias, horários e dias da semana.
      </p>
    </section>
  );
  if (!md) {
    return (
      <>
        {cabecalho}
        <Vazio titulo="Ainda sem relatório" texto="O primeiro sai depois que os primeiros voos observados decolarem, em 2 a 3 dias de coleta." />
      </>
    );
  }
  // O título do markdown já está no cabeçalho da página.
  const html = marked.parse(md)
    .replace(/^<h1>.*?<\/h1>\s*/, "")
    // Tabela larga rola na horizontal em vez de estourar a página no celular.
    .replace(/<table>/g, '<div class="overflow-x-auto"><table>').replace(/<\/table>/g, "</table></div>");
  return (
    <>
      {cabecalho}
      <article
        className="prose prose-neutral dark:prose-invert max-w-[82ch] prose-headings:font-display prose-headings:tracking-[-0.03em] prose-h2:t-h3 prose-h2:mt-[3em] prose-table:text-[0.9em] prose-th:t-label prose-th:text-muted-foreground prose-td:t-num prose-a:text-brand"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
