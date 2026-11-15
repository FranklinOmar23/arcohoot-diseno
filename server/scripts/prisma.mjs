// Ejecuta la CLI de Prisma con DATABASE_URL armada desde las variables por partes.
// Uso: node scripts/prisma.mjs migrate deploy
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

// Misma lógica que src/configDb.ts (aquí en JS para no depender del build)
function urlBaseDatos(env) {
  const valor = (env.DATABASE_URL ?? "").trim();
  if (/^mysql:\/\//i.test(valor)) return valor;
  const host = valor || (env.DB_HOST ?? "").trim();
  const usuario = (env.USUARIODB ?? env.DB_USER ?? "").trim();
  const clave = env.CLAVEDB ?? env.DB_PASSWORD ?? "";
  const nombre = (env.NOMBREDB ?? env.DB_NAME ?? usuario).trim();
  const puerto = (env.PUERTODB ?? env.DB_PORT ?? "3306").trim();
  if (!host || !usuario || !nombre) {
    console.error("Falta configurar la base de datos (DATABASE_URL o DATABASE_URL + USUARIODB + CLAVEDB).");
    process.exit(1);
  }
  return `mysql://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${host}:${puerto}/${encodeURIComponent(nombre)}`;
}

const require = createRequire(import.meta.url);
const cli = require.resolve("prisma/build/index.js");
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: urlBaseDatos(process.env) },
});
process.exit(r.status ?? 1);
