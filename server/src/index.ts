import "dotenv/config";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { cargarUsuario, rutasAuth } from "./auth.js";
import { rutasQuizzes } from "./quizzes.js";
import { rutasPartidas } from "./partidas.js";
import { rutasSubidas } from "./subidas.js";
import { rutasExcel } from "./excel.js";
import { crearServidorJuego } from "./juego/sockets.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cargarUsuario);

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true });
});

// En desarrollo: IPs de la red local, para que el QR funcione desde un celular en la misma Wi-Fi
app.get("/api/red", (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.json({ ips: [] });
    return;
  }
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  res.json({ ips });
});

app.use("/api/auth", rutasAuth);
app.use("/api/quizzes", rutasQuizzes);
app.use("/api/partidas", rutasExcel);
app.use("/api/partidas", rutasPartidas);
app.use("/api/subidas", rutasSubidas);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// En producción, el mismo servidor entrega el frontend compilado
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Algo salió mal. Inténtalo otra vez." });
});

// Red de seguridad: una promesa rechazada que se escape no debe apagar el servidor en plena partida
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));

const http = createServer(app);
crearServidorJuego(http);

const PORT = Number(process.env.PORT ?? 3001);
http.listen(PORT, () => console.log(`ArcoHoot API en http://localhost:${PORT}`));
