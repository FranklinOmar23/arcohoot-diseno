import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { requiereSesion } from "./auth.js";
import { esquemaPregunta } from "./preguntas.js";

export const rutasQuizzes = Router();
rutasQuizzes.use(requiereSesion);

const NUM_PORTADAS = 6;
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

const esquemaLista = z.object({
  filtro: z.enum(["todos", "recientes", "favoritos", "compartidos"]).default("todos"),
  orden: z.enum(["recientes", "alfabetico", "jugados"]).default("recientes"),
  q: z.string().trim().max(100).optional(),
});

const seleccion = {
  id: true,
  titulo: true,
  portada: true,
  favorito: true,
  vecesJugado: true,
  actualizadoEn: true,
  _count: { select: { preguntas: true } },
} satisfies Prisma.QuizSelect;

type FilaQuiz = Prisma.QuizGetPayload<{ select: typeof seleccion }>;
const aJson = ({ _count, ...q }: FilaQuiz) => ({ ...q, numPreguntas: _count.preguntas });

rutasQuizzes.get("/", async (req, res) => {
  const p = esquemaLista.safeParse(req.query);
  if (!p.success) {
    res.status(400).json({ error: "Filtro no válido." });
    return;
  }
  const { filtro, orden, q } = p.data;
  const autorId = req.usuario!.id;
  const total = await prisma.quiz.count({ where: { autorId } });

  // Compartir quizzes aún no existe: la lista va vacía.
  if (filtro === "compartidos") {
    res.json({ total, quizzes: [] });
    return;
  }

  const where: Prisma.QuizWhereInput = { autorId };
  if (filtro === "favoritos") where.favorito = true;
  if (filtro === "recientes") where.actualizadoEn = { gte: new Date(Date.now() - SIETE_DIAS) };
  if (q) where.titulo = { contains: q };

  const orderBy: Prisma.QuizOrderByWithRelationInput =
    orden === "alfabetico"
      ? { titulo: "asc" }
      : orden === "jugados"
        ? { vecesJugado: "desc" }
        : { actualizadoEn: "desc" };

  const filas = await prisma.quiz.findMany({ where, orderBy, select: seleccion });
  res.json({ total, quizzes: filas.map(aJson) });
});

rutasQuizzes.post("/", async (req, res) => {
  const titulo = z.string().trim().min(1).max(120).safeParse(req.body?.titulo);
  const autorId = req.usuario!.id;
  const cuantos = await prisma.quiz.count({ where: { autorId } });
  const quiz = await prisma.quiz.create({
    data: {
      titulo: titulo.success ? titulo.data : "Quiz sin título",
      portada: cuantos % NUM_PORTADAS,
      autorId,
    },
    select: seleccion,
  });
  res.status(201).json({ quiz: aJson(quiz) });
});

async function quizCompleto(id: string, autorId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id, autorId },
    include: { preguntas: { orderBy: { orden: "asc" } } },
  });
  if (!quiz) return null;
  return {
    ...quiz,
    preguntas: quiz.preguntas.map(({ datos, quizId: _q, ...p }) => ({ ...p, datos: JSON.parse(datos) as unknown })),
  };
}

rutasQuizzes.get("/:id", async (req, res) => {
  const quiz = await quizCompleto(req.params.id, req.usuario!.id);
  if (!quiz) {
    res.status(404).json({ error: "No encontramos ese quiz." });
    return;
  }
  res.json({ quiz });
});

// Guardado completo desde el editor: título + todas las preguntas en orden
const esquemaGuardado = z.object({
  titulo: z.string().trim().max(120),
  preguntas: z.array(esquemaPregunta).max(100),
});

rutasQuizzes.put("/:id", async (req, res) => {
  const datos = esquemaGuardado.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: "No pudimos guardar: hay datos no válidos." });
    return;
  }
  const autorId = req.usuario!.id;
  const existe = await prisma.quiz.findFirst({ where: { id: req.params.id, autorId }, select: { id: true } });
  if (!existe) {
    res.status(404).json({ error: "No encontramos ese quiz." });
    return;
  }
  const { titulo, preguntas } = datos.data;
  const [, , quiz] = await prisma.$transaction([
    prisma.pregunta.deleteMany({ where: { quizId: existe.id } }),
    prisma.pregunta.createMany({
      data: preguntas.map((p, orden) => ({
        quizId: existe.id,
        orden,
        tipo: p.tipo,
        enunciado: p.enunciado,
        tiempo: p.tiempo,
        puntosDobles: p.puntosDobles,
        imagen: p.imagen,
        datos: JSON.stringify(p.datos),
      })),
    }),
    prisma.quiz.update({
      where: { id: existe.id },
      data: { titulo: titulo || "Quiz sin título" },
      select: { actualizadoEn: true },
    }),
  ]);
  res.json({ actualizadoEn: quiz.actualizadoEn });
});

const esquemaCambio = z.object({
  titulo: z.string().trim().min(1).max(120).optional(),
  descripcion: z.string().trim().max(500).nullable().optional(),
  favorito: z.boolean().optional(),
});

rutasQuizzes.patch("/:id", async (req, res) => {
  const datos = esquemaCambio.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: "Datos no válidos." });
    return;
  }
  const r = await prisma.quiz.updateMany({
    where: { id: req.params.id, autorId: req.usuario!.id },
    data: datos.data,
  });
  if (r.count === 0) {
    res.status(404).json({ error: "No encontramos ese quiz." });
    return;
  }
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: req.params.id }, select: seleccion });
  res.json({ quiz: aJson(quiz) });
});

rutasQuizzes.delete("/:id", async (req, res) => {
  const r = await prisma.quiz.deleteMany({ where: { id: req.params.id, autorId: req.usuario!.id } });
  if (r.count === 0) {
    res.status(404).json({ error: "No encontramos ese quiz." });
    return;
  }
  res.json({ ok: true });
});
