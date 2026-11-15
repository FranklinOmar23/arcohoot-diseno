import { Icono, Interruptor } from "../../componentes";
import { TIEMPOS, TIPOS, type Pregunta, type TipoPregunta } from "../../juego/preguntas";
import { nombreImagen } from "../../lib/subir";
import { useSubidaImagen } from "./ZonaImagen";

interface Props {
  pregunta: Pregunta;
  onTipo: (t: TipoPregunta) => void;
  onTiempo: (s: number) => void;
  onImagen: (url: string | null) => void;
  onPuntosDobles: (v: boolean) => void;
  onError: (m: string) => void;
}

/** Columna derecha de H2 */
export function PanelPropiedades({ pregunta: p, onTipo, onTiempo, onImagen, onPuntosDobles, onError }: Props) {
  const { abrir, subiendo, elemento } = useSubidaImagen(onImagen, onError);
  const tiempos = TIEMPOS.includes(p.tiempo) ? TIEMPOS : [...TIEMPOS, p.tiempo].sort((a, b) => a - b);

  return (
    <aside className="ah-panel editor-props" aria-label="Propiedades">
      <div className="editor-props__grupo">
        <span className="lbl" id="lbl-tipo">
          Tipo de pregunta
        </span>
        <div className="editor-tipos" role="group" aria-labelledby="lbl-tipo">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`editor-tile${p.tipo === t.id ? " editor-tile--sel" : ""}`}
              aria-pressed={p.tipo === t.id}
              onClick={() => onTipo(t.id)}
            >
              <Icono nombre={t.icono} tamano={20} />
              <span>{t.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="editor-props__grupo">
        <span className="lbl" id="lbl-tiempo">
          Tiempo límite
        </span>
        <div className="editor-tiempos" role="group" aria-labelledby="lbl-tiempo">
          {tiempos.map((s) => (
            <button
              key={s}
              type="button"
              className={`ah-chip ah-chip--boton editor-tiempo ah-chip--${p.tiempo === s ? "anil" : "papel"}`}
              aria-pressed={p.tiempo === s}
              onClick={() => onTiempo(s)}
            >
              {s} s
            </button>
          ))}
        </div>
      </div>

      <div className="editor-props__grupo">
        <span className="lbl">{p.tipo === "pin" ? "Imagen (obligatoria)" : "Imagen (opcional)"}</span>
        {elemento}
        {p.imagen ? (
          <div className="editor-archivo">
            <span className="editor-archivo__miniatura">
              <Icono nombre="imagen" tamano={18} />
            </span>
            <span className="editor-archivo__nombre" title={nombreImagen(p.imagen)}>
              {nombreImagen(p.imagen)}
            </span>
            <button type="button" className="ah-chip ah-chip--boton editor-archivo__quitar" onClick={() => onImagen(null)}>
              Quitar
            </button>
          </div>
        ) : (
          <button type="button" className="editor-archivo editor-archivo--vacio" onClick={abrir} disabled={subiendo}>
            <span className="editor-archivo__miniatura">
              <Icono nombre="mas" tamano={18} />
            </span>
            <span className="editor-archivo__nombre">{subiendo ? "Subiendo…" : "Subir imagen"}</span>
          </button>
        )}
      </div>

      <div className="editor-dobles">
        <div style={{ flex: 1 }}>
          <div className="f editor-dobles__titulo" id="lbl-dobles">
            Puntos dobles ⚡
          </div>
          <div className="editor-dobles__sub">Esta pregunta vale x2</div>
        </div>
        <Interruptor activo={p.puntosDobles} onCambio={onPuntosDobles} idEtiqueta="lbl-dobles" />
      </div>
    </aside>
  );
}
