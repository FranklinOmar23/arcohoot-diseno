import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Boton, Chip, Forma, FORMAS, Icono, Logo, Tarjeta } from "../../componentes";
import { AvatarJugador } from "../../componentes/AvatarJugador";
import { Confeti } from "../../componentes/Confeti";
import { FormasFlotantes } from "../../componentes/FormasFlotantes";
import { obtenerSocket, pedir, type JugadorPublico } from "../../lib/socket";
import { formatoPin } from "../../lib/urlJuego";
import type { PantallaJugador } from "../../lib/juego";
import { Responder } from "./Responder";
import { Enviada, FinalJugador, ResultadoJugador } from "./Feedback";
import { ElegirObjetivo, GanastePoder } from "./Poderes";
import { PODERES, type IdPoder } from "../../juego/poderes";
import "./Jugar.css";
import "./Responder.css";
import "./Poderes.css";

type Fase = "pin" | "apodo" | "espera" | "jugando" | "fuera";

interface InfoSala {
  modo: "clasico" | "poderes";
  titulo?: string;
  numJugadores: number;
  estado: "sala" | "jugando" | "terminada";
}

const MAX_APODO = 15;
const CLAVE = "ah_jugador";
const SUGERENCIAS = [
  "Búho Sabio", "Llama Feliz", "Rayo Azul", "Coco Loco", "Tigre Tico", "Nube Rosa",
  "Mango Ninja", "Pulpo Pro", "Lince Listo", "Panda Zen", "Kiwi Veloz", "Delfín Dj",
  "Cometa", "Gato Genio", "Zorro Zen", "Abeja Top",
];
const COLORES_FORMA = ["var(--sol)", "var(--arco)", "var(--laguna)", "var(--anil)"];

function leerGuardado(): { pin: string; token: string } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
    return v && typeof v.pin === "string" && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
const guardar = (v: { pin: string; token: string } | null) => {
  try {
    if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    /* modo privado */
  }
};

