export const metadata = { title: "Política de privacidade", description: "Quais dados o Radar de Voos coleta e como usa." };

export default function Privacidade() {
  return (
    <article className="mx-auto max-w-[42em] space-y-[1.25em] leading-relaxed">
      <h1 className="font-display text-[2em] font-semibold tracking-[-0.03em]">Política de privacidade</h1>
      <p>Resumo: o Radar não pede cadastro e não guarda dados pessoais seus.</p>
      <h2 className="font-display text-[1.25em] font-semibold">O que o site coleta</h2>
      <p>
        Não há conta nem formulário. Quando você abre um trecho, o site pode registrar a rota pedida (origem e destino)
        pra atualizar o preço, sem associar isso a você. A hospedagem (Vercel e Cloudflare) mantém registros técnicos
        padrão, como endereço IP e navegador, pelo tempo que as próprias plataformas definem.
      </p>
      <h2 className="font-display text-[1.25em] font-semibold">Cookies e afiliados</h2>
      <p>
        O Radar não usa cookies próprios de rastreamento. Ao clicar num link de afiliado, o site de destino (como o
        Aviasales) pode gravar cookies pra identificar a origem da compra. Isso segue a política de privacidade deles.
      </p>
      <h2 className="font-display text-[1.25em] font-semibold">Seus direitos (LGPD)</h2>
      <p>
        Você pode pedir informação, correção ou exclusão de qualquer dado seu que o projeto tenha, pelo contato abaixo.
      </p>
      <p className="text-muted-foreground">{process.env.NEXT_PUBLIC_CONTATO ? <>Contato: <a className="underline" href={`mailto:${process.env.NEXT_PUBLIC_CONTATO}`}>{process.env.NEXT_PUBLIC_CONTATO}</a>.</> : null}</p>
    </article>
  );
}
