import { marked } from "marked";
import { relatorio } from "../../lib/dados";

export const dynamic = "force-dynamic";

export default async function Relatorio() {
  const md = await relatorio();
  if (!md) {
    return (
      <>
        <h1>Padrões de queda</h1>
        <div className="vazio">O primeiro relatório sai depois que os primeiros voos observados decolarem (2 a 3 dias de coleta).</div>
      </>
    );
  }
  return <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(md) }} />;
}
