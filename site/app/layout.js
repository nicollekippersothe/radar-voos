import { Instrument_Sans, Archivo, JetBrains_Mono } from "next/font/google";
import { Nav } from "./nav";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Archivo({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "500"] });

export const metadata = {
  title: "Radar de Voos",
  description: "Pra onde dá pra ir com o que você tem. Voos de última hora saindo do Brasil, lidos em buscador público.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1818" },
  ],
};

// Liga a classe .dark pelo tema do sistema, antes da primeira pintura.
const temaScript = `(function(){try{var m=matchMedia('(prefers-color-scheme: dark)');var f=function(){document.documentElement.classList.toggle('dark',m.matches)};f();m.addEventListener('change',f)}catch(e){}})();`;

export default function Layout({ children }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaScript }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="shell flex h-[3.5em] items-center justify-between gap-4">
            <a href="/" className="font-display text-[1.1em] font-semibold tracking-[-0.03em]">
              Radar<span className="text-brand">.</span>
            </a>
            <Nav />
          </div>
        </header>
        <main className="shell flex-1 pb-[6em] pt-[3em]">{children}</main>
        <footer className="shell border-t border-border/70 py-[1.5em] t-label text-muted-foreground">
          Radar de Voos · dados lidos no Google Voos · a compra é feita na companhia
        </footer>
      </body>
    </html>
  );
}
