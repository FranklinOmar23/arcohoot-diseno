import type { ColorAvatar } from "../lib/socket";
import { estiloAvatar } from "./Avatar";

// Fondo y texto con contraste ≥ 4.5:1 para cada color de avatar (paleta de H4)
const COLORES: Record<ColorAvatar, { fondo: string; texto: string }> = {
  sol: { fondo: "var(--sol)", texto: "var(--sobre-claro)" },
  arco: { fondo: "var(--arco)", texto: "var(--sobre-claro)" },
  laguna: { fondo: "var(--laguna)", texto: "var(--sobre-oscuro)" },
  anil: { fondo: "var(--anil)", texto: "var(--sobre-oscuro)" },
  hielo: { fondo: "var(--hielo)", texto: "var(--sobre-claro)" },
  exito: { fondo: "var(--exito)", texto: "var(--sobre-claro)" },
  epico: { fondo: "var(--rareza-epico)", texto: "var(--sobre-oscuro)" },
  niebla: { fondo: "var(--niebla)", texto: "var(--sobre-claro)" },
};

interface Props {
  apodo: string;
  color: ColorAvatar;
  tamano?: number;
}

/** Círculo con la inicial del jugador. Decorativo: el apodo siempre va escrito al lado. */
export function AvatarJugador({ apodo, color, tamano = 38 }: Props) {
  const c = COLORES[color] ?? COLORES.sol;
  return (
    <span aria-hidden="true" style={{ ...estiloAvatar(c.fondo, tamano), color: c.texto }}>
      {apodo.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
