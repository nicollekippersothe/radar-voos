import { reais, diaCurto, somaDias } from "@/lib/formato";
import { recomendar } from "@/lib/modelo";
import { Vazio, Secao } from "./blocos";
import { cn } from "@/lib/utils";

export function Compra({ curva, dataVoo, hoje, rotaNome }) {
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
