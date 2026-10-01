import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Radar de Voos",
  description: "Pra onde dá pra ir com o que você tem, e qual dia tende a ser mais barato.",
};

export default function Layout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <header>
          <Link className="marca" href="/">Radar de Voos</Link>
          <nav>
            <Link href="/">Pra onde ir</Link>
            <Link href="/melhor-dia">Melhor dia</Link>
            <Link href="/relatorio">Padrões</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
