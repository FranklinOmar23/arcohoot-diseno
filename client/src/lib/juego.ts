import { useEffect, useMemo, useState } from "react";
import type { DatosPorTipo, TipoPregunta } from "../juego/preguntas";
import { desfaseReloj, type ColorAvatar } from "./socket";
import type { IdPoder } from "../juego/poderes";

// Pantallas que manda el servidor (server/src/juego/motor.ts)

export interface VistaPreguntaAnfitrion {
  tipo: TipoPregunta;
  enunciado: string;
  imagen: string | null;
  tiempo: number;
  puntosDobles: boolean;
  opciones?: string[];
  min?: number;
  max?: number;
  unidad?: string;
  numElementos?: number;
}

export interface PantallaPreguntaAnfitrion extends TiemposPregunta {
  fase: "pregunta";
  indice: number;
  total: number;
  modo: "clasico" | "poderes";
  pregunta: VistaPreguntaAnfitrion;
  restanteMs: number;
  respondieron: number;
  conectados: number;
  feed: EventoFeed[];
}

export type Stats =
  | { aciertos: number; conteos: number[] }
  | { aciertos: number; grupos: { texto: string; n: number; correcta: boolean }[] }
  | {
      aciertos: number;
      barras: number[];
      casillaCorrecta: number;
      promedio: number | null;
      min: number;
      max: number;
      correcta: number;
      margen: number;
      unidad: string;
    }
  | { aciertos: number; puntos: { x: number; y: number }[]; zona: DatosPorTipo["pin"]["zona"] }
  | { aciertos: number; elementos: string[] };

export interface PantallaResultadoAnfitrion {
  fase: "resultado";
  indice: number;
  total: number;
  ultima: boolean;
  pregunta: VistaPreguntaAnfitrion & { datos: unknown };
  stats: Stats;
  respondieron: number;
  jugadores: number;
}

export interface FilaRanking {
  id: string;
  apodo: string;
  color: ColorAvatar;
  puntos: number;
  racha: number;
  cambio: number;
}

export interface PantallaRanking {
  fase: "ranking";
  indice: number;
  total: number;
  filas: FilaRanking[];
  destacado: { apodo: string; puestos: number } | null;
}

export interface PantallaPodio {
  fase: "podio";
  partidaId: string;
  titulo: string;
  quizId: string;
  pin: string;
  jugadores: number;
  total: number;
  podio: { puesto: number; apodo: string; color: ColorAvatar; puntos: number }[];
}

export type PantallaAnfitrion = PantallaPreguntaAnfitrion | PantallaResultadoAnfitrion | PantallaRanking | PantallaPodio;

export interface VistaPreguntaJugador {
  tipo: TipoPregunta;
  enunciado: string;
  tiempo: number;
  puntosDobles: boolean;
  opciones?: string[];
  min?: number;
  max?: number;
  paso?: number;
  unidad?: string;
  imagen?: string | null;
  elementos?: { id: number; texto: string }[];
}

export interface Rival {
  id: string;
  apodo: string;
  color: ColorAvatar;
  puntos: number;
  puesto: number;
  protegido: boolean;
}

export interface AvisoPoder {
  tipo: IdPoder | "bloqueo";
  texto: string;
  de?: string;
  en: number;
}

/** Estado de poderes del jugador (solo en modo con poderes) */
export interface BloquePoderes {
  inventario: IdPoder[];
  escudo: boolean;
  armado: IdPoder | null;
  efectos: {
    doble: boolean;
    extraMs: number;
    ocultas: number[];
    segunda: boolean;
    congeladoMs: number;
    nieblaMs: number;
    orden: number[] | null;
    descartadas: number[];
    aviso: AvisoPoder | null;
  };
  rivales: Rival[];
}

export interface EventoFeed {
  poder: IdPoder | "bloqueo";
  actor: string;
  objetivo?: string;
  texto: string;
  en: number;
  haceMs: number;
}

export type PantallaJugador =
  | ({ fase: "pregunta"; indice: number; total: number; pregunta: VistaPreguntaJugador; puntos: number; poderes: BloquePoderes | null } & TiemposPregunta)
  | { fase: "enviada"; indice: number; total: number; puntos: number; poderes: BloquePoderes | null }
  | {
      fase: "resultado";
      indice: number;
      total: number;
      respondio: boolean;
      correcta: boolean;
      ganados: number;
      puntos: number;
      racha: number;
      dobles: boolean;
      puesto: number;
      delante: { apodo: string; diferencia: number } | null;
      respuestaCorrecta: { texto: string; forma: number | null };
      poderNuevo?: { poder: IdPoder; motivo: string } | null;
      poderes?: BloquePoderes | null;
    }
  | { fase: "podio"; puesto: number; jugadores: number; puntos: number; aciertos: number; total: number };

/** Tiempos de una pregunta tal como los manda el servidor */
export interface TiemposPregunta {
  /** Horas del servidor (ms) */
  inicioEn: number;
  finEn: number;
  /** Lo mismo, relativo al momento del envío (por si aún no se midió el desfase) */
  empiezaEnMs: number;
  restanteMs: number;
}

/**
 * Cuenta atrás de la pregunta.
 * - previa: segundos del «¡Prepárate!» (0 cuando ya empezó)
 * - restante: segundos para responder (no baja durante la previa)
 * Usa la hora del servidor si ya se midió el desfase; si no, cuenta desde que llegó el aviso.
 */
export function useReloj(t: TiemposPregunta, clave: unknown) {
  const { inicioLocal, finLocal } = useMemo(() => {
    const d = desfaseReloj();
    const recibido = Date.now();
    return d !== null
      ? { inicioLocal: t.inicioEn - d, finLocal: t.finEn - d }
      : { inicioLocal: recibido + t.empiezaEnMs, finLocal: recibido + t.restanteMs };
    // Se recalcula con cada pregunta nueva o si cambia el cierre (+5 s de Tiempo extra)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, t.inicioEn, t.finEn]);
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  const previa = Math.max(0, Math.ceil((inicioLocal - ahora) / 1000));
  const restante = Math.max(0, Math.ceil((finLocal - Math.max(ahora, inicioLocal)) / 1000));
  return { previa, restante };
}

/** 4280 → "4 280" (como en los diseños) */
export const formatoPuntos = (n: number) => n.toLocaleString("es-ES").replace(/\./g, " ");
/** 2 → "2.º" */
export const ordinal = (n: number) => `${n}.º`;
