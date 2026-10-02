"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  ["/", "Pra onde ir"],
  ["/melhor-dia", "Melhor dia"],
  ["/relatorio", "Padrões"],
];

export default function Nav() {
  const atual = usePathname();
  return (
    <nav className="segmentos" aria-label="Seções">
      {ITENS.map(([href, rotulo]) => (
        <Link key={href} href={href} aria-current={atual === href ? "page" : undefined}>
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}
