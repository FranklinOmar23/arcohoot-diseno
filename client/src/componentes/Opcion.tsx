import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Forma, nombreLegible, type NombreForma } from "./Forma";
import "./Opcion.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Color + forma siempre van juntos */
  forma: NombreForma;
  children: ReactNode;
  /** Forma arriba y texto centrado (pantallas de jugador) */
  vertical?: boolean;
  tamanoForma?: number;
  alto?: number;
}

export function Opcion({
  forma,
  children,
  vertical = false,
  tamanoForma = 34,
  alto = 72,
  className,
  style,
  "aria-label": ariaLabel,
  ...resto
}: Props) {
  return (
    <button
      type="button"
      className={`ah-op ah-op--${forma}${vertical ? " ah-op--vertical" : ""}${className ? ` ${className}` : ""}`}
      style={{ minHeight: alto, ...style }}
      aria-label={ariaLabel}
      {...resto}
    >
      <Forma forma={forma} tamano={tamanoForma} />
      <span className="sr">{nombreLegible[forma]}: </span>
      <span className="ah-op__texto">{children}</span>
    </button>
  );
}
