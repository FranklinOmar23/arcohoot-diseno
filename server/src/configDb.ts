// Arma la URL de MySQL que usa Prisma a partir de las variables de entorno.
//
// Dos formas de configurarla:
//  1. URL completa:  DATABASE_URL="mysql://usuario:clave@127.0.0.1:3306/base"
//  2. Por partes (como en el panel de Hostinger):
//       DATABASE_URL = host (en Hostinger: 127.0.0.1)
//       USUARIODB    = usuario (con prefijo, p. ej. u810873479_arcohoot)
//       CLAVEDB      = contraseña (puede tener símbolos: aquí se codifica)
//       NOMBREDB     = nombre de la base (opcional: si falta, se usa el del usuario)
//       PUERTODB     = puerto (opcional, 3306)
//
// Sin dependencias para poder usarlo también desde scripts de Node (prisma migrate).

export function urlBaseDatos(env: NodeJS.ProcessEnv = process.env): string {
  const valor = (env.DATABASE_URL ?? "").trim();
  if (/^mysql:\/\//i.test(valor)) return valor;

  const host = valor || (env.DB_HOST ?? "").trim();
  const usuario = (env.USUARIODB ?? env.DB_USER ?? "").trim();
  const clave = env.CLAVEDB ?? env.DB_PASSWORD ?? "";
  const nombre = (env.NOMBREDB ?? env.DB_NAME ?? usuario).trim();
  const puerto = (env.PUERTODB ?? env.DB_PORT ?? "3306").trim();

  const faltan = [!host && "DATABASE_URL (host)", !usuario && "USUARIODB", !nombre && "NOMBREDB"].filter(Boolean);
  if (faltan.length) {
    throw new Error(`Falta configurar la base de datos: ${faltan.join(", ")}. Revisa las variables de entorno.`);
  }
  if (host === "localhost") {
    console.warn("[db] Usa 127.0.0.1 en vez de localhost: en Node 18+ «localhost» puede fallar con «Access denied … '::1'».");
  }
  return `mysql://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${host}:${puerto}/${encodeURIComponent(nombre)}`;
}

/** Deja DATABASE_URL lista para Prisma (se llama antes de crear el cliente) */
export function prepararUrlBaseDatos() {
  process.env.DATABASE_URL = urlBaseDatos();
}
