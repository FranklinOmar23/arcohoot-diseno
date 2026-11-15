import { prisma } from "../db.js";
import { esquemaPregunta, type PreguntaEntrada } from "../preguntas.js";
import { estadisticas, evaluar, mezcla, puntuar, respuestaCorrecta, vistaAnfitrion, vistaJugador } from "./reglas.js";
import {
  CONGELAR_MS,
  efectosVacios,
  MAX_INVENTARIO,
  motivoNoUsable,
  motivoPoder,
  NIEBLA_MS,
  opcionesAOcultar,
  ordenRevuelto,
  PODERES,
  rivales,
  ROBO_FRACCION,
  sortearPoder,
  textoAtaque,
  textoPropio,
  TIEMPO_EXTRA_MS,
  type Efectos,
  type IdPoder,
} from "./poderes.js";
import type { Jugador, Juego, Sala } from "./salas.js";

// Máquina de fases de una partida: pregunta → resultado → ranking → … → podio.
// El servidor manda el reloj: el celular solo recibe cuánto falta.

/** Margen para respuestas que llegan justo al final por la latencia de la red */
const GRACIA_MS = 600;
/** «¡Prepárate!» antes de cada pregunta: absorbe el retraso con que llega el aviso a cada celular */
export const PREVIA_MS = 3000;
const MAX_FEED = 6;

export interface Emisor {
  anfitrion(sala: Sala, pantalla: Record<string, unknown>): void;
  jugador(sala: Sala, jugador: Jugador, pantalla: Record<string, unknown>): void;
  respuestas(sala: Sala, respondieron: number, conectados: number): void;
}

const ordenados = (sala: Sala) =>
  [...sala.jugadores.values()].sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos || a.apodo.localeCompare(b.apodo));

const conectados = (sala: Sala) => [...sala.jugadores.values()].filter((j) => j.conectado).length;

const conPoderes = (sala: Sala) => sala.modo === "poderes";

function efectos(juego: Juego, j: Jugador): Efectos {
  let e = juego.efectos.get(j.id);
  if (!e) {
    e = efectosVacios();
    juego.efectos.set(j.id, e);
  }
  return e;
}

export async function empezarJuego(sala: Sala, emisor: Emisor) {
  const quiz = await prisma.quiz.findUnique({ where: { id: sala.quizId }, include: { preguntas: { orderBy: { orden: "asc" } } } });
  const preguntas: PreguntaEntrada[] = [];
  for (const p of quiz?.preguntas ?? []) {
    const r = esquemaPregunta.safeParse({ ...p, datos: JSON.parse(p.datos) });
    if (r.success) preguntas.push(r.data);
  }
  if (!preguntas.length) throw new Error("El quiz no tiene preguntas.");
  for (const j of sala.jugadores.values()) {
    Object.assign(j, { puntos: 0, racha: 0, aciertos: 0, historial: [], inventario: [], escudo: false, armado: null, poderNuevo: null });
  }
  sala.numPreguntas = preguntas.length;
  sala.juego = {
    preguntas,
    indice: -1,
    fase: "pregunta",
    inicio: 0,
    duracionMs: 0,
    temporizador: null,
    respuestas: new Map(),
    orden: [],
    rankingAntes: [],
    pantallaAnfitrion: null,
    pantallaJugador: new Map(),
    guardado: false,
    efectos: new Map(),
    feed: [],
  };
  lanzarPregunta(sala, emisor, 0);
}

/** Cierre programado: al acabar el tiempo (más el tiempo extra más largo que alguien tenga) */
function programarCierre(sala: Sala, emisor: Emisor) {
  const juego = sala.juego!;
  if (juego.temporizador) clearTimeout(juego.temporizador);
  const extra = Math.max(0, ...[...juego.efectos.entries()].filter(([id]) => !juego.respuestas.has(id)).map(([, e]) => e.extraMs));
  const espera = juego.inicio + juego.duracionMs + extra + GRACIA_MS - Date.now();
  juego.temporizador = setTimeout(() => cerrarPregunta(sala, emisor), Math.max(0, espera));
}

