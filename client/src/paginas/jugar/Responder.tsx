import { useEffect, useRef, useState, type PointerEvent as PE } from "react";
import { Boton, Chip, Forma, FORMAS, Icono } from "../../componentes";
import type { NombreForma } from "../../componentes/Forma";
import { infoTipo, nombreCortoTipo } from "../../juego/preguntas";
import { formatoPuntos, useReloj, type BloquePoderes, type TiemposPregunta, type VistaPreguntaJugador } from "../../lib/juego";
import { PODERES, type IdPoder } from "../../juego/poderes";
import { BannerPoder, BarraPoderes, Congelado, ElegirObjetivo, Niebla, useRestante } from "./Poderes";

interface Props {
  indice: number;
  total: number;
  puntos: number;
  tiempos: TiemposPregunta;
  pregunta: VistaPreguntaJugador;
  enviando: boolean;
  error: string;
  onResponder: (valor: unknown) => void;
}

const INSTRUCCION: Record<string, string> = {
  quiz: "Elige una respuesta",
  verdadero_falso: "Elige verdadero o falso",
  respuesta_corta: "Escribe tu respuesta",
  deslizante: "Arrastra hasta tu respuesta",
  pin: "Toca la imagen para poner tu pin",
  puzzle: "Arrastra para ordenar",
};

function Reloj() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function EnviarBoton({ onClick, disabled, texto = "Enviar" }: { onClick: () => void; disabled: boolean; texto?: string }) {
  return (
    <div className="resp__abajo">
      <Boton variante="arco" tamano="lg" bloque onClick={onClick} disabled={disabled}>
        {texto} <Icono nombre="adelante" tamano={24} grosor={3} />
      </Boton>
    </div>
  );
}

/** Efectos de poderes sobre los botones (Quiz y V/F) */
interface EfectosBotones {
  orden: number[] | null;
  ocultas: number[];
  descartadas: number[];
  nieblaMs: number;
  clave: unknown;
}
const SIN_EFECTOS: EfectosBotones = { orden: null, ocultas: [], descartadas: [], nieblaMs: 0, clave: 0 };

// ── J4 · Quiz (P1 / P5 / P6 con poderes) ──
function Quiz({ p, onResponder, bloqueado, ef }: { p: VistaPreguntaJugador; onResponder: (v: unknown) => void; bloqueado: boolean; ef: EfectosBotones }) {
  const ops = p.opciones ?? [];
  const orden = ef.orden && ef.orden.length === ops.length ? ef.orden : ops.map((_, i) => i);
  return (
    <div className="resp__rejilla" style={{ gridTemplateRows: `repeat(${Math.ceil(ops.length / 2)}, minmax(0, 1fr))`, position: "relative" }}>
      {orden.map((i) => {
        const fuera = ef.ocultas.includes(i) || ef.descartadas.includes(i);
        return (
          <button
            key={i}
            type="button"
            className={`ah-op ah-op--${FORMAS[i]} ah-op--vertical resp__op${ef.orden ? " resp__op--revuelto" : ""}${fuera ? " resp__op--fuera" : ""}`}
            disabled={bloqueado || fuera}
            onClick={() => onResponder(i)}
          >
            <Forma forma={FORMAS[i]} tamano={60} />
            <span className="sr">{["Triángulo", "Rombo", "Círculo", "Cuadrado"][i]}: </span>
            <span className="resp__op-texto">{fuera && ef.ocultas.includes(i) ? "✂️" : ops[i]}</span>
          </button>
        );
      })}
      <Niebla ms={ef.nieblaMs} clave={ef.clave} />
    </div>
  );
}

// ── J5 · Verdadero o falso ──
function VerdaderoFalso({ onResponder, bloqueado, ef }: { onResponder: (v: unknown) => void; bloqueado: boolean; ef: EfectosBotones }) {
  const filas: { v: boolean; t: string; f: NombreForma; i: number }[] = [
    { v: true, t: "Verdadero", f: "circulo", i: 0 },
    { v: false, t: "Falso", f: "rombo", i: 1 },
  ];
  const vista = ef.orden ? ef.orden.map((i) => filas[i]).filter(Boolean) : filas;
  // El servidor descarta V/F por índice: 0 = Verdadero, 1 = Falso
  const descartada = (x: (typeof filas)[number]) => ef.descartadas.includes(x.i);
  return (
    <div className="resp__vf-caja">
      {vista.map((x) => (
        <button
          key={x.t}
          type="button"
          className={`ah-op ah-op--${x.f} ah-op--vertical resp__vf${ef.orden ? " resp__op--revuelto" : ""}${descartada(x) ? " resp__op--fuera" : ""}`}
          disabled={bloqueado || descartada(x)}
          onClick={() => onResponder(x.v)}
        >
          <Forma forma={x.f} tamano={72} />
          <span style={{ fontSize: 32 }}>{x.t}</span>
        </button>
      ))}
      <Niebla ms={ef.nieblaMs} clave={ef.clave} />
    </div>
  );
}

