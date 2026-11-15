import { useState } from "react";
import { Boton, Logo } from "../../componentes";
import { AvatarJugador } from "../../componentes/AvatarJugador";
import { Confeti } from "../../componentes/Confeti";
import { formatoPuntos, type PantallaPodio } from "../../lib/juego";
import { plural } from "../../lib/fecha";

// En el DOM van 1.º, 2.º, 3.º (orden de lectura); en pantalla se ven 2.º – 1.º – 3.º. Alturas y retrasos de H9.
const COLUMNAS = [
  { puesto: 1, alto: 270, fondo: "var(--sol)", texto: "var(--sobre-claro)", retrasoBloque: 1.6, retrasoNombre: 2.3 },
  { puesto: 2, alto: 190, fondo: "var(--laguna)", texto: "var(--sobre-oscuro)", retrasoBloque: 0.8, retrasoNombre: 1.5 },
  { puesto: 3, alto: 130, fondo: "var(--arco)", texto: "var(--sobre-claro)", retrasoBloque: 0, retrasoNombre: 0.7 },
];

function IconoRuta({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

interface Props {
  pantalla: PantallaPodio;
  onInicio: () => void;
  onOtraVez: () => void;
}

/** H9 · Podio final */
export function Podio({ pantalla: s, onInicio, onOtraVez }: Props) {
  const [error, setError] = useState("");
  const [bajando, setBajando] = useState(false);

  async function exportar() {
    setError("");
    setBajando(true);
    try {
      const res = await fetch(`/api/partidas/${s.partidaId}/excel`, { credentials: "same-origin" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo exportar.");
      const blob = await res.blob();
      const nombre = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "resultados.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBajando(false);
    }
  }

  return (
    <div className="juego podio">
      <Confeti cantidad={22} />
      <div className="juego__barra">
        <Logo />
        <div style={{ flex: 1 }} />
        <Boton tamano="sm" icono={<IconoRuta d="M3 11 12 4l9 7M5 10v10h14V10" />} onClick={onInicio}>
          Inicio
        </Boton>
        <Boton tamano="sm" icono={<IconoRuta d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />} onClick={onOtraVez}>
          Jugar de nuevo
        </Boton>
        <Boton variante="anil" icono={<IconoRuta d="M12 4v11M7 10l5 5 5-5M5 20h14" />} onClick={exportar} disabled={bajando}>
          {bajando ? "Preparando…" : "Exportar resultados a Excel"}
        </Boton>
      </div>
      {error && (
        <p className="podio__error" role="alert">
          {error}
        </p>
      )}
      <h1 className="f pop podio__titulo">¡Tenemos ganadores!</h1>
      <p className="meta podio__sub">
        {s.titulo} · {plural(s.jugadores, "jugador", "jugadores")} · {plural(s.total, "pregunta", "preguntas")}
      </p>

      <ol className="podio__escenario">
        {COLUMNAS.map((c) => {
          const g = s.podio.find((x) => x.puesto === c.puesto);
          return (
            <li key={c.puesto} className="podio__columna" style={{ order: c.puesto === 1 ? 2 : c.puesto === 2 ? 1 : 3 }}>
              {g && (
                <div className="pop podio__ganador" style={{ animationDelay: `${c.retrasoNombre}s` }}>
                  {c.puesto === 1 && (
                    <span className="podio__corona" aria-hidden="true">
                      👑
                    </span>
                  )}
                  <AvatarJugador apodo={g.apodo} color={g.color} tamano={76} />
                  <span className="f podio__apodo">{g.apodo}</span>
                  <span className="f podio__puntos">{formatoPuntos(g.puntos)} pts</span>
                </div>
              )}
              <div
                className="rise podio__bloque"
                style={{ ["--from" as string]: `${c.alto}px`, animationDelay: `${c.retrasoBloque}s`, height: c.alto, background: c.fondo, color: c.texto }}
                aria-label={g ? `${c.puesto}.º lugar: ${g.apodo}, ${g.puntos} puntos` : `${c.puesto}.º lugar vacío`}
              >
                <span className="f podio__num" aria-hidden="true">
                  {c.puesto}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
