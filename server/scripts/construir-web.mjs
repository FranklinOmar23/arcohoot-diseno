// Compila la web (../client) y la copia a server/public.
// Así la carpeta server/ queda autosuficiente: en Hostinger (directorio raíz = server)
// solo se publica esta carpeta, y el servidor entrega la web desde public/.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const servidor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliente = path.resolve(servidor, "../client");
const destino = path.join(servidor, "public");

if (!fs.existsSync(path.join(cliente, "package.json"))) {
  console.log("[web] No hay ../client: se publica solo la API.");
  process.exit(0);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const ejecutar = (args) => {
  console.log(`[web] npm ${args.join(" ")}`);
  const r = spawnSync(npm, args, { cwd: cliente, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// Las herramientas de build de la web están en "dependencies", así se instalan aunque NODE_ENV=production
ejecutar(fs.existsSync(path.join(cliente, "package-lock.json")) ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"]);
ejecutar(["run", "build"]);

fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(path.join(cliente, "dist"), destino, { recursive: true });
console.log(`[web] Copiada a ${path.relative(process.cwd(), destino) || "public"}`);
