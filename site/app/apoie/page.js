import { notFound } from "next/navigation";
import { configApoio } from "@/lib/apoio";
import { BlocoApoio } from "../apoio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apoie o Radar de Voos" };

export default async function Apoie() {
  if (!configApoio().ativo) notFound();
  return (
    <>
      <section className="mb-[2em] flex flex-col gap-[1em]">
        <span className="t-kicker text-brand">Apoie</span>
        <h1 className="t-display max-w-[12ch]">Ajude o radar a continuar</h1>
        <p className="t-lead max-w-[42ch] text-muted-foreground">
          O radar lê preços o dia todo e isso tem custo de servidor e domínio. Não tem plano pago nem anúncio no meio da lista. Quem quiser ajudar, ajuda com o valor que fizer sentido.
        </p>
      </section>
      <BlocoApoio completo />
    </>
  );
}