/** Flujo del jugador en el celular: J1 PIN → J2 Apodo → J3 ¡Estás dentro! */
export function Jugar() {
  const [params] = useSearchParams();
  const [fase, setFase] = useState<Fase>("pin");
  const [pin, setPin] = useState((params.get("pin") ?? "").replace(/\D/g, "").slice(0, 6));
  const [apodo, setApodo] = useState("");
  const [yo, setYo] = useState<JugadorPublico | null>(null);
  const [sala, setSala] = useState<InfoSala | null>(null);
  const [error, setError] = useState("");
  const [motivoFuera, setMotivoFuera] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pantalla, setPantalla] = useState<PantallaJugador | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorResp, setErrorResp] = useState("");
  const faseRef = useRef(fase);
  faseRef.current = fase;

  async function usarPoder(poder: IdPoder, objetivoId?: string) {
    setErrorResp("");
    try {
      const r = await pedir<{ ok: boolean; error?: string; bloqueado?: boolean }>("jugador:poder", { poder, objetivoId });
      if (!r.ok) setErrorResp(r.error ?? "No se pudo usar el poder.");
      return r.ok;
    } catch (e) {
      setErrorResp((e as Error).message);
      return false;
    }
  }

  const [eligiendoRival, setEligiendoRival] = useState(false);
  async function decidirPoder(accion: "guardar" | "usar", objetivoId?: string) {
    setEnviando(true);
    setErrorResp("");
    try {
      const r = await pedir<{ ok: boolean; error?: string }>("jugador:poder-nuevo", { accion, objetivoId });
      if (!r.ok) setErrorResp(r.error ?? "No se pudo guardar el poder.");
      else setEligiendoRival(false);
    } catch (e) {
      setErrorResp((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function responder(valor: unknown) {
    if (pantalla?.fase !== "pregunta" || enviando) return;
    setEnviando(true);
    setErrorResp("");
    try {
      const r = await pedir<{ ok: boolean; error?: string }>("jugador:responder", { indice: pantalla.indice, valor });
      if (!r.ok) setErrorResp(r.error ?? "No se pudo enviar.");
    } catch (e) {
      setErrorResp((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const buscar = useCallback(async (p: string) => {
    setError("");
    if (p.length !== 6) return setError("El PIN tiene 6 números.");
    setOcupado(true);
    try {
      const r = await pedir<{ ok: boolean; error?: string; modo?: InfoSala["modo"]; titulo?: string }>("jugador:buscar", { pin: p });
      if (!r.ok) return setError(r.error ?? "No encontramos esa partida.");
      setSala({ modo: r.modo!, titulo: r.titulo, numJugadores: 0, estado: "sala" });
      setFase("apodo");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }, []);

  // Reconexión tras recargar o perder la red
  const volver = useCallback(async () => {
    const g = leerGuardado();
    if (!g) return false;
    const r = await pedir<{ ok: boolean; jugador?: JugadorPublico; sala?: InfoSala; pantalla?: PantallaJugador | null }>("jugador:volver", g).catch(
      () => ({ ok: false }) as const,
    );
    if (!r.ok || !("jugador" in r) || !r.jugador) {
      guardar(null);
      return false;
    }
    setPin(g.pin);
    setYo(r.jugador);
    setSala(r.sala!);
    setPantalla(r.pantalla ?? null);
    setFase(r.sala!.estado === "jugando" ? "jugando" : "espera");
    return true;
  }, []);

  useEffect(() => {
    const socket = obtenerSocket();
    void volver().then((ok) => {
      // Llegó con ?pin= desde el QR: salta directo al apodo
      if (!ok && pin.length === 6 && faseRef.current === "pin") void buscar(pin);
    });

    const alReconectar = () => {
      if (faseRef.current === "espera" || faseRef.current === "jugando") void volver();
    };
    const alInfo = (info: InfoSala) => {
      setSala((s) => ({ ...s, ...info }));
      if (info.estado === "jugando" && faseRef.current === "espera") setFase("jugando");
    };
    const alExpulsado = () => {
      guardar(null);
      setMotivoFuera("El anfitrión te sacó de la sala.");
      setFase("fuera");
    };
    const alCerrar = () => {
      guardar(null);
      // Si ya está viendo su resultado final, se queda ahí
      setPantalla((p) => {
        if (p?.fase !== "podio") {
          setMotivoFuera("La partida terminó. ¡Gracias por jugar!");
          setFase("fuera");
        }
        return p;
      });
    };
    const alPantalla = (p: PantallaJugador) => {
      setPantalla(p);
      setErrorResp("");
      if (faseRef.current === "espera") setFase("jugando");
      if (p.fase === "podio") guardar(null);
    };
    socket.on("connect", alReconectar);
    socket.on("sala:info", alInfo);
    socket.on("jugador:expulsado", alExpulsado);
    socket.on("sala:cerrada", alCerrar);
    socket.on("juego:jugador", alPantalla);
    return () => {
      socket.off("juego:jugador", alPantalla);
      socket.off("connect", alReconectar);
      socket.off("sala:info", alInfo);
      socket.off("jugador:expulsado", alExpulsado);
      socket.off("sala:cerrada", alCerrar);
    };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    const limpio = apodo.trim();
    if (!limpio) return setError("Escribe un apodo para entrar.");
    setOcupado(true);
    try {
      const r = await pedir<{ ok: boolean; error?: string; token?: string; jugador?: JugadorPublico; sala?: InfoSala }>("jugador:entrar", { pin, apodo: limpio });
      if (!r.ok) return setError(r.error ?? "No pudimos entrar.");
      guardar({ pin, token: r.token! });
      setYo(r.jugador!);
      setSala(r.sala!);
      setFase("espera");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function salir() {
    obtenerSocket().emit("jugador:salir");
    guardar(null);
    setYo(null);
    setApodo("");
    setPin("");
    setFase("pin");
  }

  function sugerir() {
    const opciones = SUGERENCIAS.filter((s) => s !== apodo);
    setApodo(opciones[Math.floor(Math.random() * opciones.length)]);
  }

  // ── J1 · PIN ──
  if (fase === "pin") {
    return (
      <main className="jugar">
        <FormasFlotantes />
        <div className="jugar__columna jugar__columna--centro">
          <div className="jugar__marca">
            <Logo tamano="md" apilado />
            <p className="meta" style={{ fontSize: 16 }}>
              Quizzes en vivo para aprender jugando
            </p>
          </div>
          <Tarjeta className="jugar__tarjeta">
            <form onSubmit={(e) => { e.preventDefault(); void buscar(pin); }} className="jugar__form" noValidate>
              <label className="f jugar__pin-lbl" htmlFor="pin">
                PIN del juego
              </label>
              <input
                id="pin"
                className={`ah-campo__input jugar__pin${error ? " ah-campo__input--error" : ""}`}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="000 000"
                value={formatoPin(pin)}
                maxLength={7}
                aria-invalid={!!error || undefined}
                aria-describedby="pin-ayuda"
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
              />
              {error && (
                <p className="jugar__error" role="alert">
                  {error}
                </p>
              )}
              <Boton type="submit" variante="arco" tamano="lg" bloque disabled={ocupado}>
                {ocupado ? "Buscando…" : "Entrar"}
              </Boton>
              <p id="pin-ayuda" className="meta" style={{ textAlign: "center" }}>
                Lo ves en la pantalla grande.
              </p>
            </form>
          </Tarjeta>
        </div>
      </main>
    );
  }

  // ── J2 · Apodo ──
  if (fase === "apodo") {
    return (
      <main className="jugar">
        <form className="jugar__columna" onSubmit={entrar} noValidate>
          <div className="jugar__cabecera">
            <Logo soloMarca anchoMarca={48} />
            <Chip color="exito" icono={<Icono nombre="correcto" tamano={16} grosor={3} />}>
              PIN {formatoPin(pin)}
            </Chip>
          </div>
          <div className="jugar__intro">
            <h1 className="f">¿Cómo te llamas?</h1>
            <p>Usa un apodo amable: lo verá todo el salón.</p>
          </div>
          <Tarjeta className="jugar__tarjeta jugar__tarjeta--apodo">
            <label className="lbl jugar__apodo-lbl" htmlFor="apodo">
              Tu apodo
            </label>
            <input
              id="apodo"
              className={`ah-campo__input jugar__apodo${error ? " ah-campo__input--error" : ""}`}
              value={apodo}
              maxLength={MAX_APODO}
              autoComplete="nickname"
              autoFocus
              aria-invalid={!!error || undefined}
              aria-describedby="apodo-cuenta"
              onChange={(e) => {
                setApodo(e.target.value);
                setError("");
              }}
            />
            <div className="jugar__apodo-pie">
              <span id="apodo-cuenta" className="meta">
                {apodo.length} / {MAX_APODO} caracteres
              </span>
              <button type="button" className="ah-chip ah-chip--boton" onClick={sugerir}>
                🎲 Sugerir uno
              </button>
            </div>
            {error && (
              <p className="jugar__error" role="alert">
                {error}
              </p>
            )}
          </Tarjeta>
          <div className="jugar__abajo">
            <Boton type="submit" variante="arco" tamano="lg" bloque disabled={ocupado}>
              {ocupado ? "Entrando…" : "¡Listo, vamos!"} <Icono nombre="adelante" tamano={24} grosor={3} />
            </Boton>
            <button type="button" className="jugar__enlace" onClick={() => { setFase("pin"); setError(""); }}>
              Cambiar PIN
            </button>
          </div>
        </form>
      </main>
    );
  }

  // ── Fuera de la partida ──
  if (fase === "fuera") {
    return (
      <main className="jugar">
        <FormasFlotantes />
        <div className="jugar__columna jugar__columna--centro">
          <Logo tamano="md" apilado />
          <Tarjeta className="jugar__tarjeta" style={{ textAlign: "center" }}>
            <p className="f" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>
              {motivoFuera}
            </p>
            <Boton variante="arco" tamano="lg" bloque onClick={() => { setFase("pin"); setPin(""); setApodo(""); }}>
              Entrar a otra partida
            </Boton>
          </Tarjeta>
        </div>
      </main>
    );
  }

  // ── Partida en curso: J4–J9 → J10/J11 → … → final ──
  const reiniciar = () => {
    guardar(null);
    setPantalla(null);
    setYo(null);
    setApodo("");
    setPin("");
    setFase("pin");
  };
  if (fase === "jugando" && pantalla) {
    if (pantalla.fase === "pregunta")
      return (
        <Responder
          key={pantalla.indice}
          indice={pantalla.indice}
          total={pantalla.total}
          puntos={pantalla.puntos}
          restanteMs={pantalla.restanteMs}
          pregunta={pantalla.pregunta}
          enviando={enviando}
          error={errorResp}
          onResponder={responder}
          poderes={pantalla.poderes}
          onPoder={usarPoder}
        />
      );
    if (pantalla.fase === "enviada") return <Enviada puntos={pantalla.puntos} poderes={pantalla.poderes} onPoder={usarPoder} />;
    if (pantalla.fase === "resultado" && pantalla.poderNuevo) {
      const { poder, motivo } = pantalla.poderNuevo;
      const inventario = pantalla.poderes?.inventario ?? [];
      if (eligiendoRival && pantalla.poderes)
        return (
          <ElegirObjetivo
            poder={poder}
            rivales={pantalla.poderes.rivales}
            miPuesto={pantalla.puesto}
            misPuntos={pantalla.puntos}
            enviando={enviando}
            nota="Se activa al empezar la próxima pregunta."
            onCancelar={() => setEligiendoRival(false)}
            onConfirmar={(id) => void decidirPoder("usar", id)}
          />
        );
      return (
        <GanastePoder
          key={`${pantalla.indice}-${poder}`}
          poder={poder}
          motivo={motivo}
          ranura={inventario.length + 1}
          lleno={inventario.length >= 3}
          enviando={enviando}
          error={errorResp}
          onGuardar={() => void decidirPoder("guardar")}
          onUsar={() => (PODERES[poder].ataque ? setEligiendoRival(true) : void decidirPoder("usar"))}
        />
      );
    }
    if (pantalla.fase === "resultado") return <ResultadoJugador key={pantalla.indice} r={pantalla} />;
    if (pantalla.fase === "podio") return <FinalJugador f={pantalla} onOtra={reiniciar} />;
  }

  // ── J3 · ¡Estás dentro! ──
  const n = sala?.numJugadores ?? 1;
  return (
    <main className="jugar">
      <Confeti />
      <div className="jugar__columna jugar__columna--centro jugar__dentro">
        <h1 className="f pop jugar__dentro-titulo">{fase === "jugando" ? "¡Arrancamos!" : "¡Estás dentro!"}</h1>
        {yo && (
          <Tarjeta className="pop jugar__yo" style={{ animationDelay: ".25s" }}>
            <AvatarJugador apodo={yo.apodo} color={yo.color} tamano={96} />
            <span className="f jugar__yo-apodo">{yo.apodo}</span>
          </Tarjeta>
        )}
        <p className="jugar__dentro-texto">
          {fase === "jugando" ? "Mira la pantalla grande: la pregunta llega en un momento." : "Mira la pantalla grande: el juego empieza pronto."}
        </p>
        <div className="jugar__chips">
          {sala?.modo === "poderes" ? <Chip color="sol">Con poderes ⚡</Chip> : <Chip>Clásico</Chip>}
          <Chip icono={<Icono nombre="jugadores" tamano={18} />}>
            <span aria-live="polite">
              {n} {n === 1 ? "jugador" : "jugadores"}
            </span>
          </Chip>
        </div>
        <div className="jugar__rebote" role="status" aria-label="Esperando al anfitrión">
          {FORMAS.map((f, i) => (
            <span key={f} className="bounce" style={{ animationDelay: `${i * 0.15}s`, display: "flex" }}>
              <Forma forma={f} tamano={26} color={COLORES_FORMA[i]} />
            </span>
          ))}
        </div>
        {fase === "espera" && (
          <button type="button" className="jugar__enlace jugar__salir" onClick={salir}>
            Salir de la partida
          </button>
        )}
      </div>
    </main>
  );
}
