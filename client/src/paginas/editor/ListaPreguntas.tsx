import { useRef, useState } from "react";
import { Boton, Icono } from "../../componentes";
import { infoTipo, nombreCortoTipo, problemas, type Pregunta } from "../../juego/preguntas";

interface Props {
  preguntas: Pregunta[];
  seleccion: number;
  onSeleccionar: (i: number) => void;
  onAgregar: () => void;
  onDuplicar: () => void;
  onBorrar: () => void;
  onMover: (desde: number, hasta: number) => void;
}

/** Columna izquierda de H2: lista de preguntas, reordenable con arrastre o Alt + ↑/↓ */
export function ListaPreguntas({ preguntas, seleccion, onSeleccionar, onAgregar, onDuplicar, onBorrar, onMover }: Props) {
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= preguntas.length || desde === hasta) return;
    onMover(desde, hasta);
    setAnuncio(`Pregunta movida a la posición ${hasta + 1} de ${preguntas.length}.`);
    requestAnimationFrame(() => botones.current[hasta]?.focus());
  }

  return (
    <nav aria-label="Preguntas" className="editor-lista">
      <div className="editor-lista__cabecera">
        <span className="lbl">Preguntas · {preguntas.length}</span>
        <div className="editor-lista__acciones">
          <button type="button" className="editor-icono" aria-label="Duplicar pregunta" title="Duplicar" onClick={onDuplicar}>
            <Icono nombre="copiar" tamano={18} />
          </button>
          <button
            type="button"
            className="editor-icono"
            aria-label="Borrar pregunta"
            title="Borrar"
            onClick={onBorrar}
            disabled={preguntas.length <= 1}
          >
            <Icono nombre="basura" tamano={18} />
          </button>
        </div>
      </div>

      <ol className="editor-lista__items">
        {preguntas.map((p, i) => {
          const info = infoTipo(p.tipo);
          const sel = i === seleccion;
          const incompleta = problemas(p).length > 0;
          return (
            <li
              key={p.clave}
              draggable
              onDragStart={(e) => {
                setArrastrando(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (arrastrando === null) return;
                e.preventDefault();
                setSobre(i);
              }}
              onDragLeave={() => setSobre((s) => (s === i ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (arrastrando !== null) mover(arrastrando, i);
                setArrastrando(null);
                setSobre(null);
              }}
              onDragEnd={() => {
                setArrastrando(null);
                setSobre(null);
              }}
              className={sobre === i && arrastrando !== i ? "editor-lista__destino" : undefined}
            >
              <button
                ref={(el) => (botones.current[i] = el)}
                type="button"
                className={`editor-item${sel ? " editor-item--sel" : ""}${arrastrando === i ? " editor-item--arrastrando" : ""}`}
                aria-current={sel ? "true" : undefined}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                onClick={() => onSeleccionar(i)}
                onKeyDown={(e) => {
                  if (e.altKey && e.key === "ArrowUp") {
                    e.preventDefault();
                    mover(i, i - 1);
                  } else if (e.altKey && e.key === "ArrowDown") {
                    e.preventDefault();
                    mover(i, i + 1);
                  } else if (!e.altKey && e.key === "ArrowDown") {
                    e.preventDefault();
                    botones.current[i + 1]?.focus();
                  } else if (!e.altKey && e.key === "ArrowUp") {
                    e.preventDefault();
                    botones.current[i - 1]?.focus();
                  }
                }}
              >
                <span className="f editor-item__num">{i + 1}</span>
                <span className="editor-item__tipo">
                  <Icono nombre={info.icono} tamano={20} />
                </span>
                <span className="editor-item__textos">
                  <span className="editor-item__enunciado">{p.enunciado.trim() || "Sin enunciado"}</span>
                  <span className="meta editor-item__meta">
                    {nombreCortoTipo(p.tipo)}
                    {p.puntosDobles && " · ⚡"}
                  </span>
                </span>
                {incompleta && (
                  <span className="editor-item__aviso" role="img" aria-label="Incompleta" title="Le falta algo">
                    !
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <Boton tamano="sm" bloque className="editor-lista__agregar" icono={<Icono nombre="mas" tamano={20} />} onClick={onAgregar}>
        Agregar pregunta
      </Boton>
      <p className="sr" aria-live="polite">
        {anuncio}
      </p>
    </nav>
  );
}
