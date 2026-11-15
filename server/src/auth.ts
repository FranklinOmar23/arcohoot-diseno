import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "./db.js";

export interface UsuarioPublico {
  id: string;
  nombre: string;
  correo: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioPublico;
      sesionId?: string;
    }
  }
}

const COOKIE = "ah_sesion";
const DURACION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const publico = (u: { id: string; nombre: string; correo: string }): UsuarioPublico => ({
  id: u.id,
  nombre: u.nombre,
  correo: u.correo,
});

async function crearSesion(req: Request, res: Response, usuarioId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiraEn = new Date(Date.now() + DURACION_MS);
  await prisma.sesion.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expiraEn,
      agente: req.get("user-agent")?.slice(0, 255),
    },
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiraEn,
    path: "/",
  });
}

/** Para Socket.IO: lee la cabecera Cookie cruda y devuelve el usuario si la sesión es válida */
export async function usuarioDesdeCookie(cabecera: string | undefined): Promise<UsuarioPublico | null> {
  if (!cabecera) return null;
  const par = cabecera.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!par) return null;
  const token = decodeURIComponent(par.slice(COOKIE.length + 1));
  const sesion = await prisma.sesion.findUnique({ where: { tokenHash: hashToken(token) }, include: { usuario: true } });
  if (!sesion || sesion.expiraEn < new Date()) return null;
  return publico(sesion.usuario);
}

/** Lee la cookie y, si la sesión es válida, deja el usuario en req.usuario. */
export async function cargarUsuario(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[COOKIE];
  if (!token) return next();
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: true },
  });
  if (!sesion || sesion.expiraEn < new Date()) {
    if (sesion) await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
    res.clearCookie(COOKIE, { path: "/" });
    return next();
  }
  req.usuario = publico(sesion.usuario);
  req.sesionId = sesion.id;
  // Registra el último uso como mucho una vez por hora
  if (Date.now() - sesion.ultimoUso.getTime() > 60 * 60 * 1000) {
    prisma.sesion.update({ where: { id: sesion.id }, data: { ultimoUso: new Date() } }).catch(() => {});
  }
  next();
}

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario) {
    res.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }
  next();
}

// Límite sencillo de intentos por IP para entrar/registrarse
const intentos = new Map<string, { n: number; hasta: number }>();
function limitarIntentos(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "desconocida";
  const ahora = Date.now();
  const r = intentos.get(ip);
  if (!r || r.hasta < ahora) {
    intentos.set(ip, { n: 1, hasta: ahora + 15 * 60 * 1000 });
    return next();
  }
  r.n += 1;
  if (r.n > 20) {
    res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." });
    return;
  }
  next();
}

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, "Tu nombre debe tener al menos 2 letras.").max(60),
  correo: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  clave: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
});
const esquemaEntrar = z.object({
  correo: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  clave: z.string().min(1, "Escribe tu contraseña."),
});

const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Revisa los datos.";

export const rutasAuth = Router();

rutasAuth.post("/registro", limitarIntentos, async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: primerError(datos.error) });
    return;
  }
  const { nombre, correo, clave } = datos.data;
  const existe = await prisma.usuario.findUnique({ where: { correo } });
  if (existe) {
    res.status(409).json({ error: "Ese correo ya tiene una cuenta. ¡Entra con él!" });
    return;
  }
  const usuario = await prisma.usuario.create({
    data: { nombre, correo, claveHash: await bcrypt.hash(clave, 12) },
  });
  await crearSesion(req, res, usuario.id);
  res.status(201).json({ usuario: publico(usuario) });
});

rutasAuth.post("/entrar", limitarIntentos, async (req, res) => {
  const datos = esquemaEntrar.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: primerError(datos.error) });
    return;
  }
  const { correo, clave } = datos.data;
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (usuario && !usuario.claveHash) {
    res.status(401).json({ error: "Esta cuenta se creó con Google. Usa «Continuar con Google»." });
    return;
  }
  const ok = usuario?.claveHash ? await bcrypt.compare(clave, usuario.claveHash) : false;
  if (!usuario || !ok) {
    res.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  await crearSesion(req, res, usuario.id);
  res.json({ usuario: publico(usuario) });
});

// ── Google ──────────────────────────────────────────────
// El navegador recibe un ID token de Google Identity Services; aquí se verifica la firma,
// el destinatario (nuestro Client ID) y que el correo esté verificado.
const googleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim() || "";
let clienteGoogle: OAuth2Client | null = null;

rutasAuth.get("/config", (_req, res) => {
  res.json({ googleClientId: googleClientId() || null });
});

rutasAuth.post("/google", limitarIntentos, async (req, res) => {
  const clientId = googleClientId();
  if (!clientId) {
    res.status(503).json({ error: "El inicio con Google no está configurado." });
    return;
  }
  const credencial = typeof req.body?.credencial === "string" ? req.body.credencial : "";
  if (!credencial) {
    res.status(400).json({ error: "Falta la credencial de Google." });
    return;
  }
  clienteGoogle ??= new OAuth2Client(clientId);
  let datos;
  try {
    const ticket = await clienteGoogle.verifyIdToken({ idToken: credencial, audience: clientId });
    datos = ticket.getPayload();
  } catch {
    res.status(401).json({ error: "Google no pudo confirmar tu cuenta. Inténtalo otra vez." });
    return;
  }
  if (!datos?.sub || !datos.email || !datos.email_verified) {
    res.status(401).json({ error: "Tu cuenta de Google no tiene un correo verificado." });
    return;
  }
  const correo = datos.email.toLowerCase();
  const nombre = (datos.name || datos.given_name || correo.split("@")[0]).slice(0, 60);

  // 1) Ya entró antes con Google  2) Tiene cuenta con ese correo: se vincula  3) Cuenta nueva
  let usuario = await prisma.usuario.findUnique({ where: { googleId: datos.sub } });
  if (!usuario) {
    const porCorreo = await prisma.usuario.findUnique({ where: { correo } });
    usuario = porCorreo
      ? await prisma.usuario.update({ where: { id: porCorreo.id }, data: { googleId: datos.sub, foto: porCorreo.foto ?? datos.picture ?? null } })
      : await prisma.usuario.create({ data: { nombre, correo, googleId: datos.sub, foto: datos.picture ?? null } });
  }
  await crearSesion(req, res, usuario.id);
  res.json({ usuario: publico(usuario) });
});

rutasAuth.post("/salir", async (req, res) => {
  if (req.sesionId) await prisma.sesion.delete({ where: { id: req.sesionId } }).catch(() => {});
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

rutasAuth.get("/yo", (req, res) => {
  res.json({ usuario: req.usuario ?? null });
});
