import "./Interruptor.css";

interface Props {
  activo: boolean;
  onCambio: (activo: boolean) => void;
  /** Texto accesible si no hay etiqueta visible enlazada con aria-labelledby */
  etiqueta?: string;
  idEtiqueta?: string;
  disabled?: boolean;
}

export function Interruptor({ activo, onCambio, etiqueta, idEtiqueta, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={idEtiqueta ? undefined : etiqueta}
      aria-labelledby={idEtiqueta}
      disabled={disabled}
      className={`ah-toggle${activo ? " ah-toggle--on" : ""}`}
      onClick={() => onCambio(!activo)}
    />
  );
}
