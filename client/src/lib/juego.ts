import { useEffect, useState } from "react";
import type { DatosPorTipo, TipoPregunta } from "../juego/preguntas";
import type { ColorAvatar } from "./socket";
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

export interface PantallaPreguntaAnfitrion {
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
  | { fase: "pregunta"; indice: number; total: number; pregunta: VistaPreguntaJugador; restanteMs: number; puntos: number; poderes: BloquePoderes | null }
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

/** Cuenta atrás local a partir de los ms que mandó el servidor */
export function useCuentaAtras(restanteMs: number, clave: unknown) {
  const [fin, setFin] = useState(() => Date.now() + restanteMs);
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    setFin(Date.now() + restanteMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((fin - ahora) / 1000));
}

/** 4280 → "4 280" (como en los diseños) */
export const formatoPuntos = (n: number) => n.toLocaleString("es-ES").replace(/\./g, " ");
/** 2 → "2.º" */
export const ordinal = (n: number) => `${n}.º`;
