import type { NombreForma } from "../../componentes/Forma";

interface FiguraPortada {
  forma: NombreForma;
  color: string;
}

export interface Portada {
  fondo: string;
  /** Tres figuras flotantes: izquierda (56), centro (44), derecha (64) */
  figuras: [FiguraPortada, FiguraPortada, FiguraPortada];
}

const blanco = "var(--sobre-oscuro)";

// Las seis portadas de la pantalla H1, en orden
export const PORTADAS: Portada[] = [
  { fondo: "var(--anil)", figuras: [{ forma: "triangulo", color: "var(--sol)" }, { forma: "cuadrado", color: "var(--arco)" }, { forma: "circulo", color: blanco }] },
  { fondo: "var(--sol)", figuras: [{ forma: "circulo", color: "var(--anil)" }, { forma: "rombo", color: "var(--arco)" }, { forma: "cuadrado", color: "var(--laguna)" }] },
  { fondo: "var(--laguna)", figuras: [{ forma: "rombo", color: "var(--sol)" }, { forma: "triangulo", color: blanco }, { forma: "circulo", color: "var(--arco)" }] },
  { fondo: "var(--arco)", figuras: [{ forma: "cuadrado", color: "var(--sol)" }, { forma: "circulo", color: "var(--anil)" }, { forma: "triangulo", color: blanco }] },
  { fondo: "var(--hielo)", figuras: [{ forma: "triangulo", color: "var(--anil)" }, { forma: "cuadrado", color: "var(--arco)" }, { forma: "circulo", color: "var(--sol)" }] },
  { fondo: "var(--exito)", figuras: [{ forma: "rombo", color: "var(--sol)" }, { forma: "triangulo", color: blanco }, { forma: "circulo", color: "var(--anil)" }] },
];

export const portada = (i: number) => PORTADAS[((i % PORTADAS.length) + PORTADAS.length) % PORTADAS.length];