function lanzarPregunta(sala: Sala, emisor: Emisor, indice: number) {
  const juego = sala.juego!;
  const p = juego.preguntas[indice];
  juego.indice = indice;
  juego.fase = "pregunta";
  juego.respuestas = new Map();
  juego.efectos = new Map();
  juego.duracionMs = p.tiempo * 1000;
  // El reloj empieza tras la cuenta 3-2-1: así todos arrancan a la vez aunque a alguien le llegue tarde
  juego.inicio = Date.now() + PREVIA_MS;
  juego.rankingAntes = ordenados(sala).map((j) => j.id);
  juego.orden = p.tipo === "puzzle" ? mezcla((p.datos as { elementos: string[] }).elementos.length, juego.inicio) : [];
  juego.pantallaJugador = new Map();
  programarCierre(sala, emisor);

  if (conPoderes(sala)) {
    for (const j of sala.jugadores.values()) {
      // Quien no decidió qué hacer con su poder nuevo: se guarda solo si hay espacio
      if (j.poderNuevo) {
        if (j.inventario.length < MAX_INVENTARIO) j.inventario.push(j.poderNuevo.poder);
        j.poderNuevo = null;
      }
    }
    // Poderes que se dejaron listos con "Usar ahora"
    for (const j of sala.jugadores.values()) {
      if (!j.armado) continue;
      const { poder, objetivoId } = j.armado;
      j.armado = null;
      aplicarPoder(sala, emisor, j, poder, objetivoId, { avisar: false });
    }
  }
  emitirTodo(sala, emisor);
}

/**
 * Tiempos de la pregunta. inicioEn / finEn son horas del servidor (el celular las convierte con su
 * diferencia de reloj medida al conectar); empiezaEnMs / restanteMs sirven si aún no la midió.
 */
function reloj(inicio: number, fin: number) {
  const ahora = Date.now();
  return { inicioEn: inicio, finEn: fin, empiezaEnMs: Math.max(0, inicio - ahora), restanteMs: Math.max(0, fin - ahora) };
}

/** Pantalla actual del anfitrión (se recalcula en "pregunta" por el reloj) */
export function pantallaAnfitrion(sala: Sala): Record<string, unknown> | null {
  const juego = sala.juego;
  if (!juego) return null;
  if (juego.fase !== "pregunta") return juego.pantallaAnfitrion;
  const p = juego.preguntas[juego.indice];
  return {
    fase: "pregunta",
    indice: juego.indice,
    total: juego.preguntas.length,
    modo: sala.modo,
    pregunta: vistaAnfitrion(p),
    ...reloj(juego.inicio, juego.inicio + juego.duracionMs),
    respondieron: juego.respuestas.size,
    conectados: conectados(sala),
    feed: conPoderes(sala) ? juego.feed.slice(0, MAX_FEED).map((f) => ({ ...f, haceMs: Date.now() - f.en })) : [],
  };
}

function bloquePoderes(sala: Sala, j: Jugador) {
  const juego = sala.juego!;
  const e = juego.fase === "pregunta" ? efectos(juego, j) : efectosVacios();
  const ahora = Date.now();
  return {
    inventario: j.inventario,
    escudo: j.escudo,
    armado: j.armado?.poder ?? null,
    efectos: {
      doble: e.doble,
      extraMs: e.extraMs,
      ocultas: e.ocultas,
      segunda: e.segunda,
      congeladoMs: Math.max(0, e.congeladoHasta - ahora),
      nieblaMs: Math.max(0, e.nieblaHasta - ahora),
      orden: e.orden,
      descartadas: e.descartadas,
      aviso: e.aviso && ahora - e.aviso.en < 8000 ? e.aviso : null,
    },
    rivales: rivales(sala, j),
  };
}

/** Pantalla actual de un jugador */
export function pantallaJugador(sala: Sala, j: Jugador): Record<string, unknown> | null {
  const juego = sala.juego;
  if (!juego) return null;
  const poderes = conPoderes(sala) ? bloquePoderes(sala, j) : null;
  if (juego.fase === "pregunta") {
    const p = juego.preguntas[juego.indice];
    if (juego.respuestas.has(j.id)) return { fase: "enviada", indice: juego.indice, total: juego.preguntas.length, puntos: j.puntos, poderes };
    const extra = juego.efectos.get(j.id)?.extraMs ?? 0;
    return {
      fase: "pregunta",
      indice: juego.indice,
      total: juego.preguntas.length,
      pregunta: vistaJugador(p, juego.orden),
      ...reloj(juego.inicio, juego.inicio + juego.duracionMs + extra),
      puntos: j.puntos,
      poderes,
    };
  }
  const guardada = juego.pantallaJugador.get(j.id);
  if (!guardada) return null;
  if (guardada.fase === "resultado") return { ...guardada, poderNuevo: j.poderNuevo, poderes };
  return guardada;
}

