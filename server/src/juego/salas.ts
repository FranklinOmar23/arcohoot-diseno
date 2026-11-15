import crypto from "node:crypto";
import { prisma } from "../db.js";
import type { PreguntaEntrada } from "../preguntas.js";
import type { Efectos, EventoFeed, IdPoder } from "./poderes.js";

// Estado en memoria de las partidas abiertas, indexado por PIN.
// La base de datos guarda la partida; aquí vive lo que cambia segundo a segundo.

export const COLORES_AVATAR = ["sol", "arco", "laguna", "anil", "hielo", "exito", "epico", "niebla"] as const;
export type ColorAvatar = (typeof COLORES_AVATAR)[number];

export const MAX_APODO = 15;
export const MAX_JUGADORES = 200;

export interface Jugador {
  id: string;
  apodo: string;
  color: ColorAvatar;
  token: string;
  socketId: string | null;
  conectado: boolean;
  puntos: number;
  racha: number;
  aciertos: number;
  /** Una entrada por pregunta jugada (para guardar resultados y el Excel) */
  historial: { indice: number; respuesta: string; correcta: boolean; puntos: number; ms: number | null }[];
  /** Para retirar de la sala a quien se desconecta y no vuelve */
  desconectadoEn: number | null;
  // ── Modo con poderes ──
  inventario: IdPoder[];
  escudo: boolean;
  /** Poder que se activa al empezar la próxima pregunta ("Usar ahora" en P2) */
  armado: { poder: IdPoder; objetivoId: string | null } | null;
  /** Poder recién ganado, a la espera de que el jugador diga Guardar / Usar ahora */
  poderNuevo: { poder: IdPoder; motivo: string } | null;
}

export type FaseJuego = "pregunta" | "resultado" | "ranking" | "podio";

export interface RespuestaEnCurso {
  valor: unknown;
  texto: string;
  correcta: boolean;
  puntos: number;
  ms: number;
}

export interface Juego {
  preguntas: PreguntaEntrada[];
  indice: number;
  fase: FaseJuego;
  inicio: number;
  duracionMs: number;
  temporizador: NodeJS.Timeout | null;
  respuestas: Map<string, RespuestaEnCurso>;
  /** Orden revuelto del puzzle actual (el mismo para todos) */
  orden: number[];
  /** Ids ordenados por puntos antes de la pregunta (para ▲▼ del ranking) */
  rankingAntes: string[];
  /** Pantallas ya calculadas, para reenviarlas a quien se reconecta */
  pantallaAnfitrion: Record<string, unknown> | null;
  pantallaJugador: Map<string, Record<string, unknown>>;
  guardado: boolean;
  /** Efectos de poderes por jugador en la pregunta en curso */
  efectos: Map<string, Efectos>;
  /** Últimas jugadas de poderes, para el panel de H5 */
  feed: EventoFeed[];
}

export type EstadoSala = "sala" | "jugando" | "terminada";

export interface Sala {
  pin: string;
  partidaId: string;
  quizId: string;
  titulo: string;
  numPreguntas: number;
  anfitrionId: string;
  modo: "clasico" | "poderes";
  apodosVisibles: boolean;
  bloqueada: boolean;
  estado: EstadoSala;
  jugadores: Map<string, Jugador>;
  siguienteColor: number;
  juego: Juego | null;
}

const salas = new Map<string, Sala>();

/** Busca la sala en memoria o la reconstruye desde la base (p. ej. tras reiniciar el servidor) */
export async function obtenerSala(pin: string): Promise<Sala | null> {
  const enMemoria = salas.get(pin);
  if (enMemoria) return enMemoria;
  const partida = await prisma.partida.findUnique({
    where: { pin },
    include: { quiz: { select: { titulo: true, _count: { select: { preguntas: true } } } } },
  });
  if (!partida || partida.estado === "terminada") return null;
  const sala: Sala = {
    pin,
    partidaId: partida.id,
    quizId: partida.quizId,
    titulo: partida.quiz.titulo,
    numPreguntas: partida.quiz._count.preguntas,
    anfitrionId: partida.anfitrionId,
    modo: partida.modo === "poderes" ? "poderes" : "clasico",
    apodosVisibles: partida.apodosVisibles,
    bloqueada: false,
    estado: partida.estado as EstadoSala,
    jugadores: new Map(),
    siguienteColor: 0,
    juego: null,
  };
  // Si el servidor se reinició a media partida, no hay forma de recuperar los puntos: vuelve a la sala
  if (sala.estado === "jugando") {
    sala.estado = "sala";
    await prisma.partida.update({ where: { id: partida.id }, data: { estado: "sala" } });
  }
  salas.set(pin, sala);
  return sala;
}

export function cerrarSala(pin: string) {
  const s = salas.get(pin);
  if (s?.juego?.temporizador) clearTimeout(s.juego.temporizador);
  salas.delete(pin);
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function limpiarApodo(apodo: unknown): string {
  if (typeof apodo !== "string") return "";
  // Sin caracteres de control; espacios colapsados
  return apodo.replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_APODO);
}

export type ErrorEntrada = "apodo-vacio" | "apodo-usado" | "sala-bloqueada" | "sala-llena" | "ya-empezo";

export function agregarJugador(sala: Sala, apodo: string, socketId: string): Jugador | ErrorEntrada {
  if (!apodo) return "apodo-vacio";
  if (sala.estado !== "sala") return "ya-empezo";
  if (sala.bloqueada) return "sala-bloqueada";
  if (sala.jugadores.size >= MAX_JUGADORES) return "sala-llena";
  const n = normalizar(apodo);
  for (const j of sala.jugadores.values()) if (normalizar(j.apodo) === n) return "apodo-usado";

  const jugador: Jugador = {
    id: crypto.randomBytes(8).toString("hex"),
    apodo,
    color: COLORES_AVATAR[sala.siguienteColor++ % COLORES_AVATAR.length],
    token: crypto.randomBytes(18).toString("base64url"),
    socketId,
    conectado: true,
    puntos: 0,
    racha: 0,
    aciertos: 0,
    historial: [],
    desconectadoEn: null,
    inventario: [],
    escudo: false,
    armado: null,
    poderNuevo: null,
  };
  sala.jugadores.set(jugador.id, jugador);
  return jugador;
}

export function jugadorPorToken(sala: Sala, token: unknown): Jugador | null {
  if (typeof token !== "string") return null;
  for (const j of sala.jugadores.values()) {
    if (j.token.length === token.length && crypto.timingSafeEqual(Buffer.from(j.token), Buffer.from(token))) return j;
  }
  return null;
}

/** Lo que ve el anfitrión de cada jugador */
export const jugadorPublico = (j: Jugador) => ({ id: j.id, apodo: j.apodo, color: j.color, conectado: j.conectado });

export const resumenSala = (s: Sala) => ({
  pin: s.pin,
  titulo: s.titulo,
  numPreguntas: s.numPreguntas,
  modo: s.modo,
  apodosVisibles: s.apodosVisibles,
  bloqueada: s.bloqueada,
  estado: s.estado,
  jugadores: [...s.jugadores.values()].map(jugadorPublico),
});

/** Todas las salas en memoria (para la limpieza periódica) */
export const todasLasSalas = () => salas.values();
