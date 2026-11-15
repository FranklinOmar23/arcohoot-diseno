import crypto from "node:crypto";
import type { PreguntaEntrada } from "../preguntas.js";
import type { Jugador, Sala } from "./salas.js";

// Modo con poderes: catálogo, cómo se ganan y qué hace cada uno.
// Los efectos viven solo durante la pregunta en curso (salvo el Escudo, que dura hasta bloquear un ataque).

export type IdPoder = "doble" | "tiempo" | "cincuenta" | "escudo" | "segunda" | "niebla" | "revolver" | "congelar" | "robo";
export type Rareza = "comun" | "raro" | "epico";

export const PODERES: Record<IdPoder, { nombre: string; emoji: string; rareza: Rareza; ataque: boolean }> = {
  doble: { nombre: "Doble", emoji: "⚡", rareza: "comun", ataque: false },
  tiempo: { nombre: "Tiempo extra", emoji: "⏱️", rareza: "comun", ataque: false },
  cincuenta: { nombre: "50/50", emoji: "✂️", rareza: "comun", ataque: false },
  escudo: { nombre: "Escudo", emoji: "🛡️", rareza: "raro", ataque: false },
  segunda: { nombre: "Segunda oportunidad", emoji: "🔁", rareza: "raro", ataque: false },
  niebla: { nombre: "Niebla", emoji: "🌫️", rareza: "raro", ataque: true },
  revolver: { nombre: "Revolver", emoji: "🔀", rareza: "raro", ataque: true },
  congelar: { nombre: "Congelar", emoji: "❄️", rareza: "epico", ataque: true },
  robo: { nombre: "Robo", emoji: "💰", rareza: "epico", ataque: true },
};

export const MAX_INVENTARIO = 3;
const PESO_RAREZA: Record<Rareza, number> = { comun: 55, raro: 33, epico: 12 };
export const TIEMPO_EXTRA_MS = 5000;
export const NIEBLA_MS = 5000;
export const CONGELAR_MS = 3000;
export const ROBO_FRACCION = 0.1;

export const esIdPoder = (v: unknown): v is IdPoder => typeof v === "string" && v in PODERES;

/** Efectos de un jugador en la pregunta en curso */
export interface Efectos {
  doble: boolean;
  extraMs: number;
  ocultas: number[];
  segunda: boolean;
  congeladoHasta: number;
  nieblaHasta: number;
  /** Orden visual de los botones si lo revolvieron (índices originales) */
  orden: number[] | null;
  /** Lo último que le pasó, para el banner (P4–P9) */
  aviso: { tipo: IdPoder | "bloqueo"; texto: string; de?: string; en: number } | null;
  /** Lo que ya respondió mal si usó Segunda oportunidad */
  descartadas: number[];
}

export const efectosVacios = (): Efectos => ({
  doble: false,
  extraMs: 0,
  ocultas: [],
  segunda: false,
  congeladoHasta: 0,
  nieblaHasta: 0,
  orden: null,
  aviso: null,
  descartadas: [],
});

export interface EventoFeed {
  poder: IdPoder | "bloqueo";
  actor: string;
  objetivo?: string;
  texto: string;
  en: number;
}

