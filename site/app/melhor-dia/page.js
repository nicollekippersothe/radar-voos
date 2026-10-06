import { nome, CIDADES } from "@/lib/dados";
import { dadosDia, referencias, pedirTrecho } from "@/lib/fonte";
import { modelo, veredito } from "@/lib/modelo";
import { Veredito } from "../veredito";
import { reais, intervalo, duracao, paradas, diaCurto, diaLongo, horaLeitura, linkGoogle } from "@/lib/formato";
import { FormDia } from "../filtros";
import { Atualizar } from "../atualizar";
import { temApi } from "@/lib/api";
import { Vazio, Linha, Secao, Erro, OfertaAviasales, AvisoAfiliado } from "../blocos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Lista as cidades já vigiadas primeiro e depois as outras, pra dar pra pedir qualquer trecho.
function todasAsCidades(vigiadas, atual) {
  const ja = new Set([...vigiadas, atual]);
  const outras = Object.keys(CIDADES).filter((c) => !ja.has(c)).sort((a, b) => nome(a).localeCompare(nome(b), "pt-BR"));
  return [...[...ja].sort((a, b) => nome(a).localeCompare(nome(b), "pt-BR")), ...outras].map((c) => [c, nome(c)]);
}

const AVISO_PEDIDO = {
  na_fila: ["Entrou na fila", "Esse trecho ainda não era vigiado. Já pedimos pro coletor: a primeira leitura chega na próxima rodada, em até 30 minutos. Volte aqui depois."],
  vigiado: ["Já estamos lendo esse trecho", "A primeira leitura está a caminho. Atualize em alguns minutos."],
  cheio: ["A fila de novos trechos está cheia", "Estamos no limite de trechos novos por enquanto. Tente de novo amanhã ou escolha um trecho que já aparece na lista."],
};

export default async function MelhorDia({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const destino = (sp.destino || "FLN").toUpperCase();
  const soDiretos = sp.diretos !== "0";
  const [{ dias, diaSel, todosDoDia, origens, destinos, lidoEm, erro }, m] = await Promise.all([
    dadosDia({ origem, destino, soDiretos, dia: sp.dia }),
    modelo(),
  ]);
  const refs = await referencias(origem, destino);
  const pedido = !erro && dias.length === 0 && origem !== destino ? await pedirTrecho(origem, destino) : null;
  const refDia = refs.find((x) => x.data_voo === diaSel);
  const menor = dias.length ? Math.min(...dias.map((d) => d.preco)) : 0;
  const maior = dias.length ? Math.max(...dias.map((d) => d.preco)) : 1;
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
        origens={todasAsCidades(origens, origem)}
        destino={destino}
        destinos={todasAsCidades(destinos, destino)}
        diretos={soDiretos}
      />

      {!erro && temApi() && origem !== destino && <Atualizar origem={origem} destino={destino} />}

      {erro ? (
        <Erro href={base} />
      ) : dias.length === 0 ? (
        <Vazio
          titulo={AVISO_PEDIDO[pedido] ? `${nome(origem)} → ${nome(destino)}: ${AVISO_PEDIDO[pedido][0].toLowerCase()}` : `Sem leituras pra ${nome(origem)} → ${nome(destino)}`}
          texto={AVISO_PEDIDO[pedido] ? AVISO_PEDIDO[pedido][1] : "Esse trecho pode não estar na lista vigiada, ou o coletor ainda não passou por ele."}
          acao={<Button variant="outline" size="lg" className="h-[44px] rounded-md text-[1em]" nativeButton={false} render={<a href="/" />}>Ver pra onde dá pra ir</Button>}
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
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {refDia && (
                  <OfertaAviasales
                    href={refDia.link}
                    preco={reais(refDia.referencia)}
                    dia={diaCurto(refDia.data_voo)}
                    companhia={refDia.companhia}
                    diferenca={voosDoDia[0] ? Math.round((100 * (voosDoDia[0].preco - refDia.referencia)) / voosDoDia[0].preco) : 0}
                    aria={`Aviasales viu ${reais(refDia.referencia)} em ${diaCurto(refDia.data_voo)}. Abre o Aviasales`}
                  />
                )}
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
                  <Button variant="outline" className="h-[44px] rounded-full px-[1em] text-[0.9em]" nativeButton={false} render={<a href={`${base}&dia=${diaSel}&todos=1`} />}>
                    Ver todos os {todosDoDia.length} voos
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {refs.length > 0 && <AvisoAfiliado />}
    </>
  );
}