function emitirTodo(sala: Sala, emisor: Emisor) {
  const a = pantallaAnfitrion(sala);
  if (a) emisor.anfitrion(sala, a);
  for (const j of sala.jugadores.values()) {
    const v = pantallaJugador(sala, j);
    if (v) emisor.jugador(sala, j, v);
  }
}

export type ResultadoRespuesta = { ok: true; reintento?: boolean } | { ok: false; error: string };

export function responder(sala: Sala, emisor: Emisor, j: Jugador, indice: unknown, valor: unknown): ResultadoRespuesta {
  const juego = sala.juego;
  if (!juego || juego.fase !== "pregunta" || indice !== juego.indice) return { ok: false, error: "Esta pregunta ya cerró." };
  if (juego.respuestas.has(j.id)) return { ok: false, error: "Ya respondiste." };
  const e = efectos(juego, j);
  const ahora = Date.now();
  if (ahora < juego.inicio) return { ok: false, error: "¡Espera! La pregunta aún no empieza." };
  if (e.congeladoHasta > ahora) return { ok: false, error: "¡Estás congelado! Espera un momento." };
  const duracion = juego.duracionMs + e.extraMs;
  const ms = ahora - juego.inicio;
  if (ms > duracion + GRACIA_MS) return { ok: false, error: "Se acabó el tiempo." };
  const p = juego.preguntas[juego.indice];
  const ev = evaluar(p, valor);
  if (!ev) return { ok: false, error: "Respuesta no válida." };

  // Segunda oportunidad: el primer error no cuenta
  if (!ev.correcta && e.segunda) {
    e.segunda = false;
    // Quiz: índice de la opción. V/F: 0 = Verdadero, 1 = Falso
    if (typeof ev.valor === "number") e.descartadas.push(ev.valor);
    if (typeof ev.valor === "boolean") e.descartadas.push(ev.valor ? 0 : 1);
    e.aviso = { tipo: "segunda", texto: "¡Fallaste, pero tienes otra oportunidad!", en: ahora };
    emisor.jugador(sala, j, pantallaJugador(sala, j)!);
    return { ok: true, reintento: true };
  }

  const msUsados = Math.min(ms, duracion);
  const racha = ev.correcta ? j.racha + 1 : 0;
  const puntos = puntuar(ev.correcta, msUsados, duracion, racha, p.puntosDobles) * (e.doble ? 2 : 1);
  juego.respuestas.set(j.id, { ...ev, puntos, ms: msUsados });
  emisor.respuestas(sala, juego.respuestas.size, conectados(sala));
  emisor.jugador(sala, j, pantallaJugador(sala, j)!);

  // Si ya respondieron todos los conectados, no hace falta esperar al reloj
  const pendientes = [...sala.jugadores.values()].filter((x) => x.conectado && !juego.respuestas.has(x.id));
  if (pendientes.length === 0) cerrarPregunta(sala, emisor);
  return { ok: true };
}

// ── Poderes ──────────────────────────────────────────────

function alFeed(sala: Sala, evento: Juego["feed"][number], emisor: Emisor) {
  const juego = sala.juego!;
  juego.feed.unshift(evento);
  juego.feed.length = Math.min(juego.feed.length, 20);
  const a = pantallaAnfitrion(sala);
  if (a && juego.fase === "pregunta") emisor.anfitrion(sala, a);
}