/** Sorteo de un poder según la rareza */
export function sortearPoder(): IdPoder {
  const ids = Object.keys(PODERES) as IdPoder[];
  const pesos = ids.map((id) => PESO_RAREZA[PODERES[id].rareza] / ids.filter((x) => PODERES[x].rareza === PODERES[id].rareza).length);
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = (crypto.randomInt(0, 1_000_000) / 1_000_000) * total;
  for (let i = 0; i < ids.length; i++) {
    r -= pesos[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

/**
 * ¿Gana un poder al cerrar la pregunta? Solo si acertó y tiene espacio.
 * - Pregunta de puntos dobles en quizzes de más de 10 preguntas: seguro.
 * - Racha de 3, 6, 9…: seguro.
 * - Responder en menos del 30 % del tiempo: 40 % de probabilidad.
 */
export function motivoPoder(j: Jugador, p: PreguntaEntrada, totalPreguntas: number, correcta: boolean, ms: number, duracionMs: number): string | null {
  if (!correcta || j.inventario.length >= MAX_INVENTARIO) return null;
  if (p.puntosDobles && totalPreguntas > 10) return "Por acertar la pregunta de puntos dobles ⚡";
  if (j.racha > 0 && j.racha % 3 === 0) return `Por acertar ${j.racha} seguidas 🔥`;
  if (ms <= duracionMs * 0.3 && crypto.randomInt(0, 100) < 40) return "Por responder rapidísimo 💨";
  return null;
}

/** ¿Se puede usar este poder en esta pregunta? (null = sí; si no, el motivo) */
export function motivoNoUsable(id: IdPoder, p: PreguntaEntrada, ef: Efectos): string | null {
  const conOpciones = p.tipo === "quiz" || p.tipo === "verdadero_falso";
  if (id === "cincuenta") {
    if (p.tipo !== "quiz") return "El 50/50 solo sirve en preguntas Quiz.";
    const ops = (p.datos as { opciones: { correcta: boolean }[] }).opciones;
    if (ops.length < 3 || ops.filter((o) => !o.correcta).length < 1) return "Esta pregunta no tiene suficientes opciones para el 50/50.";
    if (ef.ocultas.length) return "Ya usaste el 50/50 en esta pregunta.";
  }
  if (id === "revolver" && !conOpciones) return "Revolver solo funciona en preguntas con botones.";
  if (id === "doble" && ef.doble) return "Ya tienes el x2 activo.";
  if (id === "tiempo" && ef.extraMs) return "Ya tienes tiempo extra.";
  if (id === "segunda" && ef.segunda) return "Ya tienes una segunda oportunidad.";
  return null;
}

/** Elige dos opciones incorrectas al azar para el 50/50 */
export function opcionesAOcultar(p: PreguntaEntrada): number[] {
  const ops = (p.datos as { opciones: { correcta: boolean }[] }).opciones;
  const malas = ops.map((o, i) => (o.correcta ? -1 : i)).filter((i) => i >= 0);
  for (let i = malas.length - 1; i > 0; i--) {
    const k = crypto.randomInt(0, i + 1);
    [malas[i], malas[k]] = [malas[k], malas[i]];
  }
  // Con 4 opciones quita 2; con 3 quita 1: siempre quedan al menos dos a la vista
  return malas.slice(0, Math.max(0, Math.min(2, ops.length - 2))).sort((a, b) => a - b);
}

/** Orden revuelto para "Revolver" (nunca el mismo orden) */
export function ordenRevuelto(n: number): number[] {
  const o = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const k = crypto.randomInt(0, i + 1);
    [o[i], o[k]] = [o[k], o[i]];
  }
  if (o.every((v, i) => v === i)) o.push(o.shift()!);
  return o;
}

/** Texto del feed y verbo para el aviso del objetivo */
export function textoAtaque(id: IdPoder, actor: string, objetivo: string, robados = 0) {
  switch (id) {
    case "congelar":
      return { feed: `${actor} congeló a ${objetivo} ❄️`, aviso: `${actor} usó Congelar contra ti` };
    case "niebla":
      return { feed: `${actor} nubló a ${objetivo} 🌫️`, aviso: `${actor} nubló tus opciones · se disipa en 5 s` };
    case "revolver":
      return { feed: `${actor} revolvió a ${objetivo} 🔀`, aviso: `${actor} cambió tus botones de lugar` };
    case "robo":
      return { feed: `${actor} robó ${robados} pts a ${objetivo} 💰`, aviso: `${actor} te robó ${robados} pts` };
    default:
      return { feed: `${actor} usó ${PODERES[id].nombre} contra ${objetivo}`, aviso: `${actor} usó ${PODERES[id].nombre} contra ti` };
  }
}

export const textoPropio = (id: IdPoder, actor: string) =>
  id === "escudo" ? `${actor} activó su Escudo 🛡️` : `${actor} activó ${PODERES[id].nombre} ${PODERES[id].emoji}`;

export const rivales = (sala: Sala, yo: Jugador) =>
  [...sala.jugadores.values()]
    .sort((a, b) => b.puntos - a.puntos)
    .map((j, i) => ({ id: j.id, apodo: j.apodo, color: j.color, puntos: j.puntos, puesto: i + 1, protegido: j.escudo }))
    .filter((r) => r.id !== yo.id);
