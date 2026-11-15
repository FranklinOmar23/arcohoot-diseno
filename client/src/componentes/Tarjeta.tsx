import type { HTMLAttributes, ReactNode } from "react";
import "./Tarjeta.css";

interface Props extends HTMLAttributes<HTMLElement> {
  /** card = con sombra sólida · panel = solo borde */
  tipo?: "card" | "panel";
  como?: "div" | "article" | "section";
  children: ReactNode;
}

export function Tarjeta({ tipo = "card", como: Etiqueta = "div", className, children, ...resto }: Props) {
  return (
    <Etiqueta className={`ah-${tipo}${className ? ` ${className}` : ""}`} {...resto}>
      {children}
    </Etiqueta>
  );
}
