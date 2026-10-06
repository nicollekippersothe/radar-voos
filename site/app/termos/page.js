export const metadata = { title: "Termos de uso", description: "Regras de uso do Radar de Voos." };

export default function Termos() {
  return (
    <article className="mx-auto max-w-[42em] space-y-[1.25em] leading-relaxed">
      <h1 className="font-display text-[2em] font-semibold tracking-[-0.03em]">Termos de uso</h1>
      <p>O Radar de Voos é um projeto pessoal e gratuito, oferecido como está. Ao usar o site, você concorda com o que segue.</p>
      <h2 className="font-display text-[1.25em] font-semibold">Informação, não oferta</h2>
      <p>
        Os preços mostrados foram lidos em fontes públicas num horário específico e podem mudar ou acabar a qualquer
        momento. O site não vende passagens nem garante preço, disponibilidade ou resultado das estimativas de queda.
        Confira sempre o valor final no site de quem vende.
      </p>
      <h2 className="font-display text-[1.25em] font-semibold">Links de afiliado</h2>
      <p>
        Alguns links levam um código de afiliado. Uma compra feita por eles pode render comissão ao projeto, sem custo
        adicional pra você. Esses links são identificados no site.
      </p>
      <h2 className="font-display text-[1.25em] font-semibold">Responsabilidade</h2>
      <p>
        O uso das informações é por sua conta. O projeto não responde por decisões de compra, diferenças de preço ou
        indisponibilidade do serviço.
      </p>
      <h2 className="font-display text-[1.25em] font-semibold">Mudanças</h2>
      <p>Estes termos podem ser atualizados. A versão em vigor é a publicada nesta página.</p>
      <p className="text-muted-foreground">{process.env.NEXT_PUBLIC_CONTATO ? <>Contato: <a className="underline" href={`mailto:${process.env.NEXT_PUBLIC_CONTATO}`}>{process.env.NEXT_PUBLIC_CONTATO}</a>.</> : null}</p>
    </article>
  );
}
