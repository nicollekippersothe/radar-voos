"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Datas em texto AAAA-MM-DD, sempre ao meio-dia UTC, pra nunca escorregar de dia por fuso.
const paraData = (iso) => new Date(iso + "T12:00:00Z");
const paraIso = (d) => d.toISOString().slice(0, 10);
const soma = (iso, n) => { const d = paraData(iso); d.setUTCDate(d.getUTCDate() + n); return paraIso(d); };
const fmt = (iso, opts) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", ...opts });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const curto = (iso) => fmt(iso, { day: "2-digit", month: "2-digit" });

const FOLGAS = [
  [0, "Só esse dia"],
  [1, "± 1 dia"],
  [2, "± 2 dias"],
  [3, "± 3 dias"],
];

function Calendario({ valor, folga, min, max, onEscolher, onFechar }) {
  const [mes, setMes] = useState((valor || min).slice(0, 7));
  const [foco, setFoco] = useState(valor || min);
  const grade = useRef(null);

  const primeiro = mes + "-01";
  const vazios = paraData(primeiro).getUTCDay();
  const diasNoMes = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
  const mesAnterior = soma(primeiro, -1).slice(0, 7);
  const mesSeguinte = soma(primeiro, diasNoMes).slice(0, 7);
  const podeVoltar = mesAnterior >= min.slice(0, 7);
  const podeAvancar = mesSeguinte <= max.slice(0, 7);

  const de = valor ? soma(valor, -folga) : null;
  const ate = valor ? soma(valor, folga) : null;

  // Seta move o foco; se sair do mês, vira o mês junto.
  function tecla(e) {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key === "Escape") { e.preventDefault(); onFechar(); return; }
    if (!(e.key in passos)) return;
    e.preventDefault();
    const alvo = soma(foco, passos[e.key]);
    if (alvo < min || alvo > max) return;
    setFoco(alvo);
    setMes(alvo.slice(0, 7));
  }

  useEffect(() => {
    grade.current?.querySelector('[tabindex="0"]')?.focus();
  }, [foco, mes]);

  return (
    <div role="dialog" aria-label="Escolher a data da viagem" className="absolute left-0 top-[calc(100%+0.5em)] z-30 w-[min(21.5em,calc(100vw-2.5em))] rounded-lg border bg-popover p-[0.75em] shadow-lg">
      <div className="mb-[0.5em] flex items-center justify-between">
        <button type="button" disabled={!podeVoltar} onClick={() => setMes(mesAnterior)} aria-label="Mês anterior" className="flex size-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronLeft className="size-[1.25em]" />
        </button>
        <span className="font-medium" aria-live="polite">{cap(fmt(primeiro, { month: "long", year: "numeric" }))}</span>
        <button type="button" disabled={!podeAvancar} onClick={() => setMes(mesSeguinte)} aria-label="Próximo mês" className="flex size-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronRight className="size-[1.25em]" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[0.75em] text-muted-foreground" aria-hidden="true">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((l, i) => <span key={i} className="py-[0.25em]">{l}</span>)}
      </div>
      <div ref={grade} role="group" aria-label={fmt(primeiro, { month: "long", year: "numeric" })} onKeyDown={tecla} className="grid grid-cols-7">
        {Array.from({ length: vazios }, (_, i) => <span key={"v" + i} />)}
        {dias.map((d) => {
          const fora = d < min || d > max;
          const sel = d === valor;
          const naJanela = de && d >= de && d <= ate && !sel;
          const focavel = d === foco || (!dias.includes(foco) && d === dias.find((x) => x >= min && x <= max));
          return (
            <button
              key={d} type="button" disabled={fora} tabIndex={focavel ? 0 : -1}
              aria-pressed={sel} aria-label={fmt(d, { weekday: "long", day: "numeric", month: "long" })}
              onClick={() => onEscolher(d)}
              className={cn(
                "t-num flex h-[44px] items-center justify-center text-[0.95em] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:z-10",
                "rounded-md",
                fora && "text-muted-foreground/40",
                !fora && !sel && !naJanela && "hover:bg-muted",
                naJanela && "rounded-none bg-brand/12 text-foreground",
                naJanela && d === de && "rounded-l-md",
                naJanela && d === ate && "rounded-r-md",
                sel && "bg-brand font-semibold text-brand-foreground"
              )}
            >{d.slice(8).replace(/^0/, "")}</button>
          );
        })}
      </div>
      <p className="mt-[0.5em] px-[0.25em] text-[0.8em] text-muted-foreground">Lemos preços até {curto(max)}.</p>
    </div>
  );
}

