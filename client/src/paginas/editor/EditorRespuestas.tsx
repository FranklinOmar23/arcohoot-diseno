import { useEffect, useId, useState } from "react";
import { Forma, FORMAS, Icono } from "../../componentes";
import { nombreLegible, type NombreForma } from "../../componentes/Forma";
import {
  MAX_ELEMENTO_PUZZLE,
  MAX_OPCION,
  MAX_RESPUESTA_CORTA,
  type DatosPorTipo,
  type Pregunta,
} from "../../juego/preguntas";

interface Props {
  pregunta: Pregunta;
  onDatos: (datos: Pregunta["datos"]) => void;
}

/** Botón redondo "marcar como correcta" de H2 */
function MarcaCorrecta({ correcta, onClick, etiqueta }: { correcta: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      className={`editor-correcta${correcta ? " editor-correcta--si" : ""}`}
      aria-pressed={correcta}
      aria-label={etiqueta}
      title={correcta ? "Correcta" : "Marcar como correcta"}
      onClick={onClick}
    >
      {correcta && <Icono nombre="correcto" tamano={20} grosor={3} />}
    </button>
  );
}

function RespuestasQuiz({ datos, onDatos }: { datos: DatosPorTipo["quiz"]; onDatos: (d: DatosPorTipo["quiz"]) => void }) {
  const ops = datos.opciones;
  const cambiar = (i: number, cambio: Partial<(typeof ops)[number]>) =>
    onDatos({ opciones: ops.map((o, j) => (j === i ? { ...o, ...cambio } : o)) });

  return (
    <div className="editor-opciones">
      {ops.map((o, i) => {
        const forma = FORMAS[i];
        return (
          <div key={forma} className={`ah-op ah-op--${forma} editor-op`}>
            <Forma forma={forma} tamano={26} />
            <label className="sr" htmlFor={`op-${i}`}>
              Respuesta {i + 1} ({nombreLegible[forma]})
            </label>
            <input
              id={`op-${i}`}
              className="editor-op__input"
              value={o.texto}
              maxLength={MAX_OPCION}
              placeholder={`Respuesta ${i + 1}${i >= 2 ? " (opcional)" : ""}`}
              onChange={(e) => cambiar(i, { texto: e.target.value })}
            />
            {ops.length > 2 && (
              <button
                type="button"
                className="editor-op__quitar"
                aria-label={`Quitar respuesta ${i + 1}`}
                title="Quitar"
                onClick={() => {
                  const resto = ops.filter((_, j) => j !== i);
                  onDatos({ opciones: resto });
                }}
              >
                <Icono nombre="incorrecto" tamano={16} grosor={3} />
              </button>
            )}
            <MarcaCorrecta
              correcta={o.correcta}
              etiqueta={`Respuesta ${i + 1} correcta`}
              onClick={() => cambiar(i, { correcta: !o.correcta })}
            />
          </div>
        );
      })}
      {ops.length < 4 && (
        <button
          type="button"
          className="editor-agregar-op"
          onClick={() => onDatos({ opciones: [...ops, { texto: "", correcta: false }] })}
        >
          <Icono nombre="mas" tamano={20} /> Agregar respuesta
        </button>
      )}
    </div>
  );
}

function RespuestasVF({ datos, onDatos }: { datos: DatosPorTipo["verdadero_falso"]; onDatos: (d: DatosPorTipo["verdadero_falso"]) => void }) {
  // Verdadero = círculo, Falso = rombo
  const filas: { valor: boolean; texto: string; forma: NombreForma }[] = [
    { valor: true, texto: "Verdadero", forma: "circulo" },
    { valor: false, texto: "Falso", forma: "rombo" },
  ];
  return (
    <div className="editor-opciones" role="radiogroup" aria-label="Respuesta correcta">
      {filas.map((f) => (
        <div key={f.texto} className={`ah-op ah-op--${f.forma} editor-op`}>
          <Forma forma={f.forma} tamano={26} />
          <span className="editor-op__fijo">{f.texto}</span>
          <MarcaCorrecta
            correcta={datos.correcta === f.valor}
            etiqueta={`${f.texto} es la correcta`}
            onClick={() => onDatos({ correcta: f.valor })}
          />
        </div>
      ))}
    </div>
  );
}

