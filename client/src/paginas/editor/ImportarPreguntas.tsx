import { useEffect, useMemo, useRef, useState } from "react";
import { Boton, Chip, Forma, FORMAS, Icono } from "../../componentes";
import { importarPreguntas, textoDePdf } from "../../juego/importar";
import { infoTipo, type Pregunta } from "../../juego/preguntas";

interface Props {
  onImportar: (preguntas: Pregunta[]) => void;
  onCerrar: () => void;
}

const EJEMPLO = `1. ¿Cuál es el planeta más grande del sistema solar?
a) Saturno
b) Júpiter ✅
c) Tierra
d) Neptuno

2. Verdadero o falso: el océano Pacífico es el más grande del mundo.
( ) Verdadero ✅
( ) Falso

3. ¿Qué número marcas en una emergencia?
Respuesta: 911`;

/** Vista corta de las respuestas de una pregunta importada */
function Respuestas({ p }: { p: Pregunta }) {
  if (p.tipo === "quiz")
    return (
      <ul className="imp-ops">
        {p.datos.opciones.map((o, i) => (
          <li key={i} className={o.correcta ? "imp-ops__ok" : undefined}>
            <span style={{ color: `var(--op-${FORMAS[i]})`, display: "flex" }}>
              <Forma forma={FORMAS[i]} tamano={16} />
            </span>
            <span>{o.texto || "(vacía)"}</span>
            {o.correcta && (
              <span className="imp-ops__marca" aria-label="correcta">
                <Icono nombre="correcto" tamano={14} grosor={3.4} />
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  if (p.tipo === "verdadero_falso") return <p className="imp-linea">Correcta: <b>{p.datos.correcta ? "Verdadero" : "Falso"}</b></p>;
  if (p.tipo === "respuesta_corta")
    return (
      <p className="imp-linea">
        Aceptadas: <b>{p.datos.respuestas.filter(Boolean).join(" · ") || "—"}</b>
      </p>
    );
  return null;
}

/** Importar preguntas pegando texto o desde un PDF */
export function ImportarPreguntas({ onImportar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");
  const [verEjemplo, setVerEjemplo] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const resultado = useMemo(() => (texto.trim() ? importarPreguntas(texto) : []), [texto]);
  const conAvisos = resultado.filter((r) => r.avisos.length).length;

  async function leerPdf(f: File) {
    setError("");
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setError("Elige un archivo PDF.");
    if (f.size > 20 * 1024 * 1024) return setError("El PDF pesa más de 20 MB.");
    setLeyendo(true);
    try {
      const t = await textoDePdf(f);
      if (!t.trim()) setError("No encontramos texto en el PDF. Si es una foto o un escaneo, copia el texto y pégalo aquí.");
      setTexto(t);
    } catch {
      setError("No pudimos leer ese PDF. Prueba copiando el texto y pegándolo aquí.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <dialog ref={dialogo} className="vista imp" aria-labelledby="imp-titulo" onCancel={onCerrar}>
      <div className="imp__cabecera">
        <div>
          <h2 id="imp-titulo" className="f imp__titulo">
            Importar preguntas
          </h2>
          <p className="meta">Pega tus preguntas o sube un PDF. Marca la correcta con ✅, «(Correcta)», «*» o una línea «Respuesta: b».</p>
        </div>
        <Boton tamano="sm" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>

      <div className="imp__cuerpo">
        <div className="imp__entrada">
          <div className="imp__acciones">
            <input
              ref={archivo}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void leerPdf(f);
              }}
            />
            <Boton tamano="sm" variante="sol" icono={<Icono nombre="importar" tamano={20} />} onClick={() => archivo.current?.click()} disabled={leyendo}>
              {leyendo ? "Leyendo PDF…" : "Subir PDF"}
            </Boton>
            <button type="button" className="ah-chip ah-chip--boton" aria-expanded={verEjemplo} onClick={() => setVerEjemplo((v) => !v)}>
              {verEjemplo ? "Ocultar ejemplo" : "Ver ejemplo"}
            </button>
            {verEjemplo && (
              <button type="button" className="ah-chip ah-chip--boton" onClick={() => setTexto(EJEMPLO)}>
                Usar el ejemplo
              </button>
            )}
          </div>
          {verEjemplo && <pre className="imp__ejemplo">{EJEMPLO}</pre>}
          <label className="sr" htmlFor="imp-texto">
            Texto con las preguntas
          </label>
          <textarea
            id="imp-texto"
            className="imp__texto"
            placeholder={"1. ¿Tu pregunta?\na) Opción\nb) Opción correcta ✅\nc) Opción"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            spellCheck={false}
          />
          {error && (
            <p className="editor-faltan" role="alert">
              <span aria-hidden="true">!</span> {error}
            </p>
          )}
        </div>

        <section className="imp__vista" aria-label="Vista previa" aria-live="polite">
          <div className="imp__vista-cabecera">
            <span className="lbl">Vista previa · {resultado.length}</span>
            {conAvisos > 0 && <Chip color="sol">{conAvisos} para revisar</Chip>}
          </div>
          {resultado.length === 0 ? (
            <p className="meta imp__vacio">{texto.trim() ? "No encontramos preguntas. Numera cada una: «1.», «2.»…" : "Aquí verás las preguntas detectadas."}</p>
          ) : (
            <ol className="imp__lista">
              {resultado.map(({ pregunta: p, avisos }, i) => (
                <li key={p.clave} className={`imp__item${avisos.length ? " imp__item--aviso" : ""}`}>
                  <div className="imp__item-cabecera">
                    <span className="f imp__num">{i + 1}</span>
                    <Chip>{infoTipo(p.tipo).nombre}</Chip>
                  </div>
                  <p className="f imp__enunciado">{p.enunciado || "(sin enunciado)"}</p>
                  <Respuestas p={p} />
                  {avisos.map((a) => (
                    <p key={a} className="imp__aviso">
                      ⚠ {a}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="vista__pie">
        <Boton onClick={onCerrar}>Cancelar</Boton>
        <Boton variante="arco" icono={<Icono nombre="mas" />} disabled={resultado.length === 0} onClick={() => onImportar(resultado.map((r) => r.pregunta))}>
          {resultado.length === 1 ? "Agregar 1 pregunta" : `Agregar ${resultado.length} preguntas`}
        </Boton>
      </div>
    </dialog>
  );
}
