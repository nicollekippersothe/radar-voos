import { ImageResponse } from "next/og";

export const alt = "Radar de Voos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#1a1818", color: "#f4f3f1" }}>
        <div style={{ display: "flex", fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>
          Radar<span style={{ color: "#d1301f" }}>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 24, maxWidth: 900, lineHeight: 1.25 }}>
          Pra onde dá pra ir com o que você tem. Voos de última hora, com histórico de preço.
        </div>
      </div>
    ),
    size
  );
}
