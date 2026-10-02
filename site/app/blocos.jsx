import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export function Secao({ rotulo, titulo }) {
  return (
    <div className="mb-[1em] mt-[2.5em] flex flex-col gap-[0.5em]">
      <span className="t-label text-muted-foreground">{rotulo}</span>
      {titulo && <h2 className="t-h3">{titulo}</h2>}
    </div>
  );
}

export function Vazio({ titulo, texto, acao }) {
  return (
    <div className="entra mt-[2.5em] flex flex-col items-start gap-[0.8em] rounded-xl border border-dashed p-[2em]">
      <span className="flex size-[2.6em] items-center justify-center rounded-full bg-muted text-muted-foreground"><Plane className="size-[1.2em]" /></span>
      <h3 className="t-h3">{titulo}</h3>
      <p className="max-w-[48ch] text-muted-foreground">{texto}</p>
      {acao}
    </div>
  );
}

export function Linha({ href, indice, titulo, etiqueta, boa, detalhe, horario, preco, aria }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={aria}
      className="entra group grid min-h-[4.5em] grid-cols-[2em_1fr_auto] items-center gap-x-[1em] px-[1.2em] py-[0.9em] transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:grid-cols-[2em_1fr_auto_auto]"
    >
      <span className="t-label t-num text-muted-foreground">{String(indice).padStart(2, "0")}</span>
      <span className="flex flex-col gap-[0.25em]">
        <span className="flex items-center gap-[0.6em] text-[1.15em] font-medium tracking-[-0.02em]">
          {titulo}
          {etiqueta && (
            <Badge variant="secondary" className={cn("rounded-full text-[0.65em] font-medium", boa && "bg-good/12 text-good")}>{etiqueta}</Badge>
          )}
        </span>
        <span className="text-[0.85em] text-muted-foreground">{detalhe}<span className="sm:hidden"> · <span className="t-num">{horario}</span></span></span>
      </span>
      <span className="t-num hidden text-[0.9em] text-muted-foreground sm:block">{horario}</span>
      <span className="flex items-center gap-[0.6em]">
        <span className="t-num font-display text-[1.6em] font-semibold tracking-[-0.04em]">{preco}</span>
        <ArrowUpRight className="size-[1.1em] text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
    </a>
  );
}