/** La pregunta en el celular: enunciado y, si tiene, la imagen (en "pin" la imagen es el lienzo) */
function TarjetaPregunta({ p }: { p: VistaPreguntaJugador }) {
  const imagen = p.tipo !== "pin" ? p.imagen : null;
  return (
    <div className="ah-card resp__tarjeta">
      {imagen && <img className="resp__imagen" src={imagen} alt="" />}
      <h1 className="f resp__enunciado">{p.enunciado}</h1>
    </div>
  );
}

// ── J6 · Respuesta corta ──
function Corta({ onResponder, bloqueado }: { onResponder: (v: unknown) => void; bloqueado: boolean }) {
  const [t, setT] = useState("");
  return (
    <form
      className="resp__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (t.trim()) onResponder(t.trim());
      }}
    >
      <div className="resp__campo">
        <label className="lbl" htmlFor="corta" style={{ color: "var(--tinta)" }}>
          Tu respuesta
        </label>
        <input
          id="corta"
          className="ah-campo__input resp__corta"
          value={t}
          maxLength={20}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          enterKeyHint="send"
          onChange={(e) => setT(e.target.value)}
        />
        <div className="resp__fila-meta">
          <span className="meta">No importan mayúsculas ni tildes</span>
          <span className="meta">{t.length} / 20</span>
        </div>
      </div>
      <div className="resp__abajo">
        <Boton type="submit" variante="arco" tamano="lg" bloque disabled={bloqueado || !t.trim()}>
          Enviar <Icono nombre="adelante" tamano={24} grosor={3} />
        </Boton>
      </div>
    </form>
  );
}

// ── J7 · Control deslizante ──
function Deslizante({ p, onResponder, bloqueado }: { p: VistaPreguntaJugador; onResponder: (v: unknown) => void; bloqueado: boolean }) {
  const min = p.min ?? 0;
  const max = p.max ?? 100;
  const paso = p.paso ?? 1;
  const [v, setV] = useState(() => Math.round((min + (max - min) / 2) / paso) * paso);
  const lim = (n: number) => Math.min(max, Math.max(min, Math.round(n / paso) * paso));
  const u = p.unidad ?? "";
  return (
    <>
      <div className="resp__deslizante">
        <output htmlFor="rng" className="f resp__valor" aria-live="polite">
          {Math.round(v * 1000) / 1000}
          {u && <span> {u}</span>}
        </output>
        <label className="sr" htmlFor="rng">
          Tu respuesta{u ? ` en ${u}` : ""}
        </label>
        <input id="rng" type="range" className="editor-rango resp__rango" min={min} max={max} step={paso} value={v} onChange={(e) => setV(e.target.valueAsNumber)} />
        <div className="resp__fila-meta resp__fila-meta--centro">
          <button type="button" className="ah-btn ah-btn--papel ah-btn--md ah-btn--icono" aria-label={`Restar ${paso}`} onClick={() => setV(lim(v - paso))}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="meta">
            {min}
            {u && ` ${u}`} — {max}
            {u && ` ${u}`}
          </span>
          <button type="button" className="ah-btn ah-btn--papel ah-btn--md ah-btn--icono" aria-label={`Sumar ${paso}`} onClick={() => setV(lim(v + paso))}>
            <Icono nombre="mas" tamano={26} grosor={3} />
          </button>
        </div>
      </div>
      <EnviarBoton onClick={() => onResponder(v)} disabled={bloqueado} />
    </>
  );
}

// ── J8 · Respuesta con pin ──
function Pin({ p, onResponder, bloqueado }: { p: VistaPreguntaJugador; onResponder: (v: unknown) => void; bloqueado: boolean }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [clave, setClave] = useState(0);
  function tocar(e: PE<HTMLDivElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    setPos({ x: ((e.clientX - caja.left) / caja.width) * 100, y: ((e.clientY - caja.top) / caja.height) * 100 });
    setClave((k) => k + 1);
  }
  return (
    <>
      <div className="resp__pin-marco">
        <div className="resp__pin-lienzo" onPointerDown={tocar} role="application" aria-label="Imagen: toca para poner tu pin">
          {p.imagen && <img src={p.imagen} alt="" draggable={false} />}
          {pos && (
            <>
              <span key={`r${clave}`} className="resp__ripple" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} aria-hidden="true" />
              <span key={`p${clave}`} className="resp__pin" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} role="img" aria-label="Tu pin">
                <svg width="44" height="56" viewBox="0 0 24 30" aria-hidden="true">
                  <path d="M12 29s-10-9.3-10-17a10 10 0 0 1 20 0c0 7.7-10 17-10 17z" fill="var(--arco)" stroke="var(--borde)" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="4" fill="var(--papel)" stroke="var(--borde)" strokeWidth="2" />
                </svg>
              </span>
            </>
          )}
        </div>
      </div>
      <p className="meta" style={{ textAlign: "center" }}>
        {pos ? "Pin puesto · toca otra vez para moverlo" : "Toca donde creas que está la respuesta"}
      </p>
      <EnviarBoton onClick={() => pos && onResponder(pos)} disabled={bloqueado || !pos} />
    </>
  );
}

