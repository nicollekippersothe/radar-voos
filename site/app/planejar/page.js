import { nome, CIDADES } from "@/lib/dados";
import { dadosDia } from "@/lib/fonte";
import { modelo, curvaRota } from "@/lib/modelo";
import { reais, diaCurto, diaLongo, lidoCurto, lidoVoo, linkGoogle, hojeIso } from "@/lib/formato";
import { FormPlanejar } from "../filtros";
import { Compra } from "../compra";
import { Horas } from "../horas";
import { Vazio, Secao, Erro } from "../blocos";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function cidades(vigiadas, atual) {
  const ja = new Set([...vigiadas, atual]);
  const outras = Object.keys(CIDADES).filter((c) => !ja.has(c));
  return [...ja, ...outras].sort((a, b) => nome(a).localeCompare(nome(b), "pt-BR")).map((c) => [c, nome(c)]);
}

export const metadata = { title: "Meu orçamento", description: "Escolha o destino e quanto pode gastar. O Radar mostra os dias que cabem e quando comprar." };

export default async function Planejar({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "FLN").toUpperCase();
  const destino = (sp.destino || "SSA").toUpperCase();
  const valor = Math.max(100, Number(sp.valor || 500));
  const [{ dias, origens, destinos, lidoEm, erro }, m] = await Promise.all([
    dadosDia({ origem, destino, soDiretos: false, dia: undefined }),
    modelo(),
  ]);
  const hoje = hojeIso();
  const futuros = dias.filter((d) => d.data_voo >= hoje);
  const cabem = futuros.filter((d) => d.preco <= valor);
  const menor = futuros.length ? futuros.reduce((a, b) => (b.preco < a.preco ? b : a)) : null;
  const melhor = cabem.length ? cabem.reduce((a, b) => (b.preco < a.preco ? b : a)) : menor;
  const rotaNome = `${nome(origem)} → ${nome(destino)}`;
  const curva = curvaRota(m, origem, destino);

  return (
    <>
      <section className="mb-[2.5em] flex flex-col gap-[1em]">
        <span className="t-kicker text-brand">Sem data definida</span>
        <h1 className="t-display max-w-[10ch]">Quando dá pra ir?</h1>
        <p className="t-lead max-w-[44ch] text-muted-foreground">
          Escolha o destino e quanto pode gastar. O Radar mostra os dias em que a passagem cabe no orçamento e quando vale comprar{lidoEm ? `, com leitura ${lidoCurto(lidoEm).replace("lido ", "de ")}` : ""}.
        </p>
      </section>

      <FormPlanejar origem={origem} origens={cidades(origens, origem)} destino={destino} destinos={cidades(destinos, destino)} valor={valor} />

      {erro ? (
        <Erro href={`?origem=${origem}&destino=${destino}&valor=${valor}`} />
      ) : futuros.length === 0 ? (
        <Vazio
          titulo={`Sem leituras pra ${rotaNome}`}
          texto="Esse trecho ainda não é vigiado. Abra a aba Melhor dia com esse trecho: isso entra na fila de leitura e a resposta chega na próxima rodada."
          acao={<a className="flex min-h-[44px] items-center rounded-md border bg-card px-[1.25em] font-medium hover:bg-muted" href={`/melhor-dia?origem=${origem}&destino=${destino}`}>Pedir esse trecho</a>}
        />
      ) : (
        <>
          <div className="mt-[3em] rounded-lg border border-brand/40 bg-brand/5 p-[1.25em]">
            {cabem.length > 0 ? (
              <>
                <p className="t-h3">{cabem.length === 1 ? "1 dia cabe" : `${cabem.length} dias cabem`} em {reais(valor)}.</p>
                <p className="mt-[0.5em] max-w-[62ch] text-muted-foreground">
                  O mais barato é {diaLongo(melhor.data_voo)}, por {reais(melhor.preco)}. {rotaNome}, de ida.
                </p>
              </>
            ) : (
              <>
                <p className="t-h3">Nenhum dia cabe em {reais(valor)} agora.</p>
                <p className="mt-[0.5em] max-w-[62ch] text-muted-foreground">
                  O menor preço lido é {reais(menor.preco)}, em {diaLongo(menor.data_voo)} ({rotaNome}). Faltam {reais(menor.preco - valor)} pro seu orçamento. Vale deixar o alerta ligado e voltar aqui.
                </p>
              </>
            )}
          </div>

          <Secao rotulo={`${futuros.length} dias com leitura`} titulo={cabem.length ? "Dias que cabem" : "Os dias mais baratos"} />
          <p className="-mt-[0.5em] mb-[1em] max-w-[62ch] text-[0.9em] text-muted-foreground">
            Preço de ida, com ou sem parada, lido no Google Voos. Você compra agora, o voo sai na data da linha. Os próximos 3 dias atualizam a cada 30 minutos. Dias mais distantes são lidos uma vez por dia, então o preço pode estar defasado até 24 horas. Confira ao abrir.
          </p>
          <ol className="entra flex flex-col gap-[0.25em] rounded-lg border bg-card p-[0.75em]">
            {(cabem.length ? cabem : [...futuros].sort((a, b) => a.preco - b.preco).slice(0, 5))
              .sort((a, b) => a.data_voo.localeCompare(b.data_voo))
              .map((d) => {
                const top = melhor && d.data_voo === melhor.data_voo;
                return (
                  <li key={d.data_voo} className="flex items-center gap-[0.25em]">
                    <a
                      href={`/melhor-dia?origem=${origem}&destino=${destino}&dia=${d.data_voo}`}
                      className={cn("grid min-h-[44px] flex-1 grid-cols-[1fr_auto] items-center gap-[1em] rounded-md px-[0.75em] py-[0.5em] transition-colors hover:bg-muted/70", top && "bg-muted")}
                    >
                      <span className={cn("text-[0.95em]", top && "font-medium")}>{diaCurto(d.data_voo)}</span>
                      <span className="flex items-baseline gap-[0.75em]">
                        <span className="hidden text-[0.8em] text-muted-foreground sm:inline">{lidoVoo(d, lidoEm)}</span>
                        <span className={cn("t-num font-display text-[1.2em] font-semibold tracking-[-0.03em]", top && "text-brand")}>{reais(d.preco)}</span>
                      </span>
                    </a>
                    <a
                      href={linkGoogle(origem, destino, d.data_voo)}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Comprar ${diaCurto(d.data_voo)} no Google Voos`}
                      className="flex min-h-[44px] shrink-0 items-center gap-[0.25em] rounded-md px-[0.75em] text-[0.85em] font-medium text-brand hover:bg-muted/70"
                    >
                      Comprar <ArrowUpRight className="size-[1em]" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
          </ol>

          {melhor && <Compra curva={curva} dataVoo={melhor.data_voo} hoje={hoje} rotaNome={rotaNome} />}
          <Horas m={m} origem={origem} destino={destino} rotaNome={rotaNome} />

          <p className="mt-[3em] max-w-[62ch] text-[0.85em] leading-[1.4] text-muted-foreground">
            O que o Radar aprendeu vem de {m?.desde ? `leituras desde ${diaCurto(m.desde)}` : "poucos dias de leitura"}, então as médias ainda são fracas e ficam melhores a cada semana. Preço lido em buscador público pode mudar até você abrir o link.
          </p>
        </>
      )}
    </>
  );
}
