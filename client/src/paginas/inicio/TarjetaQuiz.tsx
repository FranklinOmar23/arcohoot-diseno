import { Link } from "react-router-dom";
import { Boton, Forma, Icono } from "../../componentes";
import type { ResumenQuiz } from "../../lib/api";
import { haceCuanto, plural } from "../../lib/fecha";
import { portada } from "./portadas";

const posiciones = [
  { tamano: 56, estilo: { left: 18, top: 22 }, giro: "-12deg", retraso: "0s" },
  { tamano: 44, estilo: { left: 92, top: 46 }, giro: "10deg", retraso: "-0.8s" },
  { tamano: 64, estilo: { right: 24, top: 16 }, giro: "0deg", retraso: "-1.6s" },
] as const;

export function TarjetaQuiz({ quiz }: { quiz: ResumenQuiz }) {
  const p = portada(quiz.portada);
  return (
    <article className="ah-card tarjeta-quiz">
      <div className="tarjeta-quiz__portada" style={{ background: p.fondo }} aria-hidden="true">
        {p.figuras.map((fig, i) => {
          const pos = posiciones[i];
          return (
            <span
              key={i}
              className="floaty tarjeta-quiz__figura"
              style={{ ...pos.estilo, ["--r" as string]: pos.giro, animationDelay: pos.retraso }}
            >
              <Forma forma={fig.forma} tamano={pos.tamano} color={fig.color} />
            </span>
          );
        })}
      </div>
      <div className="tarjeta-quiz__cuerpo">
        <h3 className="f tarjeta-quiz__titulo">
          <Link to={`/editor/${quiz.id}`} className="tarjeta-quiz__enlace">
            {quiz.titulo}
          </Link>
        </h3>
        <p className="meta">
          {plural(quiz.numPreguntas, "pregunta", "preguntas")} · {haceCuanto(quiz.actualizadoEn)}
        </p>
        <div className="tarjeta-quiz__pie">
          <span className="meta">
            {quiz.vecesJugado === 0 ? "Aún sin jugar" : `Jugado ${plural(quiz.vecesJugado, "vez", "veces")}`}
          </span>
          <Boton
            to={`/lanzar/${quiz.id}`}
            variante="sol"
            tamano="sm"
            soloIcono
            className="tarjeta-quiz__jugar"
            aria-label={`Jugar ${quiz.titulo}`}
            icono={<Icono nombre="jugar" tamano={16} />}
          />
        </div>
      </div>
    </article>
  );
}