// ── J9 · Puzzle ──
function Puzzle({ p, onResponder, bloqueado }: { p: VistaPreguntaJugador; onResponder: (v: unknown) => void; bloqueado: boolean }) {
  const [orden, setOrden] = useState(() => p.elementos ?? []);
  const [arrastre, setArrastre] = useState<{ i: number; dy: number } | null>(null);
  const inicio = useRef<{ y: number; alto: number } | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const mover = (de: number, a: number) => {
    if (a < 0 || a >= orden.length || de === a) return;
    const n = [...orden];
    const [x] = n.splice(de, 1);
    n.splice(a, 0, x);
    setOrden(n);
    setAnuncio(`${x.texto}: posición ${a + 1} de ${n.length}`);
  };

  function bajar(e: PE<HTMLLIElement>, i: number) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { y: e.clientY, alto: e.currentTarget.getBoundingClientRect().height + 12 };
    setArrastre({ i, dy: 0 });
  }
  function moverPuntero(e: PE<HTMLLIElement>) {
    if (!arrastre || !inicio.current) return;
    setArrastre({ ...arrastre, dy: e.clientY - inicio.current.y });
  }
  function soltar() {
    if (arrastre && inicio.current) mover(arrastre.i, Math.max(0, Math.min(orden.length - 1, arrastre.i + Math.round(arrastre.dy / inicio.current.alto))));
    setArrastre(null);
    inicio.current = null;
  }

  return (
    <>
      <div className="lbl resp__puzzle-ejes">
        <span>▲ Primero</span>
        <span>Último ▼</span>
      </div>
      <ol className="resp__puzzle">
        {orden.map((el, i) => (
          <li
            key={el.id}
            className={`resp__paso${arrastre?.i === i ? " resp__paso--arrastrando" : ""}`}
            style={arrastre?.i === i ? { transform: `translateY(${arrastre.dy}px)` } : undefined}
            aria-roledescription="tarjeta arrastrable"
            onPointerDown={(e) => bajar(e, i)}
            onPointerMove={moverPuntero}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          >
            <span className="resp__agarre" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
              </svg>
            </span>
            <span className={`f resp__paso-num ah-op--${FORMAS[i]}`}>{i + 1}</span>
            <span className="f resp__paso-texto">{el.texto}</span>
            <span className="resp__paso-botones">
              <button type="button" className="editor-icono" aria-label={`Subir ${el.texto}`} disabled={i === 0} onClick={() => mover(i, i - 1)}>
                <Icono nombre="subir" tamano={18} />
              </button>
              <button type="button" className="editor-icono" aria-label={`Bajar ${el.texto}`} disabled={i === orden.length - 1} onClick={() => mover(i, i + 1)}>
                <Icono nombre="bajar" tamano={18} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="sr" aria-live="polite">
        {anuncio}
      </p>
      <EnviarBoton texto="Enviar orden" onClick={() => onResponder(orden.map((e) => e.id))} disabled={bloqueado} />
    </>
  );
}

interface PropsPoderes {
  poderes: BloquePoderes | null;
  onPoder: (poder: IdPoder, objetivoId?: string) => Promise<boolean>;
}

/** Inventario + selector de rival, compartidos por "Responder" y "Enviada" */
export function ControlPoderes({ poderes, onPoder, soloAtaques = false, puntos }: PropsPoderes & { soloAtaques?: boolean; puntos: number }) {
  const [elegido, setElegido] = useState<IdPoder | null>(null);
  const [usando, setUsando] = useState(false);
  if (!poderes) return null;
  const miPuesto = poderes.rivales.filter((r) => r.puntos > puntos).length + 1;
  async function usar(p: IdPoder, objetivoId?: string) {
    setUsando(true);
    const ok = await onPoder(p, objetivoId);
    setUsando(false);
    if (ok) setElegido(null);
  }
  return (
    <>
      <BarraPoderes
        inventario={soloAtaques ? poderes.inventario.filter((p) => PODERES[p].ataque || p === "escudo") : poderes.inventario}
        elegido={elegido}
        deshabilitado={usando || poderes.efectos.congeladoMs > 0}
        onElegir={(p) => (PODERES[p].ataque ? setElegido(p) : void usar(p))}
      />
      {elegido && PODERES[elegido].ataque && (
        <ElegirObjetivo
          poder={elegido}
          rivales={poderes.rivales}
          miPuesto={miPuesto}
          misPuntos={puntos}
          enviando={usando}
          onCancelar={() => setElegido(null)}
          onConfirmar={(id) => void usar(elegido, id)}
        />
      )}
    </>
  );
}

/** J4–J9 · Responder desde el celular (P1, P4–P9 en modo con poderes) */
export function Responder({ indice, total, puntos, tiempos, pregunta: p, enviando, error, onResponder, poderes, onPoder }: Props & PropsPoderes) {
  const ef = poderes?.efectos;
  const { previa, restante } = useReloj(tiempos, indice);
  const congelado = useRestante(ef?.congeladoMs ?? 0, ef?.aviso?.en ?? 0) > 0;
  const bloqueado = enviando || previa > 0 || restante <= 0 || congelado;
  // Vibración corta al llegar la pregunta (si el celular lo permite)
  useEffect(() => {
    navigator.vibrate?.(30);
  }, [indice]);
  const efBotones: EfectosBotones = ef
    ? { orden: ef.orden, ocultas: ef.ocultas, descartadas: ef.descartadas, nieblaMs: ef.nieblaMs, clave: ef.aviso?.en ?? 0 }
    : SIN_EFECTOS;

  return (
    <main className="resp">
      <header className="resp__cabecera">
        <Chip>
          {indice + 1} / {total}
        </Chip>
        <span className="resp__reloj-caja">
          <span className={`ah-chip f resp__reloj${restante <= 5 ? " resp__reloj--poco" : ""}`} role="timer" aria-label={`Quedan ${restante} segundos`}>
            <Reloj /> {restante}
          </span>
          {!!ef?.extraMs && <span className="pop f pod-extra">+5 s</span>}
        </span>
        <span className="f resp__puntos">
          {formatoPuntos(puntos)}
          {ef?.doble ? " → x2" : ""} pts
        </span>
      </header>
      <p className="resp__tipo">
        <span className="lbl">
          {p.tipo === "puzzle" ? nombreCortoTipo(p.tipo) : infoTipo(p.tipo).nombre}
          {poderes ? " · con poderes" : ""}
        </span>
        <span className="resp__instr">· {INSTRUCCION[p.tipo]}</span>
        {p.puntosDobles && <Chip color="sol">x2 ⚡</Chip>}
      </p>
      {ef?.aviso && <BannerPoder aviso={ef.aviso} />}
      <TarjetaPregunta p={p} />
      {error && (
        <p className="jugar__error" role="alert">
          {error}
        </p>
      )}
      {previa > 0 && (
        <div className="resp__previa" role="timer" aria-live="assertive" aria-label={`Empieza en ${previa}`}>
          <span className="f resp__previa-titulo">¡Prepárate!</span>
          <span key={previa} className="f pop resp__previa-num">
            {previa}
          </span>
        </div>
      )}
      {previa === 0 && p.tipo === "quiz" && <Quiz p={p} onResponder={onResponder} bloqueado={bloqueado} ef={efBotones} />}
      {previa === 0 && p.tipo === "verdadero_falso" && <VerdaderoFalso onResponder={onResponder} bloqueado={bloqueado} ef={efBotones} />}
      {previa === 0 && p.tipo === "respuesta_corta" && <Corta onResponder={onResponder} bloqueado={bloqueado} />}
      {previa === 0 && p.tipo === "deslizante" && <Deslizante p={p} onResponder={onResponder} bloqueado={bloqueado} />}
      {previa === 0 && p.tipo === "pin" && <Pin p={p} onResponder={onResponder} bloqueado={bloqueado} />}
      {previa === 0 && p.tipo === "puzzle" && <Puzzle p={p} onResponder={onResponder} bloqueado={bloqueado} />}
      {p.tipo !== "quiz" && p.tipo !== "verdadero_falso" && <Niebla ms={efBotones.nieblaMs} clave={efBotones.clave} />}
      <ControlPoderes poderes={poderes} onPoder={onPoder} puntos={puntos} />
      {ef && <Congelado ms={ef.congeladoMs} de={ef.aviso?.tipo === "congelar" ? ef.aviso.de : undefined} clave={ef.aviso?.en ?? 0} />}
    </main>
  );
}