/** Aplica un poder. Con `consumir` se quita del inventario (uso normal durante la pregunta). */
function aplicarPoder(
  sala: Sala,
  emisor: Emisor,
  j: Jugador,
  poder: IdPoder,
  objetivoId: string | null,
  { avisar = true }: { avisar?: boolean } = {},
): ResultadoRespuesta & { bloqueado?: boolean } {
  const juego = sala.juego!;
  const p = juego.preguntas[juego.indice];
  const info = PODERES[poder];
  const ahora = Date.now();

  if (info.ataque) {
    const t = objetivoId ? sala.jugadores.get(objetivoId) : undefined;
    if (!t || t.id === j.id) return { ok: false, error: "Elige a un rival." };
    if (poder === "revolver" && p.tipo !== "quiz" && p.tipo !== "verdadero_falso") return { ok: false, error: "Revolver solo funciona en preguntas con botones." };
    if (t.escudo) {
      t.escudo = false;
      efectos(juego, t).aviso = { tipo: "bloqueo", texto: `¡Bloqueó el ${info.nombre} ${info.emoji} de ${j.apodo}!`, de: j.apodo, en: ahora };
      efectos(juego, j).aviso = { tipo: "bloqueo", texto: `${t.apodo} tenía Escudo: tu ${info.nombre} se perdió`, en: ahora };
      alFeed(sala, { poder: "bloqueo", actor: t.apodo, objetivo: j.apodo, texto: `El Escudo de ${t.apodo} bloqueó a ${j.apodo} 🛡️`, en: ahora }, emisor);
      emisor.jugador(sala, t, pantallaJugador(sala, t)!);
      if (avisar) emisor.jugador(sala, j, pantallaJugador(sala, j)!);
      return { ok: true, bloqueado: true };
    }
    const et = efectos(juego, t);
    let robados = 0;
    // Durante el «¡Prepárate!» el efecto cuenta desde que empieza la pregunta
    const desde = Math.max(ahora, juego.inicio);
    if (poder === "congelar") et.congeladoHasta = desde + CONGELAR_MS;
    if (poder === "niebla") et.nieblaHasta = desde + NIEBLA_MS;
    if (poder === "revolver") et.orden = ordenRevuelto(p.tipo === "verdadero_falso" ? 2 : (p.datos as { opciones: unknown[] }).opciones.length);
    if (poder === "robo") {
      robados = Math.floor(t.puntos * ROBO_FRACCION);
      t.puntos -= robados;
      j.puntos += robados;
    }
    const txt = textoAtaque(poder, j.apodo, t.apodo, robados);
    et.aviso = { tipo: poder, texto: txt.aviso, de: j.apodo, en: ahora };
    alFeed(sala, { poder, actor: j.apodo, objetivo: t.apodo, texto: txt.feed, en: ahora }, emisor);
    emisor.jugador(sala, t, pantallaJugador(sala, t)!);
  } else {
    const e = efectos(juego, j);
    const motivo = motivoNoUsable(poder, p, e);
    if (motivo) return { ok: false, error: motivo };
    if (poder === "doble") {
      e.doble = true;
      e.aviso = { tipo: "doble", texto: "Si aciertas, esta respuesta vale el doble", en: ahora };
    }
    if (poder === "tiempo") {
      e.extraMs = TIEMPO_EXTRA_MS;
      e.aviso = { tipo: "tiempo", texto: "+5 segundos solo para ti en esta pregunta", en: ahora };
      programarCierre(sala, emisor);
    }
    if (poder === "cincuenta") {
      e.ocultas = opcionesAOcultar(p);
      e.aviso = { tipo: "cincuenta", texto: "Quitamos opciones incorrectas", en: ahora };
    }
    if (poder === "escudo") {
      j.escudo = true;
      e.aviso = { tipo: "escudo", texto: "Bloqueará el próximo ataque que te lancen", en: ahora };
    }
    if (poder === "segunda") {
      e.segunda = true;
      e.aviso = { tipo: "segunda", texto: "Si fallas, puedes responder otra vez", en: ahora };
    }
    alFeed(sala, { poder, actor: j.apodo, texto: textoPropio(poder, j.apodo), en: ahora }, emisor);
  }
  if (avisar) emisor.jugador(sala, j, pantallaJugador(sala, j)!);
  return { ok: true };
}

