import { reais } from "@/lib/formato";
import { configApoio, pixPayload, pixQrSvg, resumoOportunidades, apoiadores } from "@/lib/apoio";
import { CopiarPix } from "./copiar";
import { Secao } from "./blocos";
import { ArrowUpRight, Heart } from "lucide-react";

function Meta({ custo, arrecadado }) {
  if (!(custo > 0)) return null;
  const pct = Math.min(100, Math.round((100 * arrecadado) / custo));
  return (
    <div className="flex max-w-[28em] flex-col gap-[0.5em]">
      <div className="flex items-baseline justify-between text-[0.9em]">
        <span className="text-muted-foreground">Custo do mês: {reais(custo)}</span>
        <span className="t-num font-medium">{reais(arrecadado)} cobertos</span>
      </div>
      <div className="h-[0.6em] overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Quanto do custo do mês já foi coberto">
        <i className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Contador({ r }) {
  if (!r || r.total === 0) return null;
  return (
    <p className="max-w-[48ch] text-[1.05em]">
      Nos últimos 7 dias o radar achou <b className="t-num">{r.total}</b> {r.total === 1 ? "passagem" : "passagens"} abaixo do preço normal da rota,
      somando <b className="t-num">{reais(r.abaixo)}</b> de diferença. É a soma do que cada uma custava a menos que a mediana do trecho, não o que alguém economizou.
    </p>
  );
}

/** Bloco de apoio. `completo` mostra o QR e o mural; sem isso, só o convite e o link pra página. */
export async function BlocoApoio({ completo = false }) {
  const cfg = configApoio();
  if (!cfg.ativo) return null;
  const resumo = await resumoOportunidades();
  if (!completo) {
    return (
      <section className="mt-[3em] flex flex-col items-start gap-[1em] rounded-lg border bg-card p-[1.5em]">
        <span className="flex items-center gap-[0.5em] t-label text-brand"><Heart className="size-[1em]" aria-hidden="true" /> Apoie o radar</span>
        <Contador r={resumo} />
        <p className="max-w-[48ch] text-muted-foreground">Sem anúncio no meio dos preços e sem plano pago. Se o radar te ajudou a achar uma passagem, uma ajuda de qualquer valor mantém ele no ar.</p>
        <Meta custo={cfg.custo} arrecadado={cfg.arrecadado} />
        <a href="/apoie" className="flex min-h-[44px] items-center gap-[0.5em] rounded-md bg-primary px-[1.25em] font-medium text-primary-foreground hover:opacity-90">
          Quero ajudar <ArrowUpRight className="size-[1em]" aria-hidden="true" />
        </a>
      </section>
    );
  }
  const payload = cfg.chave ? pixPayload(cfg) : "";
  const [svg, nomes] = await Promise.all([payload ? pixQrSvg(payload) : "", apoiadores()]);
  return (
    <>
      <Contador r={resumo} />
      <Meta custo={cfg.custo} arrecadado={cfg.arrecadado} />
      {payload && (
        <>
          <Secao rotulo="Pix" titulo="Escolha o valor no seu banco" />
          <div className="flex flex-wrap items-start gap-[2em]">
            <div className="size-[13em] rounded-lg border bg-white p-[0.5em] [&>svg]:size-full" role="img" aria-label="QR code do Pix" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="flex max-w-[30em] flex-col gap-[1em]">
              <p className="text-muted-foreground">Aponte a câmera do app do banco pro QR code, ou copie o código e use Pix copia e cola. O valor é livre.</p>
              <CopiarPix texto={payload} />
            </div>
          </div>
        </>
      )}
      {cfg.apoiaUrl && (
        <>
          <Secao rotulo="Todo mês" titulo="Prefere apoiar de forma recorrente?" />
          <a href={cfg.apoiaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-[0.5em] rounded-md border bg-card px-[1.25em] font-medium hover:bg-muted">
            Apoiar todo mês <ArrowUpRight className="size-[1em]" aria-hidden="true" />
          </a>
        </>
      )}
      {nomes.length > 0 && (
        <>
          <Secao rotulo="Mural" titulo="Quem mantém o radar no ar" />
          <ul className="flex flex-wrap gap-[0.5em]">
            {nomes.map((n) => <li key={n} className="rounded-full border bg-card px-[1em] py-[0.4em] text-[0.95em]">{n}</li>)}
          </ul>
        </>
      )}
    </>
  );
}
