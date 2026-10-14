import { Vazio } from "./blocos";

export const metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <Vazio
      titulo="Essa página não existe"
      texto="O endereço pode ter mudado ou ter sido digitado errado. Volte pro início e escolha o destino por lá."
      acao={<a className="flex min-h-[44px] items-center rounded-md border bg-card px-[1.25em] font-medium hover:bg-muted" href="/">Ver pra onde dá pra ir</a>}
    />
  );
}
