import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Chip.css";

export type ColorChip = "papel" | "sol" | "anil" | "laguna" | "arco" | "exito" | "error" | "hielo";

interface Props {
  color?: ColorChip;
  icono?: ReactNode;
  children: ReactNode;
}

/** Chip informativo (no interactivo) */
export function Chip({ color = "papel", icono, children }: Props) {
  return (
    <span className={`ah-chip ah-chip--${color}`}>
      {icono}
      {children}
    </span>
  );
}

interface PropsFiltro extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  activo: boolean;
  children: ReactNode;
}

/** Chip pulsable para filtros: activo = añil */
export function ChipFiltro({ activo, children, className, ...resto }: PropsFiltro) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={`ah-chip ah-chip--boton ah-chip--${activo ? "anil" : "papel"}${className ? ` ${className}` : ""}`}
      {...resto}
    >
      {children}
    </button>
  );
}
