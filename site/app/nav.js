"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/", "Pra onde"],
  ["/melhor-dia", "Melhor dia"],
  ["/relatorio", "Vai cair?"],
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
              "flex min-h-[44px] items-center rounded-full px-[1em] text-[0.9em] font-medium transition-colors",
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
