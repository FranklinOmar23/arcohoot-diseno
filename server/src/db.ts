import { PrismaClient } from "@prisma/client";
import { prepararUrlBaseDatos } from "./configDb.js";

// Admite DATABASE_URL completa o por partes (USUARIODB, CLAVEDB…): ver configDb.ts
prepararUrlBaseDatos();

export const prisma = new PrismaClient();