/** El jugador toca un poder de su inventario durante la pregunta (P1 → P3) */
export function usarPoder(sala: Sala, emisor: Emisor, j: Jugador, poder: unknown, objetivoId: unknown): ResultadoRespuesta {
  const juego = sala.juego;
  if (!conPoderes(sala)) return { ok: false, error: "Esta partida es en modo clásico." };
  if (!juego || juego.fase !== "pregunta") return { ok: false, error: "Los poderes se usan durante una pregunta." };
  const i = j.inventario.indexOf(poder as IdPoder);
  if (i < 0) return { ok: false, error: "No tienes ese poder." };
  const id = j.inventario[i];
  if (!PODERES[id].ataque && id !== "escudo" && juego.respuestas.has(j.id)) return { ok: false, error: "Ya respondiste esta pregunta." };
  if (efectos(juego, j).congeladoHasta > Date.now()) return { ok: false, error: "¡Estás congelado!" };
  const r = aplicarPoder(sala, emisor, j, id, typeof objetivoId === "string" ? objetivoId : null, { avisar: false });
  if (r.ok) {
    j.inventario.splice(i, 1);
    // Escudos y puntos cambian la lista de rivales de todos: se reenvía a cada jugador
    for (const x of sala.jugadores.values()) {
      const v = pantallaJugador(sala, x);
      if (v) emisor.jugador(sala, x, v);
    }
  }
  return r;
}

/** P2: el jugador decide qué hacer con el poder que acaba de ganar */
export function decidirPoderNuevo(sala: Sala, emisor: Emisor, j: Jugador, accion: unknown, objetivoId: unknown): ResultadoRespuesta {
  if (!j.poderNuevo) return { ok: false, error: "No tienes un poder nuevo." };
  const { poder } = j.poderNuevo;
  if (accion === "usar") {
    if (PODERES[poder].ataque) {
      if (typeof objetivoId !== "string" || !sala.jugadores.has(objetivoId) || objetivoId === j.id) return { ok: false, error: "Elige a un rival." };
    }
    j.armado = { poder, objetivoId: typeof objetivoId === "string" ? objetivoId : null };
  } else {
    if (j.inventario.length >= MAX_INVENTARIO) return { ok: false, error: "Tu inventario está lleno." };
    j.inventario.push(poder);
  }
  j.poderNuevo = null;
  emisor.jugador(sala, j, pantallaJugador(sala, j)!);
  return { ok: true };
}

export function cerrarPregunta(sala: Sala, emisor: Emisor) {
  const juego = sala.juego;
  if (!juego || juego.fase !== "pregunta") return;
  if (juego.temporizador) clearTimeout(juego.temporizador);
  juego.temporizador = null;
  const p = juego.preguntas[juego.indice];

  // Sumar puntos, actualizar rachas y (con poderes) repartir poderes
  for (const j of sala.jugadores.values()) {
    const r = juego.respuestas.get(j.id);
    if (r?.correcta) {
      j.racha += 1;
      j.aciertos += 1;
      j.puntos += r.puntos;
    } else {
      j.racha = 0;
    }
    j.historial.push({ indice: juego.indice, respuesta: r?.texto ?? "", correcta: !!r?.correcta, puntos: r?.puntos ?? 0, ms: r?.ms ?? null });
    // En la última pregunta ya no hay dónde usar un poder
    if (conPoderes(sala) && r && juego.indice < juego.preguntas.length - 1) {
      const duracion = juego.duracionMs + (juego.efectos.get(j.id)?.extraMs ?? 0);
      const motivo = motivoPoder(j, p, juego.preguntas.length, r.correcta, r.ms, duracion);
      if (motivo) j.poderNuevo = { poder: sortearPoder(), motivo };
    }
  }

  const respuestas = [...juego.respuestas.values()];
  const stats = estadisticas(p, respuestas);
  const correcta = respuestaCorrecta(p);
  const ultima = juego.indice === juego.preguntas.length - 1;
  juego.fase = "resultado";
  juego.pantallaAnfitrion = {
    fase: "resultado",
    indice: juego.indice,
    total: juego.preguntas.length,
    ultima,
    pregunta: { ...vistaAnfitrion(p), datos: p.datos },
    stats,
    respondieron: respuestas.length,
    jugadores: sala.jugadores.size,
  };

  const lista = ordenados(sala);
  lista.forEach((j, i) => {
    const r = juego.respuestas.get(j.id);
    const delante = i > 0 ? lista[i - 1] : null;
    juego.pantallaJugador.set(j.id, {
      fase: "resultado",
      indice: juego.indice,
      total: juego.preguntas.length,
      ultima,
      respondio: !!r,
      correcta: !!r?.correcta,
      ganados: r?.puntos ?? 0,
      puntos: j.puntos,
      racha: j.racha,
      dobles: p.puntosDobles || !!juego.efectos.get(j.id)?.doble,
      puesto: i + 1,
      delante: delante ? { apodo: delante.apodo, diferencia: delante.puntos - j.puntos } : null,
      respuestaCorrecta: correcta,
    });
  });
  emitirTodo(sala, emisor);
}

