import type { CSSProperties } from "react";
import { Forma, type NombreForma } from "./Forma";

interface Figura {
  forma: NombreForma;
  color: string;
  tamano: number;
  estilo: CSSProperties;
  giro: string;
}

// Disposición de J1_Entrar: las cuatro formas asomando por abajo
const ABAJO: Figura[] = [
  { forma: "triangulo", color: "var(--sol)", tamano: 80, estilo: { left: -10, bottom: 60 }, giro: "-14deg" },
  { forma: "rombo", color: "var(--arco)", tamano: 64, estilo: { left: 110, bottom: 20 }, giro: "8deg" },
  { forma: "circulo", color: "var(--laguna)", tamano: 72, estilo: { right: 90, bottom: 70 }, giro: "0deg" },
  { forma: "cuadrado", color: "var(--anil)", tamano: 86, estilo: { right: -16, bottom: 6 }, giro: "12deg" },
];

/** Formas decorativas que flotan en el fondo (aria-hidden) */
export function FormasFlotantes({ escala = 1 }: { escala?: number }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {ABAJO.map((f, i) => (
        <span
          key={f.forma}
          className="floaty"
          style={{ position: "absolute", display: "flex", ...f.estilo, ["--r" as string]: f.giro, animationDelay: `${-0.7 * i}s` }}
        >
          <Forma forma={f.forma} tamano={f.tamano * escala} color={f.color} />
        </span>
      ))}
    </div>
  );
}
