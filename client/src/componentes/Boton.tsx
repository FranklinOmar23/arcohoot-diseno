import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import "./Boton.css";

export type VarianteBoton = "papel" | "arco" | "sol" | "anil";

interface Base {
  variante?: VarianteBoton;
  /** sm = 46 px · md = 56 px · lg = 72 px (principal en móvil) */
  tamano?: "sm" | "md" | "lg";
  bloque?: boolean;
  icono?: ReactNode;
  /** Botón redondo con solo ícono: exige aria-label */
  soloIcono?: boolean;
  className?: string;
  children?: ReactNode;
}

type ComoBoton = Base & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type ComoEnlace = Base & { to: string; "aria-label"?: string; onClick?: () => void };

export type BotonProps = ComoBoton | ComoEnlace;

export function clasesBoton({ variante = "papel", tamano = "md", bloque, soloIcono, className }: Base) {
  return [
    "ah-btn",
    `ah-btn--${variante}`,
    `ah-btn--${tamano}`,
    bloque && "ah-btn--bloque",
    soloIcono && "ah-btn--icono",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Boton(props: BotonProps) {
  const { variante, tamano, bloque, icono, soloIcono, className, children, ...resto } = props;
  const clases = clasesBoton({ variante, tamano, bloque, soloIcono, className });
  const contenido = (
    <>
      {icono}
      {children}
    </>
  );

  if ("to" in resto && resto.to !== undefined) {
    const { to, ...enlace } = resto as ComoEnlace;
    return (
      <Link to={to} className={clases} {...enlace}>
        {contenido}
      </Link>
    );
  }
  const { type = "button", ...boton } = resto as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={clases} {...boton}>
      {contenido}
    </button>
  );
}
