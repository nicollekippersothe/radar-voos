"use client";

export default function Erro({ reset }) {
  return (
    <div className="mt-[3em] flex flex-col items-start gap-[0.75em] rounded-lg border border-dashed p-[2em]" role="alert">
      <h1 className="t-h3">Algo saiu do esperado</h1>
      <p className="max-w-[48ch] text-muted-foreground">Não consegui montar essa tela agora. Costuma voltar em um minuto, e os preços não foram perdidos.</p>
      <button type="button" onClick={reset} className="flex min-h-[44px] items-center rounded-md border bg-card px-[1.25em] font-medium hover:bg-muted">Tentar de novo</button>
    </div>
  );
}
