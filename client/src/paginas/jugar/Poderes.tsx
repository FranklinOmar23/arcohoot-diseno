import { useEffect, useMemo, useState } from "react";
import { Boton, Chip, EtiquetaRareza, Icono, MedallonPoder } from "../../componentes";
import { AvatarJugador } from "../../componentes/AvatarJugador";
import { PODERES, RAREZAS, type IdPoder } from "../../juego/poderes";
import { formatoPuntos, type AvisoPoder, type Rival } from "../../lib/juego";

const COLOR_GEMAS = { comun: "var(--rareza-comun)", raro: "var(--rareza-raro)", epico: "var(--rareza-epico)" } as const;

/** Milisegundos que faltan para que termine un efecto (se recalcula cada 100 ms) */
export function useRestante(ms: number, clave: unknown) {
  const [fin, setFin] = useState(() => Date.now() + ms);
  const [, setTic] = useState(0);
  useEffect(() => {
    setFin(Date.now() + ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, ms > 0]);
  const restante = Math.max(0, fin - Date.now());
  useEffect(() => {
    if (restante <= 0) return;
    const t = setInterval(() => setTic((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [restante > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return restante;
}

// ── P1 · Inventario (3 ranuras) ──
interface PropsBarra {
  inventario: IdPoder[];
  elegido: IdPoder | null;
  deshabilitado?: boolean;
  onElegir: (p: IdPoder) => void;
}

export function BarraPoderes({ inventario, elegido, deshabilitado, onElegir }: PropsBarra) {
  const ranuras = [0, 1, 2].map((i) => inventario[i] ?? null);
  return (
    <nav aria-label="Tus poderes" className="pod-barra">
      <p className="meta pod-barra__ayuda">
        {inventario.length === 0 ? (
          "Acierta rápido o en racha para ganar poderes"
        ) : elegido ? (
          <>
            Toca un poder para usarlo · <b>{PODERES[elegido].nombre}</b> elegido
          </>
        ) : (
          "Toca un poder para usarlo"
        )}
      </p>
      <ul className="pod-barra__lista">
        {ranuras.map((p, i) => (
          <li key={i}>
            {p ? (
              <button
                type="button"
                className={`pod-ranura${elegido === p ? " pod-ranura--sel" : ""}`}
                aria-label={`Usar ${PODERES[p].nombre} (${RAREZAS[PODERES[p].rareza].nombre})`}
                aria-pressed={elegido === p}
                disabled={deshabilitado}
                onClick={() => onElegir(p)}
              >
                <MedallonPoder poder={p} tamano={48} />
                <span className="pod-ranura__nombre">{PODERES[p].nombre}</span>
                <span aria-hidden="true" className="pod-ranura__gemas" style={{ color: elegido === p ? "var(--sobre-oscuro)" : COLOR_GEMAS[PODERES[p].rareza] }}>
                  {RAREZAS[PODERES[p].rareza].gemas}
                </span>
              </button>
            ) : (
              <span className="pod-ranura pod-ranura--vacia">
                <span className="meta">Vacía</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── P3 · Selector de objetivo ──
const TEXTOS_ATAQUE: Partial<Record<IdPoder, { titulo: string; desc: string; verbo: string }>> = {
  congelar: { titulo: "¿A quién congelas?", desc: "Su pantalla se congela 3 s en esta pregunta.", verbo: "Congelar" },
  niebla: { titulo: "¿A quién nublas?", desc: "Sus opciones se nublan 5 s.", verbo: "Nublar" },
  revolver: { titulo: "¿A quién revuelves?", desc: "Sus botones cambian de lugar.", verbo: "Revolver" },
  robo: { titulo: "¿A quién le robas?", desc: "Te llevas el 10 % de sus puntos.", verbo: "Robar" },
};

interface PropsObjetivo {
  poder: IdPoder;
  rivales: Rival[];
  miPuesto: number | null;
  misPuntos: number;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: (objetivoId: string) => void;
  nota?: string;
}

export function ElegirObjetivo({ poder, rivales, miPuesto, misPuntos, enviando, onCancelar, onConfirmar, nota }: PropsObjetivo) {
  const t = TEXTOS_ATAQUE[poder]!;
  const libres = rivales.filter((r) => !r.protegido);
  const [sel, setSel] = useState<string | null>(libres[0]?.id ?? null);
  const elegido = rivales.find((r) => r.id === sel);
  return (
    <div className="pod-objetivo" role="dialog" aria-modal="true" aria-labelledby="titulo-objetivo">
      <div className="pod-objetivo__cabecera">
        <Boton tamano="sm" icono={<Icono nombre="atras" tamano={20} />} onClick={onCancelar}>
          Cancelar
        </Boton>
        <Chip>
          Tú: {miPuesto ? `#${miPuesto} · ` : ""}
          {formatoPuntos(misPuntos)} pts
        </Chip>
      </div>
      <div className="pod-objetivo__titulo">
        <MedallonPoder poder={poder} tamano={72} />
        <div>
          <h1 id="titulo-objetivo" className="f">
            {t.titulo}
          </h1>
          <p className="meta">{nota ?? t.desc}</p>
        </div>
      </div>
      {rivales.length === 0 ? (
        <p className="f pod-objetivo__vacio">Aún no hay rivales en la partida.</p>
      ) : (
        <ul role="radiogroup" aria-label="Elige un rival" className="pod-objetivo__lista">
          {rivales.map((r) =>
            r.protegido ? (
              <li key={r.id}>
                <button type="button" disabled className="pod-rival pod-rival--protegido" aria-label={`${r.apodo}, protegido por escudo`}>
                  <span className="f pod-rival__puesto">#{r.puesto}</span>
                  <AvatarJugador apodo={r.apodo} color={r.color} tamano={40} />
                  <span className="f pod-rival__apodo">{r.apodo}</span>
                  <span className="pod-rival__puntos" style={{ fontSize: 14 }}>
                    🛡️ Protegido
                  </span>
                </button>
              </li>
            ) : (
              <li key={r.id}>
                <button type="button" role="radio" aria-checked={sel === r.id} className={`pod-rival${sel === r.id ? " pod-rival--sel" : ""}`} onClick={() => setSel(r.id)}>
                  <span className="f pod-rival__puesto">#{r.puesto}</span>
                  <AvatarJugador apodo={r.apodo} color={r.color} tamano={40} />
                  <span className="f pod-rival__apodo">{r.apodo}</span>
                  <span className="pod-rival__puntos">{formatoPuntos(r.puntos)} pts</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="pod-objetivo__abajo">
        <Boton variante="anil" tamano="lg" bloque disabled={!elegido || enviando} onClick={() => elegido && onConfirmar(elegido.id)}>
          {elegido ? `${t.verbo} a ${elegido.apodo} ${PODERES[poder].emoji}` : "Elige a un rival"}
        </Boton>
      </div>
    </div>
  );
}

// ── P2 · ¡Ganaste un poder! (ruleta de 2,4 s) ──
const RULETA: IdPoder[] = ["doble", "niebla", "escudo", "robo", "tiempo", "revolver", "cincuenta", "segunda", "doble", "niebla", "escudo"];

interface PropsGanaste {
  poder: IdPoder;
  motivo: string;
  ranura: number;
  lleno: boolean;
  enviando: boolean;
  error: string;
  onGuardar: () => void;
  onUsar: () => void;
}

export function GanastePoder({ poder, motivo, ranura, lleno, enviando, error, onGuardar, onUsar }: PropsGanaste) {
  const p = PODERES[poder];
  // La ruleta siempre se detiene en el poder ganado (posición 12 de la tira)
  const tira = useMemo(() => [...RULETA, poder, "tiempo", "congelar"] as IdPoder[], [poder]);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setListo(true), reducido ? 0 : 2300);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="pod-ganaste">
      <div className="pod-ganaste__columna">
        <h1 className="f pop pod-ganaste__titulo">¡Ganaste un poder!</h1>
        <p className="pod-ganaste__motivo">{motivo}</p>
        <div className="pod-ruleta" aria-hidden="true">
          <div className="pod-ruleta__tira">
            {tira.map((id, i) => (
              <span key={i} style={{ flex: "none" }}>
                <MedallonPoder poder={id} tamano={64} />
              </span>
            ))}
          </div>
          <span className="pod-ruleta__marco" />
        </div>
        <div className={`ah-card pop pod-ganaste__tarjeta${listo ? "" : " pod-ganaste__tarjeta--espera"}`} aria-live="polite">
          {listo && (
            <>
              <MedallonPoder poder={poder} tamano={112} />
              <EtiquetaRareza rareza={p.rareza} />
              <h2 className="f">
                {p.nombre} {p.emoji}
              </h2>
              <p className="pod-ganaste__desc">{p.descripcion}</p>
              <p className="meta">{lleno ? "Tu inventario está lleno: úsalo ahora" : `Se guarda en tu ranura ${ranura} de 3`}</p>
            </>
          )}
        </div>
        {error && (
          <p className="jugar__error" role="alert">
            {error}
          </p>
        )}
        <div className="pod-ganaste__botones">
          <Boton tamano="lg" onClick={onGuardar} disabled={!listo || lleno || enviando}>
            Guardar
          </Boton>
          <Boton variante="sol" tamano="lg" onClick={onUsar} disabled={!listo || enviando}>
            Usar ahora
          </Boton>
        </div>
        {listo && <p className="meta pod-ganaste__nota">«Usar ahora» lo activa al empezar la próxima pregunta.</p>}
      </div>
    </main>
  );
}

// ── P4 · Congelado ──
export function Congelado({ ms, de, clave }: { ms: number; de?: string; clave: unknown }) {
  const restante = useRestante(ms, clave);
  if (restante <= 0) return null;
  return (
    <div className="pod-hielo" role="alert">
      <svg aria-hidden="true" className="pod-hielo__grietas" viewBox="0 0 390 844" preserveAspectRatio="none" fill="none" stroke="var(--sobre-oscuro)" strokeWidth="3" strokeLinecap="round">
        <path d="M0 120 60 150 90 110 150 160M390 90 330 130 350 180 300 220M20 700 80 660 70 610 130 580M380 760 320 720 340 660 290 640" />
        <path d="M60 150 40 200M330 130 280 110M80 660 60 600M320 720 270 760" strokeWidth="2.5" />
      </svg>
      <div className="ah-card pod-hielo__tarjeta">
        <span className="pod-hielo__emoji" aria-hidden="true">
          ❄️
        </span>
        <h1 className="f">¡Te congelaron!</h1>
        {de && (
          <p className="pod-hielo__de">
            <b>{de}</b> usó Congelar contra ti
          </p>
        )}
        <span className="f pulse-slow pod-hielo__cuenta" role="timer" aria-label={`Quedan ${Math.ceil(restante / 1000)} segundos`}>
          {Math.ceil(restante / 1000)}
        </span>
        <p className="meta">Se descongela solo</p>
      </div>
    </div>
  );
}

// ── P5 · Niebla ──
export function Niebla({ ms, clave }: { ms: number; clave: unknown }) {
  const restante = useRestante(ms, clave);
  if (restante <= 0) return null;
  const nubes = [
    { left: "-10%", top: "-4%", width: "66%", height: "44%", o: 0.97 },
    { left: "34%", top: "8%", width: "66%", height: "46%", o: 0.95 },
    { left: "-8%", top: "46%", width: "60%", height: "52%", o: 0.96 },
    { left: "42%", top: "52%", width: "62%", height: "52%", o: 0.97 },
    { left: "18%", top: "30%", width: "56%", height: "40%", o: 0.9 },
  ];
  return (
    <div className="pod-niebla" aria-hidden="true" style={{ opacity: Math.min(1, restante / 800) }}>
      {nubes.map((n, i) => (
        <span key={i} className="pod-niebla__nube" style={{ left: n.left, top: n.top, width: n.width, height: n.height, opacity: n.o, animationDelay: `${-i}s` }} />
      ))}
    </div>
  );
}

// ── P5–P9 · Banner de efecto ──
const ESTILO_AVISO: Record<string, { fondo: string; emoji: string; titulo: string }> = {
  niebla: { fondo: "var(--niebla)", emoji: "🌫️", titulo: "Niebla" },
  revolver: { fondo: "var(--sol)", emoji: "🔀", titulo: "¡Revuelto!" },
  robo: { fondo: "var(--rareza-epico)", emoji: "💰", titulo: "¡Te robaron!" },
  congelar: { fondo: "var(--hielo)", emoji: "❄️", titulo: "Congelado" },
  escudo: { fondo: "var(--laguna)", emoji: "🛡️", titulo: "Escudo activo" },
  bloqueo: { fondo: "var(--laguna)", emoji: "🛡️", titulo: "Escudo" },
  doble: { fondo: "var(--sol)", emoji: "⚡", titulo: "x2 activo" },
  tiempo: { fondo: "var(--hielo)", emoji: "⏱️", titulo: "Tiempo extra" },
  cincuenta: { fondo: "var(--papel)", emoji: "✂️", titulo: "50/50" },
  segunda: { fondo: "var(--hielo)", emoji: "🔁", titulo: "Segunda oportunidad" },
};
const TEXTO_OSCURO = new Set(["robo", "escudo", "bloqueo"]);

export function BannerPoder({ aviso }: { aviso: AvisoPoder }) {
  const e = ESTILO_AVISO[aviso.tipo] ?? ESTILO_AVISO.doble;
  return (
    <div
      key={aviso.en}
      className="pop pod-banner"
      role="status"
      style={{ background: e.fondo, color: TEXTO_OSCURO.has(aviso.tipo) ? "var(--sobre-oscuro)" : "var(--sobre-claro)" }}
    >
      <span className="pod-banner__emoji" aria-hidden="true">
        {e.emoji}
      </span>
      <div>
        <div className="f pod-banner__titulo">{e.titulo}</div>
        <div className="pod-banner__texto">{aviso.texto}</div>
      </div>
    </div>
  );
}
