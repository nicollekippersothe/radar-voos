"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopiarPix({ texto }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="flex min-h-[44px] items-center gap-[0.5em] rounded-md border bg-card px-[1.25em] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {ok ? <Check className="size-[1em]" aria-hidden="true" /> : <Copy className="size-[1em]" aria-hidden="true" />}
      {ok ? "Copiado" : "Copiar Pix"}
    </button>
  );
}
