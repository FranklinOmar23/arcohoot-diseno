import crypto from "node:crypto";
import express, { Router } from "express";
import { prisma } from "./db.js";
import { requiereSesion } from "./auth.js";

// Las imágenes se guardan en MySQL (tabla Imagen): en Hostinger Business los archivos
// de la carpeta de la app se borran en cada despliegue.

// Subidas: solo imágenes rasterizadas (un SVG subido podría llevar scripts)
const TIPOS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 4 * 1024 * 1024;

export const rutasSubidas = Router();

// Archivos públicos (las imágenes también las ven los jugadores, sin cuenta)
rutasSubidas.get("/:nombre", async (req, res) => {
  const nombre = req.params.nombre;
  if (!/^[\w.-]{1,120}$/.test(nombre)) {
    res.status(404).end();
    return;
  }
  const img = await prisma.imagen.findUnique({ where: { nombre } });
  if (!img) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", img.tipo);
  res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.end(Buffer.from(img.datos));
});

// Sube una imagen como binario: POST /api/subidas con Content-Type image/*
rutasSubidas.post(
  "/",
  requiereSesion,
  express.raw({ type: Object.keys(TIPOS), limit: MAX_BYTES }),
  async (req, res) => {
    const tipo = req.get("content-type") ?? "";
    const ext = TIPOS[tipo];
    if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Sube una imagen PNG, JPG, WEBP o GIF." });
      return;
    }
    // Conserva el nombre original (limpio) para mostrarlo en el editor: piso-mojado-3f9a1c2b4d5e.png
    let original = "";
    try {
      original = decodeURIComponent(req.get("x-nombre-archivo") ?? "");
    } catch {
      original = "";
    }
    const base =
      original
        .replace(/\.[^.]*$/, "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "imagen";
    const nombre = `${base}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    await prisma.imagen.create({ data: { nombre, tipo, datos: req.body, autorId: req.usuario!.id } });
    res.status(201).json({ url: `/api/subidas/${nombre}` });
  },
);
