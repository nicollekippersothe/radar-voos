"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/", "Pra onde"],
  ["/melhor-dia", "Melhor dia"],
  ["/relatorio", "Padrões"],
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Seções" className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
      {LINKS.map(([href, rotulo]) => {
        const ativo = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-full px-[0.9em] py-[0.45em] text-[0.85em] font-medium transition-colors",
              ativo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
