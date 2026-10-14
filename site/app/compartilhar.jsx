"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";

/** Compartilha a busca atual: folha nativa no celular, cópia do link no computador. */
export function Compartilhar({ titulo = "Radar de Voos" }) {
  const [copiado, setCopiado] = useState(false);
  async function acionar() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: titulo, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* a pessoa fechou a folha de compartilhar */ }
  }
  return (
    <button
      type="button"
      onClick={acionar}
      className="inline-flex min-h-[44px] items-center gap-[0.5em] self-start rounded-full border bg-card px-[1em] text-[0.9em] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {copiado ? <Check className="size-[1em]" aria-hidden="true" /> : <Share2 className="size-[1em]" aria-hidden="true" />}
      <span aria-live="polite">{copiado ? "Link copiado" : "Compartilhar esta busca"}</span>
    </button>
  );
}
