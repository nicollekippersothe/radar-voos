import { Instrument_Sans, Space_Mono, Archivo } from "next/font/google";
import { Nav } from "./nav";
import "./globals.css";

const AUTOR = process.env.NEXT_PUBLIC_AUTOR || "Nicolle";
const PORTFOLIO = process.env.NEXT_PUBLIC_PORTFOLIO || "";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Archivo({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700"] });
const mono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "700"] });

const DESCRICAO = "Pra onde dá pra ir com o que você tem. Voos de última hora saindo do Brasil, com histórico de preço.";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://radar-voos-gilt.vercel.app"),
  title: { default: "Radar de Voos", template: "%s · Radar de Voos" },
  description: DESCRICAO,
  openGraph: { title: "Radar de Voos", description: DESCRICAO, siteName: "Radar de Voos", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", title: "Radar de Voos", description: DESCRICAO },
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
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-[1em] focus:top-[1em] focus:z-50 focus:rounded-md focus:bg-card focus:px-[1em] focus:py-[0.75em] focus:shadow-lg">Pular pro conteúdo</a>
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="shell flex h-[3.75em] items-center justify-between gap-4">
            <a href="/" className="flex min-h-[44px] items-center font-display text-[1.1em] font-semibold tracking-[-0.03em]">
              Radar<span className="text-brand">.</span>
            </a>
            <Nav />
          </div>
        </header>
        <main id="conteudo" className="shell flex-1 pb-[6em] pt-[3em]">{children}</main>
        <footer className="shell border-t py-[2em] text-[0.85em] text-muted-foreground">
          <div className="flex flex-col gap-[1.25em] sm:flex-row sm:items-start sm:justify-between">
            <div className="flex max-w-[52ch] flex-col gap-[0.5em]">
              <span className="font-display text-[1.1em] font-semibold tracking-[-0.03em] text-foreground">Radar<span className="text-brand">.</span></span>
              <p>
                Preços lidos em buscadores públicos, sempre com o horário da leitura. Eles mudam rápido: confira o valor no site de quem vende antes de comprar.
              </p>
            </div>
            <nav aria-label="Institucional" className="flex flex-wrap gap-x-[1.25em] gap-y-[0.25em]">
              <a className="flex min-h-[44px] items-center underline-offset-4 hover:text-foreground hover:underline" href="/sobre">Sobre</a>
              <a className="flex min-h-[44px] items-center underline-offset-4 hover:text-foreground hover:underline" href="/termos">Termos</a>
              <a className="flex min-h-[44px] items-center underline-offset-4 hover:text-foreground hover:underline" href="/privacidade">Privacidade</a>
            </nav>
          </div>
          <p className="mt-[1.5em] border-t pt-[1.25em]">
            Feito por{" "}
            {PORTFOLIO ? <a className="font-medium text-foreground underline underline-offset-4" href={PORTFOLIO} target="_blank" rel="noopener">{AUTOR}</a> : <span className="font-medium text-foreground">{AUTOR}</span>}
            . © {new Date().getFullYear()}
          </p>
        </footer>
      </body>
    </html>
  );
}
