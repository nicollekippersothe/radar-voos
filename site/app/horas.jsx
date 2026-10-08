import { Secao } from "./blocos";
import { cn } from "@/lib/utils";

/** Preço relativo por hora de leitura num trecho (modelo.horas). 1 = igual à mediana do dia. */
export function Horas({ m, origem, destino, rotaNome }) {
  const h = m?.horas?.[`${origem}-${destino}`];
  if (!h) {
    return (
      <>
        <Secao rotulo="hora do dia" titulo="A que horas olhar" />
        <p className="max-w-[60ch] text-muted-foreground">Ainda não há leituras suficientes de {rotaNome} pra dizer qual hora costuma ser mais barata.</p>
      </>
    );
  }
  const vals = h.map((v, i) => [i, v]).filter(([, v]) => v !== null);
  const menor = vals.reduce((a, b) => (b[1] < a[1] ? b : a));
  const maior = vals.reduce((a, b) => (b[1] > a[1] ? b : a));
  const min = Math.min(...vals.map(([, v]) => v)), max = Math.max(...vals.map(([, v]) => v));
  const folga = max - min || 1;
  const dif = Math.round(100 * (1 - menor[1] / maior[1]));
  const hh = (n) => `${String(n).padStart(2, "0")}h`;
  return (
    <>
      <Secao rotulo={`hora do dia · ${rotaNome}`} titulo="A que horas olhar" />
      <div className="flex items-end gap-[2px] rounded-lg border bg-card p-[1em]" role="img" aria-label={`Preço relativo por hora do dia. Mais barato às ${hh(menor[0])}.`}>
        {h.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-[0.25em]">
            <i
              className={cn("block w-full rounded-sm", v === null ? "bg-muted" : i === menor[0] ? "bg-brand" : "bg-foreground/70")}
              style={{ height: `${v === null ? 2 : 12 + (100 * (v - min)) / folga}px` }}
              title={v === null ? `${hh(i)}: sem dados` : `${hh(i)}: ${v > 1 ? "+" : ""}${Math.round(100 * (v - 1))}% do preço do dia`}
            />
            {i % 6 === 0 && <span className="t-num text-[0.65em] text-muted-foreground">{i}h</span>}
          </div>
        ))}
      </div>
      <p className="mt-[0.75em] max-w-[62ch] text-[0.9em] text-muted-foreground">
        Em {rotaNome}, o preço costuma estar mais baixo por volta das <b className="text-foreground">{hh(menor[0])}</b> e mais alto às {hh(maior[0])}. A diferença entre as duas é de uns {dif}%.
        {dif < 8 && " É pouca: o horário em que você olha importa bem menos que o dia em que você compra."}
      </p>
    </>
  );
}
