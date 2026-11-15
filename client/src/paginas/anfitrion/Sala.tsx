import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Boton, Chip, Icono, Logo, Tarjeta } from "../../componentes";
import { AvatarJugador } from "../../componentes/AvatarJugador";
import { CodigoQR } from "../../componentes/CodigoQR";
import { obtenerSocket, pedir, type EstadoSala } from "../../lib/socket";
import { formatoPin, useUrlJuego } from "../../lib/urlJuego";
import type { PantallaAnfitrion } from "../../lib/juego";
import { PreguntaEnCurso } from "./PreguntaEnCurso";
import { Resultado } from "./Resultado";
import { Ranking } from "./Ranking";
import { Podio } from "./Podio";
import "./Sala.css";
import "./Juego.css";

/** H4 · Sala de espera (pantalla grande) */
export function Sala() {
  const { pin = "" } = useParams<{ pin: string }>();
  const navegar = useNavigate();
  const [sala, setSala] = useState<EstadoSala | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [empezando, setEmpezando] = useState(false);
  const [pantalla, setPantalla] = useState<PantallaAnfitrion | null>(null);
  const { base, url } = useUrlJuego(pin);

  useEffect(() => {
    const socket = obtenerSocket();
    const abrir = () =>
      pedir<{ ok: boolean; sala?: EstadoSala; pantalla?: PantallaAnfitrion | null; error?: string }>("anfitrion:abrir", { pin })
        .then((r) => {
          if (!r.ok || !r.sala) return setError(r.error ?? "No encontramos esa partida.");
          setSala(r.sala);
          setPantalla(r.pantalla ?? null);
        })
        .catch((e: Error) => setError(e.message));
    abrir();
    const alRespuestas = (r: { respondieron: number; conectados: number }) =>
      setPantalla((p) => (p?.fase === "pregunta" ? { ...p, ...r } : p));
    // Al reconectar (red caída, servidor reiniciado) vuelve a unirse
    socket.on("connect", abrir);
    socket.on("sala:estado", setSala);
    socket.on("juego:anfitrion", setPantalla);
    socket.on("juego:respuestas", alRespuestas);
    return () => {
      socket.off("connect", abrir);
      socket.off("sala:estado", setSala);
      socket.off("juego:anfitrion", setPantalla);
      socket.off("juego:respuestas", alRespuestas);
    };
  }, [pin]);

  async function empezar() {
    setEmpezando(true);
    setAviso("");
    const r = await pedir<{ ok: boolean; error?: string }>("anfitrion:empezar", { pin }).catch((e: Error) => ({ ok: false, error: e.message }));
    if (!r.ok) setAviso(r.error ?? "No se pudo empezar.");
    setEmpezando(false);
  }

  async function terminar() {
    await pedir("anfitrion:cerrar", { pin }).catch(() => {});
    navegar("/", { replace: true });
  }

  async function otraVez(quizId: string) {
    await pedir("anfitrion:cerrar", { pin }).catch(() => {});
    navegar(`/lanzar/${quizId}`, { replace: true });
  }

  if (error) {
    return (
      <div className="sala sala--centro">
        <Tarjeta className="sala__error">
          <p className="f">{error}</p>
          <Boton to="/" variante="sol">
            Volver a mis quizzes
          </Boton>
        </Tarjeta>
      </div>
    );
  }
  if (!sala) {
    return (
      <div className="sala sala--centro" aria-busy="true">
        <p className="meta">Abriendo la sala…</p>
      </div>
    );
  }

  const conectados = sala.jugadores.filter((j) => j.conectado).length;
  const total = sala.jugadores.length;

  // ── Partida en curso: H5 → H6/H7 → H8 → … → H9 ──
  const siguiente = () => void pedir("anfitrion:siguiente", { pin }).catch(() => {});
  if (pantalla?.fase === "pregunta") return <PreguntaEnCurso pantalla={pantalla} onSaltar={siguiente} />;
  if (pantalla?.fase === "resultado") return <Resultado pantalla={pantalla} onSiguiente={siguiente} />;
  if (pantalla?.fase === "ranking") return <Ranking pantalla={pantalla} onSiguiente={siguiente} />;
  if (pantalla?.fase === "podio")
    return <Podio pantalla={pantalla} onInicio={terminar} onOtraVez={() => void otraVez(pantalla.quizId)} />;
  if (sala.estado !== "sala") {
    return (
      <div className="sala sala--centro" aria-busy="true">
        <p className="meta">Preparando la primera pregunta…</p>
      </div>
    );
  }

  return (
    <div className="sala">
      <div className="sala__banda">
        <div className="sala__instrucciones">
          <Logo claro />
          <p className="f sala__titulo-instr">Abre ArcoHoot en tu celular y escribe el PIN</p>
          <p className="sala__sub-instr">
            o escanea el código con la cámara
            <span className="sala__url">{base.replace(/^https?:\/\//, "")}/jugar</span>
          </p>
        </div>
        <Tarjeta className="sala__pin">
          <span className="lbl sala__pin-lbl">PIN del juego</span>
          <span className="f sala__pin-num" aria-label={`PIN ${pin.split("").join(" ")}`}>
            {formatoPin(pin)}
          </span>
        </Tarjeta>
        <Tarjeta className="sala__qr">
          <CodigoQR texto={url} etiqueta="Código QR para unirse a la partida" />
        </Tarjeta>
      </div>

      <div className="sala__cuerpo">
        <div className="sala__fila">
          <span className="sala__contador" aria-live="polite">
            <span className="sala__contador-icono">
              <Icono nombre="jugadores" tamano={28} />
            </span>
            <span key={total} className="f pop sala__contador-num">
              {total}
            </span>
            <span className="f sala__contador-txt">{total === 1 ? "jugador" : "jugadores"}</span>
            {conectados < total && <span className="meta">({total - conectados} sin conexión)</span>}
          </span>
          {sala.modo === "poderes" ? <Chip color="sol">Modo con poderes ⚡</Chip> : <Chip>Modo clásico</Chip>}
          {sala.bloqueada && <Chip color="error">Sala cerrada</Chip>}
          <div style={{ flex: 1 }} />
          <Boton
            tamano="sm"
            icono={<Icono nombre={sala.bloqueada ? "candado-abierto" : "candado"} tamano={20} />}
            aria-pressed={sala.bloqueada}
            onClick={() => pedir("anfitrion:bloquear", { pin, bloqueada: !sala.bloqueada }).catch(() => {})}
          >
            {sala.bloqueada ? "Abrir sala" : "Bloquear sala"}
          </Boton>
          <Boton variante="sol" tamano="lg" icono={<Icono nombre="jugar" tamano={24} />} onClick={empezar} disabled={empezando || total === 0}>
            Empezar
          </Boton>
        </div>

        {aviso && (
          <p className="sala__aviso" role="alert">
            {aviso}
          </p>
        )}

        <ul className="sala__jugadores" aria-label="Jugadores en la sala">
          {sala.jugadores.map((j) => (
            <li key={j.id} className={`pop sala__jugador${j.conectado ? "" : " sala__jugador--fuera"}`}>
              <AvatarJugador apodo={j.apodo} color={j.color} />
              {sala.apodosVisibles ? <span>{j.apodo}</span> : <span className="sr">{j.apodo}</span>}
              <button
                type="button"
                className="sala__expulsar"
                aria-label={`Sacar a ${j.apodo} de la sala`}
                title="Sacar de la sala"
                onClick={() => pedir("anfitrion:expulsar", { pin, jugadorId: j.id }).catch(() => {})}
              >
                <Icono nombre="incorrecto" tamano={16} grosor={3} />
              </button>
            </li>
          ))}
          <li className="blink sala__esperando">{total === 0 ? "Esperando al primer jugador…" : "Esperando a más jugadores…"}</li>
        </ul>
      </div>
    </div>
  );
}
