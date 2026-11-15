import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { requiereSesion } from "./auth.js";
import { esquemaPregunta, estaCompleta } from "./preguntas.js";
import { cerrarSala } from "./juego/salas.js";

export const rutasPartidas = Router();
rutasPartidas.use(requiereSesion);

/** PIN de 6 cifras que no esté en uso por otra partida abierta */
async function nuevoPin() {
  for (let i = 0; i < 20; i++) {
    const pin = String(crypto.randomInt(100000, 1000000));
    const ocupado = await prisma.partida.findUnique({ where: { pin }, select: { estado: true } });
    if (!ocupado) return pin;
    if (ocupado.estado === "terminada") {
      // Libera el PIN de partidas viejas
      await prisma.partida.update({ where: { pin }, data: { pin: `${pin}-${Date.now()}` } });
      return pin;
    }
  }
  throw new Error("No se pudo generar un PIN libre");
}

const esquemaNueva = z.object({
  quizId: z.string().min(1),
  modo: z.enum(["clasico", "poderes"]),
  apodosVisibles: z.boolean().default(true),
});

rutasPartidas.post("/", async (req, res) => {
  const datos = esquemaNueva.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: "Elige un modo de juego." });
    return;
  }
  const anfitrionId = req.usuario!.id;
  const quiz = await prisma.quiz.findFirst({
    where: { id: datos.data.quizId, autorId: anfitrionId },
    include: { preguntas: true },
  });
  if (!quiz) {
    res.status(404).json({ error: "No encontramos ese quiz." });
    return;
  }
  const incompletas = quiz.preguntas.filter((p) => {
    const r = esquemaPregunta.safeParse({ ...p, datos: JSON.parse(p.datos) });
    return !r.success || !estaCompleta(r.data);
  });
  if (quiz.preguntas.length === 0) {
    res.status(400).json({ error: "Tu quiz aún no tiene preguntas." });
    return;
  }
  if (incompletas.length > 0) {
    res.status(400).json({ error: `Hay ${incompletas.length} pregunta(s) sin terminar. Complétalas en el editor.` });
    return;
  }

  // Cierra las salas que este anfitrión dejó abiertas
  const abiertas = await prisma.partida.findMany({
    where: { anfitrionId, estado: { not: "terminada" } },
    select: { pin: true },
  });
  abiertas.forEach((p) => cerrarSala(p.pin));
  await prisma.partida.updateMany({
    where: { anfitrionId, estado: { not: "terminada" } },
    data: { estado: "terminada", terminadaEn: new Date() },
  });

  const partida = await prisma.partida.create({
    data: { pin: await nuevoPin(), quizId: quiz.id, anfitrionId, modo: datos.data.modo, apodosVisibles: datos.data.apodosVisibles },
  });
  await prisma.quiz.update({ where: { id: quiz.id }, data: { vecesJugado: { increment: 1 } } });
  res.status(201).json({ partida: { pin: partida.pin, modo: partida.modo } });
});

rutasPartidas.get("/:pin", async (req, res) => {
  const partida = await prisma.partida.findFirst({
    where: { pin: req.params.pin, anfitrionId: req.usuario!.id },
    include: { quiz: { select: { id: true, titulo: true, _count: { select: { preguntas: true } } } } },
  });
  if (!partida) {
    res.status(404).json({ error: "No encontramos esa partida." });
    return;
  }
  res.json({
    partida: {
      pin: partida.pin,
      modo: partida.modo,
      estado: partida.estado,
      apodosVisibles: partida.apodosVisibles,
      quiz: { id: partida.quiz.id, titulo: partida.quiz.titulo, numPreguntas: partida.quiz._count.preguntas },
    },
  });
});
