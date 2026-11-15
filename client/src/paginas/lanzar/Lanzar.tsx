import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Boton, Chip, Forma, FORMAS, Icono, Interruptor, Logo, MedallonPoder } from "../../componentes";
import type { IdPoder } from "../../juego/poderes";
import { api } from "../../lib/api";
import { plural } from "../../lib/fecha";
import "./Lanzar.css";

type Modo = "clasico" | "poderes";

const MODOS: {
  id: Modo;
  nombre: string;
  etiqueta?: string;
  descripcion: string;
  puntos: string[];
}[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Preguntas, puntos por acertar y por rapidez, y ranking entre preguntas.",
    puntos: ["Ideal para clases y evaluaciones", "Sin distracciones", "Resultados exportables"],
  },
  {
    id: "poderes",
    nombre: "Con poderes",
    etiqueta: "Más divertido",
    descripcion: "Al acertar ganas poderes al azar: protégete, gana tiempo o complícale la vida a un rival.",
    puntos: ["9 poderes con rareza", "Feed de jugadas en la pantalla", "Ideal para repasos e inducciones"],
  },
];

const PODERES_VITRINA: IdPoder[] = ["doble", "escudo", "congelar", "revolver"];
const COLORES_FORMA = ["var(--sol)", "var(--arco)", "var(--laguna)", "var(--anil)"];
const GIROS = ["-6deg", "4deg", "0deg", "6deg"];

/** H3 · ¿Cómo quieres jugar? */
export function Lanzar() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const [quiz, setQuiz] = useState<{ titulo: string; numPreguntas: number } | null>(null);
  const [modo, setModo] = useState<Modo>("poderes");
  const [apodos, setApodos] = useState(true);
  const [error, setError] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    api<{ quiz: { titulo: string; preguntas: unknown[] } }>(`/quizzes/${id}`)
      .then(({ quiz: q }) => setQuiz({ titulo: q.titulo, numPreguntas: q.preguntas.length }))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function abrirSala() {
    setAbriendo(true);
    setError("");
    try {
      const r = await api<{ partida: { pin: string } }>("/partidas", {
        metodo: "POST",
        cuerpo: { quizId: id, modo, apodosVisibles: apodos },
      });
      navegar(`/anfitrion/${r.partida.pin}`);
    } catch (e) {
      setError((e as Error).message);
      setAbriendo(false);
    }
  }

  return (
    <div className="lanzar">
      <header className="lanzar__barra">
        <Logo />
        <div style={{ flex: 1 }} />
        {quiz && (
          <Chip>
            {quiz.titulo} · {plural(quiz.numPreguntas, "pregunta", "preguntas")}
          </Chip>
        )}
      </header>

      <div className="lanzar__intro">
        <h1 className="f">¿Cómo quieres jugar?</h1>
        <p>Elige un modo. Puedes cambiarlo en la próxima partida.</p>
      </div>

      <div role="radiogroup" aria-label="Modo de juego" className="lanzar__modos">
        {MODOS.map((m) => {
          const sel = modo === m.id;
          return (
            <label key={m.id} className={`ah-card lanzar-modo${sel ? " lanzar-modo--sel" : ""}`}>
              <input type="radio" name="modo" className="sr" checked={sel} onChange={() => setModo(m.id)} />
              <span aria-hidden="true" className="lanzar-modo__radio">
                {sel && <span />}
              </span>
              <div className="lanzar-modo__arte" aria-hidden="true">
                {m.id === "clasico"
                  ? FORMAS.map((f, i) => (
                      <span key={f} className="floaty" style={{ ["--r" as string]: GIROS[i], animationDelay: `${-0.5 * i}s` }}>
                        <Forma forma={f} tamano={60} color={COLORES_FORMA[i]} />
                      </span>
                    ))
                  : PODERES_VITRINA.map((p, i) => (
                      <span key={p} className="floaty" style={{ animationDelay: `${-0.5 * i}s` }}>
                        <MedallonPoder poder={p} tamano={68} />
                      </span>
                    ))}
              </div>
              <div className="lanzar-modo__nombre">
                <span className="f">{m.nombre}</span>
                {m.etiqueta && <Chip color="sol">{m.etiqueta}</Chip>}
              </div>
              <p className="lanzar-modo__desc">{m.descripcion}</p>
              <ul className="lanzar-modo__puntos">
                {m.puntos.map((t) => (
                  <li key={t}>
                    <span className="lanzar-modo__check">
                      <Icono nombre="correcto" tamano={16} grosor={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="lanzar__error" role="alert">
          {error}
        </p>
      )}

      <div className="lanzar__pie">
        <Boton to={`/editor/${id}`} icono={<Icono nombre="atras" />}>
          Volver
        </Boton>
        <div className="lanzar__apodos">
          <span className="meta" id="lbl-apodos">
            Apodos visibles en pantalla
          </span>
          <Interruptor activo={apodos} onCambio={setApodos} idEtiqueta="lbl-apodos" />
        </div>
        <Boton variante="sol" tamano="lg" onClick={abrirSala} disabled={abriendo || !quiz}>
          {abriendo ? "Abriendo…" : "Abrir sala"} <Icono nombre="adelante" tamano={26} grosor={3} />
        </Boton>
      </div>
    </div>
  );
}
