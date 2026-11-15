import { z } from "zod";

// Esquemas de los datos de cada tipo de pregunta. Se guardan como JSON en Pregunta.datos.
// El editor guarda borradores, así que aquí solo se valida la forma, no que esté completa.

const texto = (max: number) => z.string().max(max);

export const esquemaDatos = {
  quiz: z.object({
    opciones: z.array(z.object({ texto: texto(90), correcta: z.boolean() })).min(2).max(4),
  }),
  verdadero_falso: z.object({ correcta: z.boolean() }),
  respuesta_corta: z.object({ respuestas: z.array(texto(20)).min(1).max(4) }),
  deslizante: z.object({
    min: z.number(),
    max: z.number(),
    paso: z.number().positive(),
    correcta: z.number(),
    margen: z.number().min(0),
    unidad: texto(12),
  }),
  pin: z.object({
    // Zona correcta en % del ancho/alto de la imagen; r en % del ancho
    // a = alto / ancho de la imagen, para medir distancias en la misma escala
    zona: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      r: z.number().min(2).max(40),
      a: z.number().positive().max(10).optional(),
    }),
  }),
  puzzle: z.object({ elementos: z.array(texto(60)).min(2).max(4) }),
} as const;

export type TipoPregunta = keyof typeof esquemaDatos;
export const TIPOS = Object.keys(esquemaDatos) as [TipoPregunta, ...TipoPregunta[]];

export const esquemaPregunta = z
  .object({
    tipo: z.enum(TIPOS),
    enunciado: texto(160),
    tiempo: z.number().int().min(5).max(240),
    puntosDobles: z.boolean(),
    imagen: z
      .string()
      .regex(/^\/api\/subidas\/[\w.-]+$/)
      .nullable(),
    datos: z.unknown(),
  })
  .superRefine((p, ctx) => {
    const r = esquemaDatos[p.tipo].safeParse(p.datos);
    if (!r.success) ctx.addIssue({ code: "custom", message: `Datos no válidos para ${p.tipo}`, path: ["datos"] });
  });

export type PreguntaEntrada = z.infer<typeof esquemaPregunta>;

/** ¿La pregunta está lista para jugarse? (misma regla que el editor) */
export function estaCompleta(p: PreguntaEntrada): boolean {
  if (!p.enunciado.trim()) return false;
  switch (p.tipo) {
    case "quiz": {
      const d = esquemaDatos.quiz.parse(p.datos);
      return d.opciones.every((o) => o.texto.trim()) && d.opciones.some((o) => o.correcta);
    }
    case "verdadero_falso":
      return true;
    case "respuesta_corta":
      return esquemaDatos.respuesta_corta.parse(p.datos).respuestas.some((r) => r.trim());
    case "deslizante": {
      const d = esquemaDatos.deslizante.parse(p.datos);
      return d.min < d.max && d.correcta >= d.min && d.correcta <= d.max;
    }
    case "pin":
      return p.imagen !== null;
    case "puzzle":
      return esquemaDatos.puzzle.parse(p.datos).elementos.every((e) => e.trim());
  }
}
