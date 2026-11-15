// Las cuatro formas de respuesta. El orden es fijo: 1 ▲ sol, 2 ◆ arco, 3 ● laguna, 4 ■ añil.
export type NombreForma = "triangulo" | "rombo" | "circulo" | "cuadrado";

export const FORMAS: NombreForma[] = ["triangulo", "rombo", "circulo", "cuadrado"];

export const colorForma: Record<NombreForma, string> = {
  triangulo: "var(--op-triangulo)",
  rombo: "var(--op-rombo)",
  circulo: "var(--op-circulo)",
  cuadrado: "var(--op-cuadrado)",
};

/** Color de texto con contraste suficiente sobre cada forma */
export const textoSobreForma: Record<NombreForma, string> = {
  triangulo: "var(--sobre-claro)",
  rombo: "var(--sobre-claro)",
  circulo: "var(--sobre-oscuro)",
  cuadrado: "var(--sobre-oscuro)",
};

export const nombreLegible: Record<NombreForma, string> = {
  triangulo: "Triángulo",
  rombo: "Rombo",
  circulo: "Círculo",
  cuadrado: "Cuadrado",
};

const figura: Record<NombreForma, JSX.Element> = {
  triangulo: <path d="M12 2.5 22.5 21h-21z" />,
  rombo: <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" />,
  circulo: <circle cx="12" cy="12" r="10.5" />,
  cuadrado: <rect x="2" y="2" width="20" height="20" rx="3" />,
};

interface Props {
  forma: NombreForma;
  tamano?: number;
  /** Por defecto hereda el color del texto (currentColor) */
  color?: string;
}

export function Forma({ forma, tamano = 34, color = "currentColor" }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ flex: "none" }}>
      {figura[forma]}
    </svg>
  );
}
