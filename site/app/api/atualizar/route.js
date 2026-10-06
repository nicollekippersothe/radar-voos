import { NextResponse } from "next/server";
import { chamar, temApi } from "@/lib/api";

export const dynamic = "force-dynamic";

// Repassa ao Worker o pedido de atualização de um trecho. Quem decide se vale ler de novo é o Worker.
export async function GET(req) {
  if (!temApi()) return NextResponse.json({ status: "sem_api" });
  const q = new URL(req.url).searchParams;
  const r = await chamar("/api/atualizar", { origem: q.get("origem") || "", destino: q.get("destino") || "" }, { semCache: true });
  return NextResponse.json(r || { status: "erro" }, { headers: { "cache-control": "no-store" } });
}
