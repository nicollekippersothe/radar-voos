"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// [caminho, rótulo completo, rótulo curto pro celular]
const LINKS = [
  ["/", "Pra onde", "Destinos"],
  ["/planejar", "Meu orçamento", "Orçamento"],
  ["/melhor-dia", "Melhor dia", "Dias"],
  ["/relatorio", "Vai baixar?", "Baixa?"],
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Seções" className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
      {LINKS.map(([href, rotulo, curto]) => {
        const ativo = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] items-center whitespace-nowrap rounded-full px-[0.7em] text-[0.85em] font-medium transition-colors sm:px-[1em] sm:text-[0.9em]",
              ativo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="sm:hidden">{curto}</span>
            <span className="hidden sm:inline">{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
