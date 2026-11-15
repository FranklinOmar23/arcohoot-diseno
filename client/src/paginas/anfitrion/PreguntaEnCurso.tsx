import { Boton, Chip, Cronometro, Forma, FORMAS, Logo, MedallonPoder } from "../../componentes";
import "../jugar/Poderes.css";
import { infoTipo } from "../../juego/preguntas";
import { useReloj, type PantallaPreguntaAnfitrion } from "../../lib/juego";

interface Props {
  pantalla: PantallaPreguntaAnfitrion;
  onSaltar: () => void;
}

const AVISO: Record<string, string> = {
  respuesta_corta: "Escribe tu respuesta en el celular",
  deslizante: "Desliza hasta tu respuesta en el celular",
  pin: "Pon tu pin en la imagen desde el celular",
  puzzle: "Ordena los pasos en el celular",
};

/** H5 · Pregunta en curso (pantalla grande) */
export function PreguntaEnCurso({ pantalla: s, onSaltar }: Props) {
  const p = s.pregunta;
  const { previa, restante } = useReloj(s, s.indice);
  const conOpciones = p.tipo === "quiz" || p.tipo === "verdadero_falso";
  const opciones = p.tipo === "verdadero_falso" ? ["Verdadero", "Falso"] : (p.opciones ?? []);
  const formas = p.tipo === "verdadero_falso" ? (["circulo", "rombo"] as const) : FORMAS;

  const conPoderes = s.modo === "poderes";
  const contenido = (
    <>
      <div className="juego__barra">
        <Logo soloMarca anchoMarca={48} />
        <Chip>
          Pregunta {s.indice + 1} de {s.total}
        </Chip>
        {p.puntosDobles && <Chip color="sol">Puntos dobles ⚡</Chip>}
        <div style={{ flex: 1 }} />
        <Boton tamano="sm" onClick={onSaltar}>
          Saltar
        </Boton>
      </div>

      <div className="ah-card juego__enunciado">
        <h1 className="f">{p.enunciado}</h1>
      </div>

      <div className="juego__centro">
        {previa > 0 && (
          <div className="juego__previa" role="timer" aria-live="assertive" aria-label={`Empieza en ${previa}`}>
            <span className="f juego__previa-titulo">¡Prepárate!</span>
            <span key={previa} className="f pop juego__previa-num">
              {previa}
            </span>
          </div>
        )}
        <Cronometro restante={restante} total={p.tiempo} />
        {p.imagen ? (
          <div className="juego__imagen">
            <img src={p.imagen} alt="" />
          </div>
        ) : (
          <p className="f juego__tipo">{conOpciones ? infoTipo(p.tipo).nombre : AVISO[p.tipo]}</p>
        )}
        <div className="juego__respuestas" aria-live="polite">
          <span key={s.respondieron} className="f pop juego__respuestas-num">
            {s.respondieron}
          </span>
          <span className="f juego__respuestas-de">de {s.conectados}</span>
          <span className="meta">respuestas</span>
        </div>
      </div>

      {conOpciones ? (
        <div className="juego__opciones">
          {opciones.map((texto, i) => (
            <div key={i} className={`ah-op ah-op--${formas[i]} juego__opcion`}>
              <Forma forma={formas[i]} tamano={34} />
              <span>{texto}</span>
            </div>
          ))}
        </div>
      ) : (
        p.imagen && <p className="f juego__tipo juego__tipo--abajo">{AVISO[p.tipo]}</p>
      )}
    </>
  );

  if (!conPoderes) return <div className="juego">{contenido}</div>;
  return (
    <div className="juego juego--poderes">
      <div className="juego__principal">{contenido}</div>
      <aside className="ah-panel feed" aria-label="Poderes en juego">
        <div className="feed__cabecera">
          <span className="blink feed__punto" aria-hidden="true" />
          <span className="lbl" style={{ color: "var(--tinta)" }}>
            Poderes en juego
          </span>
        </div>
        {s.feed.length === 0 ? (
          <p className="feed__vacio">Aún nadie usó un poder. ¡Atentos!</p>
        ) : (
          <ul className="feed__lista" aria-live="polite">
            {s.feed.map((f, i) => (
              <li key={`${f.en}-${f.texto}`} className={`slidein feed__item${i === 0 ? " feed__item--nuevo" : ""}`}>
                {f.poder === "bloqueo" ? <MedallonPoder poder="escudo" tamano={44} /> : <MedallonPoder poder={f.poder} tamano={44} />}
                <div style={{ minWidth: 0 }}>
                  <div className="feed__texto">{f.texto}</div>
                  <div className="meta" style={{ fontSize: 13 }}>
                    {hace(f.haceMs)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

const hace = (ms: number) => (ms < 2000 ? "ahora" : `hace ${Math.round(ms / 1000)} s`);
