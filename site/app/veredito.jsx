import { veredito } from "@/lib/modelo";
import { reais } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Cartão com a resposta direta: compra agora ou dá pra esperar, e por quê. */
export function Veredito({ m, voo }) {
  if (!m || !voo) return null;
  const r = veredito(m, voo);
  if (!r) return null;
  const e = r.e;
  return (
    <div className={cn("mb-[1em] rounded-lg border p-[1.25em]", r.tom === "bom" ? "border-brand/40 bg-brand/5" : "bg-card")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-[1em] gap-y-[0.25em]">
        <span className="t-label text-muted-foreground">{voo.companhia} · {voo.h_saida} · {reais(voo.preco)}</span>
        <span className="t-label text-muted-foreground">base: {e.n} voos de {e.nivel}</span>
      </div>
      <p className="t-h3 mt-[0.5em]">{r.tom === "bom" ? "Compra agora." : r.tom === "espera" ? "Dá pra esperar." : "Não conte com queda."}</p>
      <p className="mt-[0.5em] max-w-[60ch] text-muted-foreground">{r.longo}</p>
    </div>
  );
}
