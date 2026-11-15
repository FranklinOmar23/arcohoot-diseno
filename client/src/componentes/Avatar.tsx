import type { CSSProperties } from "react";

interface Props {
  nombre: string;
  /** Variable CSS del fondo, p. ej. "var(--hielo)" */
  fondo?: string;
  tamano?: number;
  decorativo?: boolean;
}

export const estiloAvatar = (fondo: string, tamano: number): CSSProperties => ({
  width: tamano,
  height: tamano,
  borderRadius: "50%",
  border: "var(--borde-grueso)",
  background: fondo,
  color: "var(--sobre-claro)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: Math.round(tamano * 0.42),
  flex: "none",
});

export function Avatar({ nombre, fondo = "var(--hielo)", tamano = 44, decorativo }: Props) {
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      role={decorativo ? undefined : "img"}
      aria-hidden={decorativo || undefined}
      aria-label={decorativo ? undefined : nombre}
      style={estiloAvatar(fondo, tamano)}
    >
      {inicial}
    </span>
  );
}
