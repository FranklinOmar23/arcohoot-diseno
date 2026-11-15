import { PrismaClient } from "@prisma/client";
import { prepararUrlBaseDatos } from "./configDb.js";

// Admite DATABASE_URL completa o por partes (USUARIODB, CLAVEDB…): ver configDb.ts.
// Si falta algo, la app arranca igual y /api/salud explica qué pasa (en vez de caerse con un 503 mudo).
export let errorConfigDb: string | null = null;
try {
  prepararUrlBaseDatos();
} catch (e) {
  errorConfigDb = (e as Error).message;
  console.error("[db]", errorConfigDb);
}

export const prisma = new PrismaClient();

/** Comprueba la conexión a MySQL (para /api/salud) */
export async function estadoBaseDatos(): Promise<string> {
  if (errorConfigDb) return errorConfigDb;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo de espera agotado (8 s)")), 8000)),
    ]);
    return "ok";
  } catch (e) {
    // Prisma pone el motivo real en la última línea (no incluye la contraseña)
    const lineas = (e as Error).message.split("\n").map((l) => l.trim()).filter(Boolean);
    return `error: ${lineas[lineas.length - 1] ?? "desconocido"}`;
  }
}
