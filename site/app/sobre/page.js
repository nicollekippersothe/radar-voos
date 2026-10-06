export const metadata = {
  title: "Sobre o projeto",
  description: "Como o Radar de Voos lê os preços, de onde vêm os dados e o que ele não faz.",
};

export default function Sobre() {
  return (
    <article className="prose-radar mx-auto max-w-[42em] space-y-[1.25em] leading-relaxed">
      <h1 className="font-display text-[2em] font-semibold tracking-[-0.03em]">Sobre o projeto</h1>
      <p>
        O Radar de Voos é um projeto pessoal. A ideia: descobrir pra onde dá pra ir com o que você tem, em voos de
        última hora saindo do Brasil, e perceber quando uma passagem sai do normal.
      </p>

      <h2 className="font-display text-[1.25em] font-semibold">Como funciona</h2>
      <p>
        Um coletor automático consulta preços em buscadores públicos de passagens várias vezes por dia, para dezenas de
        trechos entre cidades brasileiras. Cada leitura guarda preço, companhia, horários e o momento exato em que foi
        feita. Esse histórico alimenta tudo o que você vê no site.
      </p>
      <p>
        Na aba <strong>Vai baixar?</strong>, um modelo simples olha o histórico de cada trecho e estima com que
        frequência o preço caiu quando faltava pouco tempo pro voo. É estatística sobre o que já aconteceu, não
        previsão garantida.
      </p>
      <p>
        O destaque <strong>Fora do normal</strong> aparece quando um preço fica bem abaixo da mediana do trecho, e a
        queda se mantém em leituras seguidas. Leituras isoladas, em geral de madrugada, são descartadas como ruído.
      </p>

      <h2 className="font-display text-[1.25em] font-semibold">De onde vêm os preços</h2>
      <p>
        Os preços vêm do Google Voos e, como referência de menor preço recente, da API do Aviasales. Eles podem estar
        defasados. Cada leitura mostra o horário em que foi feita, e o preço final só vale no site de quem vende.
      </p>

      <h2 className="font-display text-[1.25em] font-semibold">O que o Radar não faz</h2>
      <ul className="list-disc space-y-1 pl-[1.25em]">
        <li>Não vende passagem. A compra acontece no site da companhia ou da agência.</li>
        <li>Não garante preço nem disponibilidade.</li>
        <li>Não cobre todos os trechos do país. A lista cresce conforme as buscas.</li>
      </ul>

      <h2 className="font-display text-[1.25em] font-semibold">Links de afiliado</h2>
      <p>
        Alguns links de compra levam um código de afiliado. Se você comprar por eles, o projeto pode receber uma
        comissão, sem custo extra pra você. Esses links são marcados no site.
      </p>

      <p className="text-muted-foreground">
        Veja também os <a className="underline" href="/termos">Termos de uso</a> e a{" "}
        <a className="underline" href="/privacidade">Política de privacidade</a>.
      </p>
    </article>
  );
}
