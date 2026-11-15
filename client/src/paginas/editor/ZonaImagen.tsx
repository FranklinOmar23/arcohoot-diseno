import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Icono } from "../../componentes";
import { subirImagen, TIPOS_IMAGEN } from "../../lib/subir";

interface Zona {
  x: number;
  y: number;
  r: number;
  a?: number;
}

interface Props {
  imagen: string | null;
  onImagen: (url: string | null) => void;
  onError: (mensaje: string) => void;
  /** Modo pin: la imagen es más grande y un clic coloca la zona correcta */
  zona?: Zona;
  onZona?: (z: Zona) => void;
}

/** Hook compartido para abrir el selector de archivos y subir */
export function useSubidaImagen(onImagen: (url: string) => void, onError: (m: string) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const elemento = (
    <input
      ref={input}
      type="file"
      accept={TIPOS_IMAGEN}
      hidden
      onChange={async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setSubiendo(true);
        try {
          onImagen(await subirImagen(archivo));
        } catch (err) {
          onError((err as Error).message);
        } finally {
          setSubiendo(false);
        }
      }}
    />
  );
  return { abrir: () => input.current?.click(), subiendo, elemento };
}

export function ZonaImagen({ imagen, onImagen, onError, zona, onZona }: Props) {
  const { abrir, subiendo, elemento } = useSubidaImagen(onImagen, onError);
  const modoPin = !!zona && !!onZona;

  if (!imagen) {
    return (
      <div className={`editor-imagen editor-imagen--vacia${modoPin ? " editor-imagen--pin" : ""}`}>
        {elemento}
        <button type="button" className="editor-imagen__subir" onClick={abrir} disabled={subiendo}>
          <span className="editor-imagen__subir-icono">
            <Icono nombre="imagen" tamano={26} />
          </span>
          <span className="f">{subiendo ? "Subiendo…" : modoPin ? "Sube la imagen donde pondrán el pin" : "Agregar imagen (opcional)"}</span>
          <span className="meta">PNG, JPG, WEBP o GIF · hasta 4 MB</span>
        </button>
      </div>
    );
  }

  function colocar(e: MouseEvent<HTMLDivElement>) {
    if (!zona || !onZona) return;
    const caja = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - caja.left) / caja.width) * 100;
    const y = ((e.clientY - caja.top) / caja.height) * 100;
    onZona({ ...zona, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (!zona || !onZona) return;
    const paso = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!d) return;
    e.preventDefault();
    const lim = (v: number) => Math.max(0, Math.min(100, v));
    onZona({ ...zona, x: lim(zona.x + d[0]), y: lim(zona.y + d[1]) });
  }

  return (
    <div className={`editor-imagen${modoPin ? " editor-imagen--pin" : ""}`}>
      {elemento}
      <div className="editor-imagen__marco">
        {modoPin ? (
          <div
            className="editor-imagen__lienzo editor-imagen__lienzo--pin"
            onClick={colocar}
            onKeyDown={teclas}
            tabIndex={0}
            role="application"
            aria-label={`Zona correcta en ${Math.round(zona!.x)} % horizontal y ${Math.round(zona!.y)} % vertical. Haz clic en la imagen o usa las flechas para moverla.`}
          >
            <img
              src={imagen}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                const a = w > 0 ? Math.round((h / w) * 1000) / 1000 : 1;
                if (zona && onZona && Math.abs((zona.a ?? 0) - a) > 0.001) onZona({ ...zona, a });
              }}
            />
            <span
              className="editor-imagen__zona"
              aria-hidden="true"
              style={{ left: `${zona!.x}%`, top: `${zona!.y}%`, width: `${zona!.r * 2}%` }}
            />
          </div>
        ) : (
          <div className="editor-imagen__lienzo">
            <img src={imagen} alt="Imagen de la pregunta" />
          </div>
        )}
      </div>
      <div className="editor-imagen__acciones">
        <button type="button" className="ah-chip ah-chip--boton" onClick={abrir} disabled={subiendo}>
          <Icono nombre="imagen" tamano={18} /> {subiendo ? "Subiendo…" : "Cambiar"}
        </button>
        <button type="button" className="ah-chip ah-chip--boton" aria-label="Quitar imagen" onClick={() => onImagen(null)}>
          <Icono nombre="basura" tamano={18} />
        </button>
      </div>
    </div>
  );
}
