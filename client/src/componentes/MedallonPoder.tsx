import { PODERES, RAREZAS, type IdPoder, type Rareza } from "../juego/poderes";
import "./MedallonPoder.css";

interface Props {
  poder: IdPoder;
  /** 64 px en inventario, 72 px en tarjetas */
  tamano?: number;
}

/** Medallón circular: el color del aro indica la rareza */
export function MedallonPoder({ poder, tamano = 64 }: Props) {
  const p = PODERES[poder];
  return (
    <span
      className={`ah-pow ah-pow--${p.rareza}`}
      role="img"
      aria-label={p.nombre}
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.47) }}
    >
      {p.emoji}
    </span>
  );
}

/** Etiqueta de rareza: color + gemas (no depende solo del color) */
export function EtiquetaRareza({ rareza }: { rareza: Rareza }) {
  const r = RAREZAS[rareza];
  return (
    <span className={`ah-rar ah-rar--${rareza}`}>
      {r.nombre} <span aria-hidden="true">{r.gemas}</span>
    </span>
  );
}

/** Tarjeta de poder completa, como en el sistema de diseño */
export function TarjetaPoder({ poder }: { poder: IdPoder }) {
  const p = PODERES[poder];
  return (
    <div className="ah-tarjeta-poder">
      <MedallonPoder poder={poder} tamano={72} />
      <div className="ah-tarjeta-poder__nombre f">
        {p.nombre} {p.emoji}
      </div>
      <EtiquetaRareza rareza={p.rareza} />
      <p className="ah-tarjeta-poder__desc">{p.descripcion}</p>
    </div>
  );
}
