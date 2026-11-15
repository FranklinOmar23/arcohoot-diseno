import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import "./Campo.css";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  /** La etiqueta existe para lectores de pantalla pero no se ve */
  ocultarEtiqueta?: boolean;
  icono?: ReactNode;
  error?: string;
  ayuda?: string;
  /** md = 64 px (por defecto) · sm = 52 px en pastilla (buscador) · xl = 80 px (PIN) */
  tamano?: "md" | "sm" | "xl";
}

export const Campo = forwardRef<HTMLInputElement, Props>(function Campo(
  { etiqueta, ocultarEtiqueta, icono, error, ayuda, tamano = "md", className, id, ...resto },
  ref,
) {
  const auto = useId();
  const idCampo = id ?? `campo-${auto}`;
  const idMensaje = `${idCampo}-msj`;
  const mensaje = error ?? ayuda;

  return (
    <div className={`ah-campo${className ? ` ${className}` : ""}`}>
      <label htmlFor={idCampo} className={ocultarEtiqueta ? "sr" : "ah-campo__etiqueta"}>
        {etiqueta}
      </label>
      <div className="ah-campo__caja">
        {icono && <span className="ah-campo__icono">{icono}</span>}
        <input
          ref={ref}
          id={idCampo}
          className={[
            "ah-campo__input",
            `ah-campo__input--${tamano}`,
            icono && "ah-campo__input--con-icono",
            error && "ah-campo__input--error",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={mensaje ? idMensaje : undefined}
          {...resto}
        />
      </div>
      {mensaje && (
        <p id={idMensaje} className={error ? "ah-campo__error" : "meta"} role={error ? "alert" : undefined}>
          {mensaje}
        </p>
      )}
    </div>
  );
});
