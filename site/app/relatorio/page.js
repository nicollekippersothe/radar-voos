import { marked } from "marked";
import { relatorio } from "../../lib/dados";
import { Aviao } from "../icones";

export const dynamic = "force-dynamic";

export default async function Relatorio() {
  const md = await relatorio();
  if (!md) {
    return (
      <>
        <h1 className="display">Padrões de queda</h1>
        <div className="vazio entra">
          <div className="icone"><Aviao /></div>
          <h3>Ainda sem relatório</h3>
          <p>O primeiro sai depois que os primeiros voos observados decolarem, em 2 a 3 dias de coleta.</p>
        </div>
      </>
    );
  }
  // O título do markdown vira o H1 da página, na fonte de display.
  const html = marked.parse(md).replace(/^<h1>/, '<h1 class="display">');
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
