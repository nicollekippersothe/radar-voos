import "./globals.css";
import Nav from "./nav";

export const metadata = {
  title: "Radar de Voos",
  description: "Pra onde dá pra ir com o que você tem, e qual dia tende a ser mais barato.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function Layout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,500..700,0..100,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="topo">
          <div className="topo-inner">
            <a className="marca display" href="/">Radar de Voos</a>
            <Nav />
          </div>
        </header>
        <main className="pagina">{children}</main>
      </body>
    </html>
  );
}
