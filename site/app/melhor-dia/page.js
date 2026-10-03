import { leituras, nome } from "@/lib/dados";
import { modelo, veredito } from "@/lib/modelo";
import { Veredito } from "../veredito";
import { reais, intervalo, duracao, paradas, diaCurto, diaLongo, horaLeitura, hojeIso, linkGoogle } from "@/lib/formato";
import { FormDia } from "../filtros";
import { Vazio, Linha, Secao, Erro } from "../blocos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MelhorDia({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const destino = (sp.destino || "FLN").toUpperCase();
  const soDiretos = sp.diretos !== "0";
  const [{ voos, lidoEm, erro }, m] = await Promise.all([leituras(), modelo()]);

  const hoje = hojeIso();
  const doTrecho = voos.filter((v) => v.origem === origem && v.destino === destino && v.data_voo >= hoje && (!soDiretos || v.paradas === 0));
  const porDia = new Map();
  for (const v of doTrecho) {
    const atual = porDia.get(v.data_voo);
    if (!atual || v.preco < atual.preco) porDia.set(v.data_voo, v);
  }
  const dias = [...porDia.values()].sort((a, b) => a.data_voo.localeCompare(b.data_voo));
  const menor = dias.length ? Math.min(...dias.map((d) => d.preco)) : 0;
  const maior = dias.length ? Math.max(...dias.map((d) => d.preco)) : 1;
  const origens = [...new Set(voos.map((v) => v.origem))].sort();
  const destinos = [...new Set(voos.filter((v) => v.origem === origem).map((v) => v.destino))].sort();
  const diaSel = sp.dia || (dias.find((d) => d.preco === menor) || {}).data_voo;
  const todosDoDia = doTrecho.filter((v) => v.data_voo === diaSel).sort((a, b) => a.preco - b.preco);
  const mostrarTodos = sp.todos === "1";
  const voosDoDia = mostrarTodos ? todosDoDia : todosDoDia.slice(0, 10);
  const base = `?origem=${origem}&destino=${destino}&diretos=${soDiretos ? 1 : 0}`;
  const diaMaisBarato = dias.find((d) => d.preco === menor);

  return (
    <>
      <section className="mb-[2.5em] flex flex-col gap-[1em]">
        <span className="t-kicker text-brand">Viagens de última hora</span>
        <h1 className="t-display max-w-[10ch]">Qual dia é<br />mais barato?</h1>
        <p className="t-lead max-w-[42ch] text-muted-foreground">
          Menor preço por dia no trecho{lidoEm ? `, lido ${horaLeitura(lidoEm)}` : ""}. Os próximos 3 dias atualizam a cada 30 min; o resto, uma vez por dia.
        </p>
      </section>

      <FormDia
        origem={origem}
        origens={(origens.length ? origens : [origem]).map((o) => [o, nome(o)])}
        destino={destino}
        destinos={(destinos.length ? destinos : [destino]).map((d) => [d, nome(d)])}
        diretos={soDiretos}
      />

      {erro ? (
        <Erro href={base} />
      ) : dias.length === 0 ? (
        <Vazio
          titulo={`Sem leituras pra ${nome(origem)} → ${nome(destino)}`}
          texto="Esse trecho pode não estar na lista vigiada, ou o coletor ainda não passou por ele."
          acao={<Button variant="outline" size="lg" className="h-[44px] rounded-md text-[1em]" render={<a href="/" />}>Ver pra onde dá pra ir</Button>}
        />
      ) : (
        <>
          <div className="mt-[3em] grid gap-[1.5em] sm:grid-cols-[auto_1fr] sm:items-end">
            <div className="flex flex-col gap-[0.5em]">
              <span className="t-label text-muted-foreground">Mais barato</span>
              <span className="t-h1 t-num">{reais(menor)}</span>
              <span className="text-muted-foreground">{diaMaisBarato && diaLongo(diaMaisBarato.data_voo)} · {nome(origem)} → {nome(destino)}</span>
            </div>
          </div>

          <Secao rotulo={`${dias.length} dias com leitura`} />
          <ol className="entra flex flex-col gap-[0.25em] rounded-lg border bg-card p-[0.75em]">
            {dias.map((d) => {
              const sel = d.data_voo === diaSel;
              const top = d.preco === menor;
              return (
                <li key={d.data_voo}>
                  <a
                    href={`${base}&dia=${d.data_voo}`}
                    aria-current={sel ? "true" : undefined}
                    aria-label={`${diaLongo(d.data_voo)}, ${reais(d.preco)}${top ? ", o mais barato" : ""}`}
                    className={cn(
                      "grid min-h-[44px] grid-cols-[5.5em_1fr_auto] items-center gap-[1em] rounded-md px-[0.75em] py-[0.5em] transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      sel && "bg-muted"
                    )}
                  >
                    <span className={cn("text-[0.9em]", top ? "font-medium text-foreground" : "text-muted-foreground")}>{diaCurto(d.data_voo)}</span>
                    <span className="h-[0.75em] overflow-hidden rounded-sm bg-muted">
                      <i className={cn("block h-full rounded-sm", top ? "bg-brand" : "bg-foreground/70")} style={{ width: `${Math.max(4, (100 * d.preco) / maior)}%` }} />
                    </span>
                    <span className={cn("t-num font-display text-[1.1em] font-semibold tracking-[-0.03em]", top && "text-brand")}>{reais(d.preco)}{top && <span className="sr-only"> (mais barato)</span>}</span>
                  </a>
                </li>
              );
            })}
          </ol>

          {voosDoDia.length > 0 && (
            <>
              <Secao rotulo="Voos do dia" titulo={diaLongo(diaSel)} />
              <Veredito m={m} voo={voosDoDia[0]} />
              <div className="divide-y rounded-lg border bg-card">
                {voosDoDia.map((v, i) => (
                  <Linha
                    key={i}
                    href={linkGoogle(v.origem, v.destino, v.data_voo)}
                    indice={i + 1}
                    titulo={v.companhia}
                    etiqueta={v.paradas === 0 ? "direto" : paradas(v.paradas)}
                    boa={v.paradas === 0}
                    sinal={veredito(m, v)}
                    detalhe={duracao(v.duracao_min)}
                    horario={intervalo(v.h_saida, v.h_chegada)}
                    preco={reais(v.preco)}
                    aria={`${v.companhia}, ${intervalo(v.h_saida, v.h_chegada)}, ${paradas(v.paradas)}, ${reais(v.preco)}. Abre no Google Voos`}
                  />
                ))}
              </div>
              {todosDoDia.length > voosDoDia.length && (
                <div className="mt-[1em]">
                  <Button variant="outline" className="h-[44px] rounded-full px-[1em] text-[0.9em]" render={<a href={`${base}&dia=${diaSel}&todos=1`} />}>
                    Ver todos os {todosDoDia.length} voos
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

    </>
  );
}
