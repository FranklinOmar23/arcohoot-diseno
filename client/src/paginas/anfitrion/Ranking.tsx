import { Boton, Chip, Icono, Logo } from "../../componentes";
import { AvatarJugador } from "../../componentes/AvatarJugador";
import { formatoPuntos, type PantallaRanking } from "../../lib/juego";

// Colores de las medallas 1-2-3 (H8): sol, laguna, arco
const MEDALLAS = [
  { fondo: "var(--sol)", texto: "var(--sobre-claro)" },
  { fondo: "var(--laguna)", texto: "var(--sobre-oscuro)" },
  { fondo: "var(--arco)", texto: "var(--sobre-claro)" },
];

interface Props {
  pantalla: PantallaRanking;
  onSiguiente: () => void;
}

/** H8 · Ranking entre preguntas */
export function Ranking({ pantalla: s, onSiguiente }: Props) {
  return (
    <div className="juego">
      <div className="juego__barra">
        <Logo soloMarca anchoMarca={48} />
        <Chip>
          Después de la pregunta {s.indice + 1} de {s.total}
        </Chip>
        <div style={{ flex: 1 }} />
        <Boton variante="anil" onClick={onSiguiente}>
          Siguiente pregunta <Icono nombre="adelante" grosor={3} />
        </Boton>
      </div>

      <div className="rank__cabecera">
        <h1 className="f rank__titulo">Ranking</h1>
        {s.destacado && (
          <p className="f pop rank__destacado" style={{ animationDelay: "1s" }}>
            ¡{s.destacado.apodo} sube {s.destacado.puestos} puestos! ▲
          </p>
        )}
      </div>

      <ol className="rank__lista">
        {s.filas.map((f, i) => {
          const medalla = MEDALLAS[i] ?? { fondo: "var(--papel)", texto: "var(--tinta)" };
          const destacado = s.destacado?.apodo === f.apodo;
          return (
            <li
              key={f.id}
              className={`ah-card rise rank__fila${destacado ? " rank__fila--destacada" : ""}`}
              style={{ ["--from" as string]: `${-f.cambio * 96}px`, animationDelay: `${i * 0.1}s` }}
            >
              <span className="f rank__puesto" style={{ background: medalla.fondo, color: medalla.texto }}>
                {i + 1}
              </span>
              <AvatarJugador apodo={f.apodo} color={f.color} tamano={48} />
              <span className="f rank__apodo">{f.apodo}</span>
              {f.racha >= 2 && <Chip>🔥 {f.racha}</Chip>}
              {f.cambio > 0 && (
                <Chip color="exito" icono={<Icono nombre="subir" tamano={18} grosor={3} />}>
                  {f.cambio}
                  <span className="sr"> puestos arriba</span>
                </Chip>
              )}
              {f.cambio < 0 && (
                <Chip color="error" icono={<Icono nombre="bajar" tamano={18} grosor={3} />}>
                  {-f.cambio}
                  <span className="sr"> puestos abajo</span>
                </Chip>
              )}
              <span className="f rank__puntos">{formatoPuntos(f.puntos)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
