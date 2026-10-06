import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Plane, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function Secao({ rotulo, titulo }) {
  return (
    <div className="mb-[1em] mt-[3em] flex flex-col gap-[0.5em]">
      <span className="t-label text-muted-foreground">{rotulo}</span>
      {titulo && <h2 className="t-h3">{titulo}</h2>}
    </div>
  );
}

export function Vazio({ titulo, texto, acao }) {
  return (
    <div className="entra mt-[3em] flex flex-col items-start gap-[0.75em] rounded-lg border border-dashed p-[2em]">
      <span className="flex size-[2.5em] items-center justify-center rounded-full bg-muted text-muted-foreground"><Plane className="size-[1.25em]" /></span>
      <h3 className="t-h3">{titulo}</h3>
      <p className="max-w-[48ch] text-muted-foreground">{texto}</p>
      {acao}
    </div>
  );
}

export function Linha({ href, indice, titulo, etiqueta, boa, sinal, detalhe, horario, preco, aria }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={aria}
      className="entra group grid min-h-[4.5em] grid-cols-[2em_1fr_auto] items-center gap-x-[1em] px-[1.25em] py-[1em] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:grid-cols-[2em_1fr_auto_auto]"
    >
      <span className="t-label t-num text-muted-foreground">{String(indice).padStart(2, "0")}</span>
      <span className="flex flex-col gap-[0.25em]">
        <span className="flex flex-wrap items-center gap-x-[0.5em] gap-y-[0.25em] text-[1.15em] font-medium tracking-[-0.02em]">
          {titulo}
          {etiqueta && (
            <Badge variant="secondary" className={cn("rounded-full text-[0.65em] font-medium", boa && "bg-good/12 text-good")}>{etiqueta}</Badge>
          )}
          {sinal && <Sinal {...sinal} />}
        </span>
        <span className="text-[0.85em] text-muted-foreground">{detalhe}<span className="sm:hidden"> · <span className="t-num">{horario}</span></span></span>
      </span>
      <span className="t-num hidden text-[0.9em] text-muted-foreground sm:block">{horario}</span>
      <span className="flex items-center gap-[0.5em]">
        <span className="t-num font-display text-[1.5em] font-semibold tracking-[-0.04em]">{preco}</span>
        <ArrowUpRight className="size-[1em] text-muted-foreground transition-colors group-hover:text-foreground" />
      </span>
    </a>
  );
}

export function Erro({ href }) {
  return (
    <div className="mt-[3em] flex flex-col items-start gap-[0.75em] rounded-lg border border-dashed p-[2em]" role="alert">
      <span className="flex size-[2.5em] items-center justify-center rounded-full bg-muted text-muted-foreground"><RefreshCw className="size-[1.25em]" /></span>
      <h3 className="t-h3">Não consegui ler as leituras</h3>
      <p className="max-w-[48ch] text-muted-foreground">O arquivo de preços não respondeu agora. Costuma voltar em um minuto.</p>
      <a className="flex min-h-[44px] items-center rounded-md border bg-card px-[1.25em] font-medium hover:bg-muted" href={href}>Tentar de novo</a>
    </div>
  );
}

export function Sinal({ tom, curto }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full text-[0.65em] font-medium",
        tom === "bom" && "bg-brand/12 text-brand",
        tom === "espera" && "bg-secondary text-foreground",
        tom === "neutro" && "bg-transparent text-muted-foreground border-border"
      )}
    >
      {curto}
    </Badge>
  );
}

/** Faixa com o preço visto no Aviasales. Link de afiliado, por isso rel="sponsored". */
export function OfertaAviasales({ href, preco, dia, companhia, diferenca, aria }) {
  const mais = diferenca < 0;
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={aria}
      className={cn("entra flex min-h-[44px] flex-wrap items-center gap-x-[0.75em] gap-y-[0.25em] px-[1.25em] py-[0.75em] text-[0.9em] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset", mais ? "bg-muted/40 hover:bg-muted/70" : "bg-brand/8 hover:bg-brand/14")}
    >
      <Tag className="size-[1em] text-brand" aria-hidden="true" />
      <span className="font-medium">Aviasales viu {preco}</span>
      <span className="text-muted-foreground">
        {dia}{companhia ? ` · ${companhia}` : ""}{diferenca ? ` · ${Math.abs(diferenca)}% ${mais ? "mais caro" : "mais barato"} que o Google` : ""}
      </span>
      <span className="ml-auto flex items-center gap-[0.25em] font-medium text-brand">Ver oferta <ArrowUpRight className="size-[1em]" aria-hidden="true" /></span>
    </a>
  );
}

export function AvisoAfiliado() {
  return (
    <p className="mt-[1em] max-w-[60ch] text-[0.85em] leading-[1.4] text-muted-foreground">
      Alguns links levam ao Aviasales, nosso parceiro: se você comprar por ele, podemos receber uma comissão, sem custo extra pra você. O preço do Aviasales é o menor visto nas últimas 48 h e pode ter mudado.
    </p>
  );
}
