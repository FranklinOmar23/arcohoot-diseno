import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Boton, Icono, Logo } from "../../componentes";
import { api } from "../../lib/api";
import { haceCuanto } from "../../lib/fecha";
import {
  aServidor,
  cambiarTipo,
  MAX_ENUNCIADO,
  nuevaClave,
  nuevaPregunta,
  problemas,
  type Pregunta,
  type TipoPregunta,
} from "../../juego/preguntas";
import { EditorRespuestas } from "./EditorRespuestas";
import { ListaPreguntas } from "./ListaPreguntas";
import { PanelPropiedades } from "./PanelPropiedades";
import { useAutoguardado } from "./useAutoguardado";
import { VistaPrevia } from "./VistaPrevia";
import { ImportarPreguntas } from "./ImportarPreguntas";
import { ZonaImagen } from "./ZonaImagen";
import "./Editor.css";

interface QuizServidor {
  id: string;
  titulo: string;
  actualizadoEn: string;
  preguntas: Omit<Pregunta, "clave">[];
}

/** H2 · Editor de quiz */
export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const [cargaError, setCargaError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [sel, setSel] = useState(0);
  const [version, setVersion] = useState(0);
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [borrada, setBorrada] = useState<{ pregunta: Pregunta; indice: number } | null>(null);
  const [vista, setVista] = useState(false);
  const [importando, setImportando] = useState(false);
  const [, refrescar] = useState(0);
  const enunciadoRef = useRef<HTMLTextAreaElement>(null);

  // Cargar
  useEffect(() => {
    api<{ quiz: QuizServidor }>(`/quizzes/${id}`)
      .then(({ quiz }) => {
        setTitulo(quiz.titulo);
        const ps = quiz.preguntas.map((p) => ({ ...p, clave: nuevaClave() }) as Pregunta);
        setPreguntas(ps.length ? ps : [nuevaPregunta()]);
        // Un quiz nuevo arranca con una pregunta vacía: cuenta como cambio por guardar
        if (!ps.length) setVersion(1);
        setUltimoGuardado(quiz.actualizadoEn);
      })
      .catch((e: Error) => setCargaError(e.message));
  }, [id]);

  // "Guardado hace 1 min" se mantiene al día
  useEffect(() => {
    const t = setInterval(() => refrescar((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const estadoRef = useRef({ titulo, preguntas });
  estadoRef.current = { titulo, preguntas };

  const guardar = useCallback(async () => {
    const { titulo: t, preguntas: ps } = estadoRef.current;
    if (!ps) return;
    const r = await api<{ actualizadoEn: string }>(`/quizzes/${id}`, {
      metodo: "PUT",
      cuerpo: { titulo: t.trim(), preguntas: ps.map(aServidor) },
    });
    setUltimoGuardado(r.actualizadoEn);
  }, [id]);

  const { estado, error: errorGuardado, guardarAhora } = useAutoguardado(version, guardar);

  const cambio = () => setVersion((v) => v + 1);

  function actualizar(fn: (p: Pregunta) => Pregunta) {
    setPreguntas((ps) => ps && ps.map((p, i) => (i === sel ? fn(p) : p)));
    cambio();
  }

  function agregar() {
    if (!preguntas) return;
    const tipo = preguntas[sel]?.tipo ?? "quiz";
    const n = [...preguntas.slice(0, sel + 1), nuevaPregunta(tipo), ...preguntas.slice(sel + 1)];
    setPreguntas(n);
    setSel(sel + 1);
    cambio();
    requestAnimationFrame(() => enunciadoRef.current?.focus());
  }

  function duplicar() {
    if (!preguntas) return;
    const copia = { ...structuredClone(preguntas[sel]), clave: nuevaClave() };
    setPreguntas([...preguntas.slice(0, sel + 1), copia, ...preguntas.slice(sel + 1)]);
    setSel(sel + 1);
    cambio();
    setAviso("Pregunta duplicada.");
  }

  function borrar() {
    if (!preguntas || preguntas.length <= 1) return;
    setBorrada({ pregunta: preguntas[sel], indice: sel });
    setPreguntas(preguntas.filter((_, i) => i !== sel));
    setSel(Math.max(0, sel - 1));
    cambio();
  }

  function deshacerBorrado() {
    if (!borrada || !preguntas) return;
    const n = [...preguntas];
    n.splice(borrada.indice, 0, borrada.pregunta);
    setPreguntas(n);
    setSel(borrada.indice);
    setBorrada(null);
    cambio();
  }

  useEffect(() => {
    if (!borrada) return;
    const t = setTimeout(() => setBorrada(null), 7000);
    return () => clearTimeout(t);
  }, [borrada]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  function importar(nuevas: Pregunta[]) {
    if (!preguntas || nuevas.length === 0) return;
    // Un quiz recién creado solo tiene una pregunta vacía: se reemplaza en vez de dejarla al principio
    const soloVacia = preguntas.length === 1 && !preguntas[0].enunciado.trim();
    const base = soloVacia ? [] : preguntas;
    setPreguntas([...base, ...nuevas]);
    setSel(base.length);
    cambio();
    setImportando(false);
    const revisar = nuevas.filter((p) => problemas(p).length > 0).length;
    setAviso(
      `Se ${nuevas.length === 1 ? "agregó 1 pregunta" : `agregaron ${nuevas.length} preguntas`}.` +
        (revisar ? ` ${revisar} necesita${revisar === 1 ? "" : "n"} revisión (marcadas con «!»).` : ""),
    );
  }

  function mover(desde: number, hasta: number) {
    if (!preguntas) return;
    const n = [...preguntas];
    const [p] = n.splice(desde, 1);
    n.splice(hasta, 0, p);
    setPreguntas(n);
    setSel(hasta);
    cambio();
  }

  async function lanzar() {
    if (!preguntas) return;
    const primera = preguntas.findIndex((p) => problemas(p).length > 0);
    if (primera >= 0) {
      setSel(primera);
      setAviso(`La pregunta ${primera + 1} está incompleta: ${problemas(preguntas[primera])[0]}`);
      return;
    }
    if (await guardarAhora()) navegar(`/lanzar/${id}`);
  }

  if (cargaError) {
    return (
      <div className="editor editor--centro">
        <div className="ah-card editor-carga">
          <p className="f" style={{ fontSize: 24, fontWeight: 600 }}>
            {cargaError}
          </p>
          <Boton to="/" variante="sol">
            Volver a mis quizzes
          </Boton>
        </div>
      </div>
    );
  }
  if (!preguntas) {
    return (
      <div className="editor editor--centro" aria-busy="true">
        <p className="meta">Cargando quiz…</p>
      </div>
    );
  }

  const p = preguntas[sel];
  const faltan = problemas(p);
  const textoEstado =
    estado === "guardando"
      ? "Guardando…"
      : estado === "pendiente"
        ? "Cambios sin guardar"
        : estado === "error"
          ? "No se pudo guardar"
          : ultimoGuardado
            ? `Guardado ${haceCuanto(ultimoGuardado)}`
            : "";

  return (
    <div className="editor">
      <header className="editor__barra">
        <Link to="/" className="editor__logo" aria-label="ArcoHoot · volver a mis quizzes">
          <Logo />
        </Link>
        <span className="editor__divisor" aria-hidden="true" />
        <label className="sr" htmlFor="titulo">
          Título del quiz
        </label>
        <input
          id="titulo"
          className="ah-campo__input editor__titulo"
          value={titulo}
          maxLength={120}
          placeholder="Ponle título a tu quiz"
          onChange={(e) => {
            setTitulo(e.target.value);
            cambio();
          }}
        />
        <span className={`meta editor__estado${estado === "error" ? " editor__estado--error" : ""}`} role="status" title={errorGuardado || undefined}>
          {textoEstado}
        </span>
        <div style={{ flex: 1 }} />
        <Boton tamano="sm" icono={<Icono nombre="importar" tamano={20} />} onClick={() => setImportando(true)}>
          Importar
        </Boton>
        <Boton tamano="sm" icono={<Icono nombre="ojo" tamano={20} />} onClick={() => setVista(true)}>
          Vista previa
        </Boton>
        <Boton tamano="sm" onClick={() => void guardarAhora()} disabled={estado === "guardando"}>
          Guardar
        </Boton>
        <Boton variante="sol" tamano="sm" icono={<Icono nombre="jugar" tamano={18} />} onClick={lanzar}>
          Lanzar
        </Boton>
      </header>

      <div className="editor__cuerpo">
        <ListaPreguntas
          preguntas={preguntas}
          seleccion={sel}
          onSeleccionar={setSel}
          onAgregar={agregar}
          onDuplicar={duplicar}
          onBorrar={borrar}
          onMover={mover}
        />

        <main className="editor__centro" aria-label={`Pregunta ${sel + 1}`}>
          <div className="ah-panel editor-enunciado">
            <label className="lbl" htmlFor="enun">
              Enunciado · pregunta {sel + 1}
            </label>
            <textarea
              id="enun"
              ref={enunciadoRef}
              rows={2}
              maxLength={MAX_ENUNCIADO}
              className="f editor-enunciado__texto"
              placeholder="Escribe tu pregunta"
              value={p.enunciado}
              onChange={(e) => actualizar((q) => ({ ...q, enunciado: e.target.value }))}
            />
          </div>

          {p.tipo === "pin" ? (
            <ZonaImagen
              imagen={p.imagen}
              onImagen={(imagen) => actualizar((q) => ({ ...q, imagen }))}
              onError={setAviso}
              zona={p.datos.zona}
              onZona={(zona) => actualizar((q) => (q.tipo === "pin" ? { ...q, datos: { zona } } : q))}
            />
          ) : (
            <ZonaImagen imagen={p.imagen} onImagen={(imagen) => actualizar((q) => ({ ...q, imagen }))} onError={setAviso} />
          )}

          <EditorRespuestas pregunta={p} onDatos={(datos) => actualizar((q) => ({ ...q, datos }) as Pregunta)} />

          {faltan.length > 0 && (
            <p className="editor-faltan">
              <span aria-hidden="true">!</span> {faltan.join(" ")}
            </p>
          )}
        </main>

        <PanelPropiedades
          pregunta={p}
          onTipo={(t: TipoPregunta) => actualizar((q) => cambiarTipo(q, t))}
          onTiempo={(tiempo) => actualizar((q) => ({ ...q, tiempo }))}
          onImagen={(imagen) => actualizar((q) => ({ ...q, imagen }))}
          onPuntosDobles={(puntosDobles) => actualizar((q) => ({ ...q, puntosDobles }))}
          onError={setAviso}
        />
      </div>

      <div className="editor-avisos" aria-live="polite">
        {borrada && (
          <div className="ah-card editor-toast slidein">
            <span>Pregunta borrada.</span>
            <Boton tamano="sm" variante="sol" onClick={deshacerBorrado}>
              Deshacer
            </Boton>
          </div>
        )}
        {(aviso || (estado === "error" && errorGuardado)) && (
          <div className="ah-card editor-toast slidein">
            <span>{aviso || errorGuardado}</span>
          </div>
        )}
      </div>

      {importando && <ImportarPreguntas onImportar={importar} onCerrar={() => setImportando(false)} />}
      {vista && <VistaPrevia preguntas={preguntas} indice={sel} onIndice={setSel} onCerrar={() => setVista(false)} />}
    </div>
  );
}
