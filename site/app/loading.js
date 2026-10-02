// Esqueleto com a mesma forma da página, pra não pular o layout enquanto os dados chegam.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando leituras">
      <div className="mb-[2.5em] flex flex-col gap-[1em]">
        <div className="h-[1.5em] w-[14em] rounded-sm bg-muted" />
        <div className="h-[6em] w-[16em] rounded-sm bg-muted" />
        <div className="h-[2.5em] w-[28em] max-w-full rounded-sm bg-muted" />
      </div>
      <div className="h-[8em] rounded-lg border bg-card/60" />
      <div className="mt-[3em] divide-y rounded-lg border bg-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-[4.5em] items-center gap-[1em] px-[1.25em]">
            <div className="h-[1em] w-[2em] rounded-sm bg-muted" />
            <div className="flex flex-1 flex-col gap-[0.5em]"><div className="h-[1.1em] w-[9em] rounded-sm bg-muted" /><div className="h-[0.85em] w-[14em] rounded-sm bg-muted" /></div>
            <div className="h-[1.5em] w-[5em] rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
