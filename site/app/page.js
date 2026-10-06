import { nome } from "@/lib/dados";
import { dadosHome, referencias, melhorReferencia } from "@/lib/fonte";
import { modelo, veredito } from "@/lib/modelo";
import { reais, intervalo, duracao, paradas, diaCurto, horaLeitura, linkGoogle, hojeIso, somaDias } from "@/lib/formato";
import { oportunidades } from "@/lib/oportunidades";
import { FormHome } from "./filtros";
import { Vazio, Linha, Secao, Erro, OfertaAviasales, AvisoAfiliado } from "./blocos";
import { Fragment } from "react";
import { BlocoApoio } from "./apoio";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

const JANELAS = [
  ["0", "Hoje"],
  ["1", "Até amanhã"],
  ["3", "3 dias"],
  ["7", "7 dias"],
  ["14", "14 dias"],
  ["30", "30 dias"],
];

function Achado({ o, i }) {
  const queda = o.base && o.preco < o.base ? Math.round(100 * (1 - o.preco / o.base)) : 0;
  const etiqueta = o.tipo === "queda" && queda ? `${queda}% abaixo do que estava` : "bem abaixo do normal da rota";
  const quando = o.horas_ate_saida < 1 ? "sai em menos de 1 h" : `sai em ${Math.round(o.horas_ate_saida)} h`;
  return (
    <Linha
      href={linkGoogle(o.origem, o.destino, o.data)}
      indice={i + 1}
      titulo={nome(o.destino)}
      etiqueta={etiqueta}
      boa
      detalhe={`${diaCurto(o.data)} · ${o.companhia} · ${quando}`}
      horario={o.chegada ? intervalo(o.saida, o.chegada) : o.saida}
      preco={reais(o.preco)}
      aria={`${nome(o.destino)}, ${reais(o.preco)}, ${etiqueta}, ${quando}. Abre no Google Voos`}
    />
  );
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const origem = (sp.origem || "SAO").toUpperCase();
  const valor = Number(sp.valor || 500);
  const dias = Number(sp.dias || 3);
  const [{ lista, origens, lidoEm, erro, semLeituras }, m, ops] = await Promise.all([dadosHome({ origem, valor, dias }), modelo(), oportunidades()]);
  const achados = ops.lista.filter((o) => o.origem === origem);
  const achadosOutros = ops.lista.filter((o) => o.origem !== origem).slice(0, 3);
  const hoje = hojeIso();
  const limite = somaDias(hoje, dias);
  const refsPorDestino = new Map(await Promise.all(lista.map(async (v) => [v.destino, await referencias(origem, v.destino)])));
  const opcoesOrigem = (origens.length ? origens : [origem]).map((o) => [o, nome(o)]);
  const sugestao = Math.round((valor * 1.5) / 50) * 50;

  return (
    <>
      <section className="mb-[2.5em] flex flex-col gap-[1em]">
        <span className="t-kicker text-brand">Viagens de última hora</span>
        <h1 className="t-display max-w-[10ch]">Pra onde<br />dá pra ir?</h1>
        <p className="t-lead max-w-[42ch] text-muted-foreground">
          Diga quanto tem e quando quer sair. A lista mostra o destino mais barato de cada cidade, só de ida{lidoEm ? `, lido no Google Voos ${horaLeitura(lidoEm)}` : ""}.
        </p>
      </section>

      <FormHome origem={origem} origens={opcoesOrigem} valor={valor} dias={dias} janelas={JANELAS} />

      {!erro && (
        <>
          <Secao rotulo="Fora do normal agora" titulo={`Saindo de ${nome(origem)}`} />
          {achados.length > 0 ? (
            <div className="divide-y rounded-lg border bg-card">
              {achados.map((o, i) => <Achado key={o.id} o={o} i={i} />)}
            </div>
          ) : (
            <p className="max-w-[60ch] text-muted-foreground">
              Nenhum voo de {nome(origem)} está muito abaixo do normal nas próximas 24 h.
              {achadosOutros.length > 0 && " Em outras cidades: " + achadosOutros.map((o) => `${nome(o.origem)} → ${nome(o.destino)} por ${reais(o.preco)}`).join(", ") + "."}
            </p>
          )}
        </>
      )}

      {erro ? (
        <Erro href={`/?origem=${origem}&valor=${valor}&dias=${dias}`} />
      ) : lista.length === 0 ? (
        <Vazio
          titulo={semLeituras ? "Ainda sem leituras" : `Nada por até ${reais(valor)}`}
          texto={semLeituras
            ? "O coletor grava a primeira leitura assim que começar a rodar. Volte em alguns minutos."
            : `Saindo de ${nome(origem)} nesse período, nenhum voo coube no valor. Tente um valor maior ou uma janela mais longa.`}
          acao={!semLeituras && (
            <Button variant="outline" size="lg" className="h-[44px] rounded-md text-[1em]" nativeButton={false} render={<a href={`/?origem=${origem}&valor=${sugestao}&dias=${Math.max(dias, 7)}`} />}>
              Tentar com {reais(sugestao)} em 7 dias
            </Button>
          )}
        />
      ) : (
        <>
          <Secao
            rotulo={`${lista.length === 1 ? "1 destino" : `${lista.length} destinos`} por até ${reais(valor)}`}
            titulo={`Saindo de ${nome(origem)}`}
          />
          <div className="divide-y rounded-lg border bg-card">
            {lista.map((v, i) => {
              const ref = melhorReferencia(refsPorDestino.get(v.destino) || [], { hoje, limite, valor, precoGoogle: v.preco });
              return (
              <Fragment key={v.destino}>
              <Linha
                href={linkGoogle(v.origem, v.destino, v.data_voo)}
                indice={i + 1}
                titulo={nome(v.destino)}
                etiqueta={v.paradas === 0 ? "direto" : paradas(v.paradas)}
                boa={v.paradas === 0}
                sinal={(() => { const r = veredito(m, v); return r && r.tom === "bom" ? r : null; })()}
                detalhe={`${diaCurto(v.data_voo)} · ${v.companhia} · ${duracao(v.duracao_min)}`}
                horario={intervalo(v.h_saida, v.h_chegada)}
                preco={reais(v.preco)}
                aria={`${nome(v.destino)}, ${reais(v.preco)}, ${diaCurto(v.data_voo)}, ${v.companhia}, ${paradas(v.paradas)}. Abre no Google Voos`}
              />
              {ref && (
                <OfertaAviasales
                  href={ref.link}
                  preco={reais(ref.referencia)}
                  dia={diaCurto(ref.data_voo)}
                  companhia={ref.companhia}
                  diferenca={Math.round((100 * (v.preco - ref.referencia)) / v.preco)}
                  aria={`Aviasales viu ${reais(ref.referencia)} para ${nome(v.destino)} em ${diaCurto(ref.data_voo)}. Abre o Aviasales`}
                />
              )}
              </Fragment>
              );
            })}
          </div>
          <p className="mt-[1.5em] max-w-[60ch] text-[0.95em] text-muted-foreground">
            Quer um trecho específico, como {nome(origem)} → Curitiba? Escolha o destino na aba{" "}
            <a className="font-medium text-foreground underline underline-offset-4" href={`/melhor-dia?origem=${origem}`}>Melhor dia</a>.
          </p>
          <div className="mt-[1em] flex flex-wrap gap-[0.5em]">
            {lista.slice(0, 3).map((v) => (
              <Button key={v.destino} variant="outline" className="h-[44px] rounded-full px-[1em] text-[0.9em]" nativeButton={false} render={<a href={`/melhor-dia?origem=${v.origem}&destino=${v.destino}`} />}>
                <CalendarDays data-icon="inline-start" /> Vale esperar? {nome(v.destino)}
              </Button>
            ))}
          </div>
        </>
      )}

      <p className="mt-[3em] max-w-[60ch] text-[0.85em] leading-[1.4] text-muted-foreground">
        Os preços mudam a qualquer momento. Cada linha abre o Google Voos no trecho e na data pra você conferir antes de comprar.
      </p>
      <AvisoAfiliado />
      <BlocoApoio />
    </>
  );
}
