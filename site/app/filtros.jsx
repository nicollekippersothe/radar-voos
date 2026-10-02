"use client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

function Campo({ rotulo, children }) {
  return (
    <div className="flex flex-col gap-[0.5em]">
      <span className="t-label text-muted-foreground">{rotulo}</span>
      {children}
    </div>
  );
}

function Escolha({ name, valor, opcoes, rotuloAria }) {
  return (
    <Select name={name} defaultValue={valor} items={opcoes.map(([v, r]) => ({ value: v, label: r }))}>
      <SelectTrigger aria-label={rotuloAria} className="h-[2.75em] w-full min-w-[9em] rounded-md px-[0.9em] text-[1em] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map(([v, r]) => (
          <SelectItem key={v} value={v}>{r}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FormHome({ origem, origens, valor, dias, janelas }) {
  return (
    <form method="get" className="grid grid-cols-1 gap-[1em] rounded-xl border bg-card/60 p-[1.25em] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <Campo rotulo="Saindo de">
        <Escolha name="origem" valor={origem} opcoes={origens} rotuloAria="Origem" />
      </Campo>
      <Campo rotulo="Com até">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-[0.9em] flex items-center text-muted-foreground">R$</span>
          <Input
            type="number" name="valor" defaultValue={valor} min="100" step="50" inputMode="numeric"
            aria-label="Valor máximo em reais"
            className="h-[2.75em] rounded-md bg-card pl-[2.6em] text-[1em] t-num"
          />
        </div>
      </Campo>
      <Campo rotulo="Nos próximos">
        <Escolha name="dias" valor={String(dias)} opcoes={janelas} rotuloAria="Janela de dias" />
      </Campo>
      <Button type="submit" size="lg" className="h-[2.75em] rounded-md bg-brand px-[1.4em] text-[1em] text-brand-foreground hover:bg-brand/90">
        Ver opções <ArrowRight data-icon="inline-end" />
      </Button>
    </form>
  );
}

export function FormDia({ origem, origens, destino, destinos, diretos }) {
  return (
    <form method="get" className="grid grid-cols-1 gap-[1em] rounded-xl border bg-card/60 p-[1.25em] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <Campo rotulo="De">
        <Escolha name="origem" valor={origem} opcoes={origens} rotuloAria="Origem" />
      </Campo>
      <Campo rotulo="Pra">
        <Escolha name="destino" valor={destino} opcoes={destinos} rotuloAria="Destino" />
      </Campo>
      <Campo rotulo="Voos">
        <Escolha name="diretos" valor={diretos ? "1" : "0"} opcoes={[["1", "Só diretos"], ["0", "Com paradas também"]]} rotuloAria="Tipo de voo" />
      </Campo>
      <Button type="submit" size="lg" className="h-[2.75em] rounded-md bg-brand px-[1.4em] text-[1em] text-brand-foreground hover:bg-brand/90">
        Comparar <ArrowRight data-icon="inline-end" />
      </Button>
    </form>
  );
}