/** El anfitrión pulsa "Siguiente": resultado → ranking → siguiente pregunta (o podio al final) */
export async function siguiente(sala: Sala, emisor: Emisor) {
  const juego = sala.juego;
  if (!juego) return;
  if (juego.fase === "pregunta") return cerrarPregunta(sala, emisor);
  if (juego.fase === "resultado") {
    if (juego.indice === juego.preguntas.length - 1) return terminar(sala, emisor);
    juego.fase = "ranking";
    const antes = new Map(juego.rankingAntes.map((id, i) => [id, i]));
    const lista = ordenados(sala);
    const filas = lista.slice(0, 5).map((j, i) => ({
      id: j.id,
      apodo: j.apodo,
      color: j.color,
      puntos: j.puntos,
      racha: j.racha,
      cambio: antes.has(j.id) ? antes.get(j.id)! - i : 0,
    }));
    const subio = [...filas].sort((a, b) => b.cambio - a.cambio)[0];
    juego.pantallaAnfitrion = {
      fase: "ranking",
      indice: juego.indice,
      total: juego.preguntas.length,
      filas,
      destacado: subio && subio.cambio >= 2 ? { apodo: subio.apodo, puestos: subio.cambio } : null,
    };
    // Los jugadores se quedan en su pantalla de resultado
    emisor.anfitrion(sala, juego.pantallaAnfitrion);
    return;
  }
  if (juego.fase === "ranking") lanzarPregunta(sala, emisor, juego.indice + 1);
}

async function terminar(sala: Sala, emisor: Emisor) {
  const juego = sala.juego!;
  juego.fase = "podio";
  const lista = ordenados(sala);
  juego.pantallaAnfitrion = {
    fase: "podio",
    partidaId: sala.partidaId,
    titulo: sala.titulo,
    quizId: sala.quizId,
    pin: sala.pin,
    jugadores: lista.length,
    total: juego.preguntas.length,
    podio: lista.slice(0, 3).map((j, i) => ({ puesto: i + 1, apodo: j.apodo, color: j.color, puntos: j.puntos })),
  };
  lista.forEach((j, i) =>
    juego.pantallaJugador.set(j.id, {
      fase: "podio",
      puesto: i + 1,
      jugadores: lista.length,
      puntos: j.puntos,
      aciertos: j.aciertos,
      total: juego.preguntas.length,
    }),
  );
  sala.estado = "terminada";
  emitirTodo(sala, emisor);
  await guardarResultados(sala);
}

async function guardarResultados(sala: Sala) {
  const juego = sala.juego!;
  if (juego.guardado) return;
  juego.guardado = true;
  const lista = ordenados(sala);
  await prisma.$transaction([
    prisma.participante.deleteMany({ where: { partidaId: sala.partidaId } }),
    ...lista.map((j, i) =>
      prisma.participante.create({
        data: {
          partidaId: sala.partidaId,
          apodo: j.apodo,
          puntos: j.puntos,
          puesto: i + 1,
          aciertos: j.aciertos,
          respuestas: {
            create: j.historial.map((h) => ({
              pregunta: h.indice,
              enunciado: juego.preguntas[h.indice].enunciado,
              respuesta: h.respuesta,
              correcta: h.correcta,
              puntos: h.puntos,
              ms: h.ms,
            })),
          },
        },
      }),
    ),
    prisma.partida.update({ where: { id: sala.partidaId }, data: { estado: "terminada", terminadaEn: new Date() } }),
  ]);
}

/** Si un jugador se desconecta a media pregunta y era el último pendiente, cerrar */
export function revisarCierre(sala: Sala, emisor: Emisor) {
  const juego = sala.juego;
  if (!juego || juego.fase !== "pregunta" || juego.respuestas.size === 0) return;
  const pendientes = [...sala.jugadores.values()].filter((x) => x.conectado && !juego.respuestas.has(x.id));
  if (pendientes.length === 0) cerrarPregunta(sala, emisor);
  else emisor.respuestas(sala, juego.respuestas.size, conectados(sala));
}

export type { Juego };
