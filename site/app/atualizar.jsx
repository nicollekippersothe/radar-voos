"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const TEXTOS = {
  disparado: "Buscando os preços mais recentes desse trecho. A lista atualiza sozinha em cerca de 1 minuto.",
  ocupado: "Muitas atualizações ao mesmo tempo. Os preços abaixo têm até 30 minutos.",
};

/** Ao abrir o trecho, pede uma leitura nova (o Worker limita e decide se precisa). */
export function Atualizar({ origem, destino }) {
  const [estado, setEstado] = useState(null);
  const router = useRouter();
  useEffect(() => {
    let vivo = true;
    let t;
    fetch(`/api/atualizar?origem=${origem}&destino=${destino}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        setEstado(j.status);
        if (j.status === "disparado") t = setTimeout(() => router.refresh(), 60000);
      })
      .catch(() => {});
    return () => { vivo = false; clearTimeout(t); };
  }, [origem, destino, router]);
  if (!TEXTOS[estado]) return null;
  return (
    <p role="status" className="mt-[1em] flex items-center gap-[0.5em] text-[0.9em] text-muted-foreground">
      <RefreshCw className="size-[1em]" aria-hidden="true" /> {TEXTOS[estado]}
    </p>
  );
}