/** Data da viagem (calendário) + folga em dias (botões). Envia `data` e `folga` no formulário. */
export function DataFolga({ data = "", folga = 1, minData, maxData = soma(minData, 90), obrigatoria = false, rotuloData = "Quero ir em", rotuloFolga = "Posso mexer na data", folgas = FOLGAS }) {
  const [valor, setValor] = useState(data);
  const [f, setF] = useState(folga);
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const fechar = () => { setAberto(false); botao.current?.focus(); };
  const de = valor ? soma(valor, -f) : null;
  const ate = valor ? soma(valor, f) : null;
  const resumo = useMemo(() => {
    if (!valor) return "Escolha a data pra ver quanto muda se você mexer nela.";
    if (f === 0) return "Só esse dia, sem comparar com os vizinhos.";
    const deReal = de < minData ? minData : de;
    return `Mostramos voos de ${curto(deReal)} a ${curto(ate)}. Os dias a mais ou a menos entram na comparação.`;
  }, [valor, f, de, ate, minData]);

  return (
    <div className="col-span-2 flex flex-col gap-[1em] sm:col-span-full lg:flex-row lg:items-start lg:gap-[1.5em]">
      <div ref={raiz} className="relative flex flex-col gap-[0.5em]">
        <span className="t-label text-muted-foreground" id={id + "-d"}>{rotuloData}</span>
        <button
          ref={botao} type="button" aria-haspopup="dialog" aria-expanded={aberto} aria-labelledby={id + "-d " + id + "-v"}
          onClick={() => setAberto((a) => !a)}
          className="flex h-[44px] min-w-[15em] items-center gap-[0.75em] rounded-md border bg-card px-[1em] text-left text-[1em] hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CalendarDays className="size-[1.1em] shrink-0 text-muted-foreground" aria-hidden="true" />
          <span id={id + "-v"} className={cn("flex-1", !valor && "text-muted-foreground")}>
            {valor ? cap(fmt(valor, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")) : "Escolher data"}
          </span>
        </button>
        {obrigatoria && <input tabIndex={-1} aria-hidden="true" required value={valor} onChange={() => {}} className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0" />}
        <input type="hidden" name="data" value={valor} disabled={!valor} />
        {aberto && (
          <Calendario
            valor={valor} folga={f} min={minData} max={maxData}
            onEscolher={(d) => { setValor(d); fechar(); }}
            onFechar={fechar}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[0.5em]">
        <span className="t-label text-muted-foreground" id={id + "-f"}>{rotuloFolga}</span>
        <div role="radiogroup" aria-labelledby={id + "-f"} className="flex w-full flex-wrap gap-0.5 rounded-lg bg-muted p-0.5 sm:w-fit sm:flex-nowrap">
          {folgas.map(([n, r]) => (
            <button
              key={n} type="button" role="radio" aria-checked={f === n} onClick={() => setF(n)}
              className={cn(
                "min-h-[44px] flex-1 whitespace-nowrap rounded-md px-[0.9em] text-[0.9em] font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-none",
                f === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >{r}</button>
          ))}
        </div>
        <input type="hidden" name="folga" value={f} />
        <p className="max-w-[46ch] text-[0.85em] text-muted-foreground" aria-live="polite">{resumo}</p>
      </div>
    </div>
  );
}
