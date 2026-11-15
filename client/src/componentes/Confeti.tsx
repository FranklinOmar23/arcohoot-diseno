import { useMemo } from "react";

const COLORES = ["var(--sol)", "var(--arco)", "var(--laguna)", "var(--anil)", "var(--exito)", "var(--sobre-oscuro)"];
const FORMAS = ["50%", "3px", "triangulo"];

/** Lluvia de confeti decorativa (se apaga con prefers-reduced-motion) */
export function Confeti({ cantidad = 14 }: { cantidad?: number }) {
  const piezas = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => {
        const tam = 10 + Math.round(Math.random() * 7);
        const forma = FORMAS[i % FORMAS.length];
        return {
          left: `${Math.round(Math.random() * 96)}%`,
          width: tam,
          height: tam,
          background: COLORES[Math.floor(Math.random() * COLORES.length)],
          borderRadius: forma === "triangulo" ? undefined : forma,
          clipPath: forma === "triangulo" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
          animationDelay: `${(-Math.random() * 3.4).toFixed(2)}s`,
          animationDuration: `${(3 + Math.random() * 1.4).toFixed(2)}s`,
        };
      }),
    [cantidad],
  );
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {piezas.map((estilo, i) => (
        <span key={i} className="conf" style={estilo} />
      ))}
    </div>
  );
}