function RespuestasCortas({ datos, onDatos }: { datos: DatosPorTipo["respuesta_corta"]; onDatos: (d: DatosPorTipo["respuesta_corta"]) => void }) {
  const rs = datos.respuestas;
  return (
    <div className="ah-panel editor-bloque">
      <div className="editor-bloque__cabecera">
        <span className="lbl">Respuestas aceptadas</span>
        <span className="meta">No importan mayúsculas ni tildes</span>
      </div>
      <div className="editor-cortas">
        {rs.map((r, i) => (
          <div key={i} className="editor-corta">
            <label className="sr" htmlFor={`corta-${i}`}>
              Respuesta aceptada {i + 1}
            </label>
            <input
              id={`corta-${i}`}
              className="ah-campo__input editor-corta__input"
              value={r}
              maxLength={MAX_RESPUESTA_CORTA}
              placeholder={i === 0 ? "Ej.: 911" : "Otra forma de escribirla"}
              onChange={(e) => onDatos({ respuestas: rs.map((x, j) => (j === i ? e.target.value : x)) })}
            />
            <span className="meta editor-corta__cuenta" aria-hidden="true">
              {r.length} / {MAX_RESPUESTA_CORTA}
            </span>
            {rs.length > 1 && (
              <button
                type="button"
                className="editor-icono"
                aria-label={`Quitar respuesta aceptada ${i + 1}`}
                onClick={() => onDatos({ respuestas: rs.filter((_, j) => j !== i) })}
              >
                <Icono nombre="basura" tamano={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      {rs.length < 4 && (
        <button type="button" className="editor-agregar-op editor-agregar-op--bajo" onClick={() => onDatos({ respuestas: [...rs, ""] })}>
          <Icono nombre="mas" tamano={20} /> Agregar otra forma válida
        </button>
      )}
    </div>
  );
}

function CampoNumero({ etiqueta, valor, onCambio, paso = 1, min }: { etiqueta: string; valor: number; onCambio: (n: number) => void; paso?: number; min?: number }) {
  const id = useId();
  // Texto local para poder borrar el campo mientras escribes
  const [texto, setTexto] = useState(String(valor));
  const [enfocado, setEnfocado] = useState(false);
  useEffect(() => {
    if (!enfocado) setTexto(String(valor));
  }, [valor, enfocado]);
  return (
    <div className="editor-num">
      <label htmlFor={id} className="lbl">
        {etiqueta}
      </label>
      <input
        id={id}
        type="number"
        className="ah-campo__input editor-num__input"
        value={texto}
        step={paso}
        min={min}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) onCambio(n);
        }}
      />
    </div>
  );
}

function RespuestaDeslizante({ datos, onDatos }: { datos: DatosPorTipo["deslizante"]; onDatos: (d: DatosPorTipo["deslizante"]) => void }) {
  const set = (c: Partial<typeof datos>) => onDatos({ ...datos, ...c });
  const u = datos.unidad ? ` ${datos.unidad}` : "";
  const valido = datos.min < datos.max;
  const idUnidad = useId();
  return (
    <div className="ah-panel editor-bloque">
      <div className="editor-deslizante__vista">
        <span className="f editor-deslizante__valor" aria-hidden="true">
          {datos.correcta}
          {u}
        </span>
        <label className="sr" htmlFor="rng-correcta">
          Respuesta correcta
        </label>
        <input
          id="rng-correcta"
          type="range"
          className="editor-rango"
          min={datos.min}
          max={valido ? datos.max : datos.min + 1}
          step={datos.paso}
          value={datos.correcta}
          onChange={(e) => set({ correcta: e.target.valueAsNumber })}
        />
        <div className="editor-deslizante__extremos meta">
          <span>
            {datos.min}
            {u}
          </span>
          <span>
            {datos.max}
            {u}
          </span>
        </div>
      </div>
      <div className="editor-deslizante__campos">
        <CampoNumero etiqueta="Mínimo" valor={datos.min} onCambio={(min) => set({ min })} />
        <CampoNumero etiqueta="Máximo" valor={datos.max} onCambio={(max) => set({ max })} />
        <CampoNumero etiqueta="Correcta" valor={datos.correcta} paso={datos.paso} onCambio={(correcta) => set({ correcta })} />
        <CampoNumero etiqueta="Margen ±" valor={datos.margen} min={0} paso={datos.paso} onCambio={(margen) => set({ margen: Math.max(0, margen) })} />
        <div className="editor-num">
          <label htmlFor={idUnidad} className="lbl">
            Unidad
          </label>
          <input
            id={idUnidad}
            className="ah-campo__input editor-num__input"
            value={datos.unidad}
            maxLength={12}
            placeholder="s, kg, %…"
            onChange={(e) => set({ unidad: e.target.value })}
          />
        </div>
      </div>
      <p className="meta">
        {datos.margen > 0
          ? `Aciertan quienes respondan entre ${datos.correcta - datos.margen} y ${datos.correcta + datos.margen}${u}.`
          : "Solo acierta quien marque el valor exacto."}
      </p>
    </div>
  );
}

const TAMANOS_ZONA = [
  { r: 6, texto: "Pequeña" },
  { r: 10, texto: "Mediana" },
  { r: 15, texto: "Grande" },
];

export function ControlesPin({ datos, onDatos }: { datos: DatosPorTipo["pin"]; onDatos: (d: DatosPorTipo["pin"]) => void }) {
  return (
    <div className="editor-pin">
      <p className="meta">Toca la imagen donde está la respuesta. Con el teclado: flechas (Mayús = más rápido).</p>
      <div className="editor-pin__tamanos" role="group" aria-label="Tamaño de la zona correcta">
        <span className="lbl">Zona</span>
        {TAMANOS_ZONA.map((t) => (
          <button
            key={t.r}
            type="button"
            className={`ah-chip ah-chip--boton ah-chip--${datos.zona.r === t.r ? "anil" : "papel"}`}
            aria-pressed={datos.zona.r === t.r}
            onClick={() => onDatos({ zona: { ...datos.zona, r: t.r } })}
          >
            {t.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

function RespuestaPuzzle({ datos, onDatos }: { datos: DatosPorTipo["puzzle"]; onDatos: (d: DatosPorTipo["puzzle"]) => void }) {
  const els = datos.elementos;
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= els.length) return;
    const n = [...els];
    [n[i], n[j]] = [n[j], n[i]];
    onDatos({ elementos: n });
  };
  return (
    <div className="ah-panel editor-bloque">
      <div className="editor-bloque__cabecera">
        <span className="lbl">Orden correcto</span>
        <span className="meta">Los jugadores los verán revueltos</span>
      </div>
      <ol className="editor-puzzle">
        {els.map((el, i) => {
          const forma = FORMAS[i];
          return (
            <li key={i} className="editor-puzzle__fila">
              <span className={`editor-puzzle__num ah-op--${forma}`} aria-hidden="true">
                <Forma forma={forma} tamano={18} />
              </span>
              <label className="sr" htmlFor={`paso-${i}`}>
                Paso {i + 1}
              </label>
              <input
                id={`paso-${i}`}
                className="ah-campo__input editor-puzzle__input"
                value={el}
                maxLength={MAX_ELEMENTO_PUZZLE}
                placeholder={i === 0 ? "Primero" : i === els.length - 1 ? "Último" : `Paso ${i + 1}`}
                onChange={(e) => onDatos({ elementos: els.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <button type="button" className="editor-icono" aria-label={`Subir paso ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                <Icono nombre="subir" tamano={18} />
              </button>
              <button
                type="button"
                className="editor-icono"
                aria-label={`Bajar paso ${i + 1}`}
                disabled={i === els.length - 1}
                onClick={() => mover(i, 1)}
              >
                <Icono nombre="bajar" tamano={18} />
              </button>
              {els.length > 2 && (
                <button type="button" className="editor-icono" aria-label={`Quitar paso ${i + 1}`} onClick={() => onDatos({ elementos: els.filter((_, j) => j !== i) })}>
                  <Icono nombre="basura" tamano={18} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {els.length < 4 && (
        <button type="button" className="editor-agregar-op editor-agregar-op--bajo" onClick={() => onDatos({ elementos: [...els, ""] })}>
          <Icono nombre="mas" tamano={20} /> Agregar paso
        </button>
      )}
    </div>
  );
}

export function EditorRespuestas({ pregunta: p, onDatos }: Props) {
  switch (p.tipo) {
    case "quiz":
      return <RespuestasQuiz datos={p.datos} onDatos={onDatos} />;
    case "verdadero_falso":
      return <RespuestasVF datos={p.datos} onDatos={onDatos} />;
    case "respuesta_corta":
      return <RespuestasCortas datos={p.datos} onDatos={onDatos} />;
    case "deslizante":
      return <RespuestaDeslizante datos={p.datos} onDatos={onDatos} />;
    case "pin":
      return <ControlesPin datos={p.datos} onDatos={onDatos} />;
    case "puzzle":
      return <RespuestaPuzzle datos={p.datos} onDatos={onDatos} />;
  }
}
