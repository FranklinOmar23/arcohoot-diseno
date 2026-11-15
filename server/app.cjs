// Archivo de entrada para Hostinger (LiteSpeed / Passenger).
// Esos servidores cargan la app con require(), y en Node 20 require() no puede cargar
// módulos ES (el servidor compilado en dist/ lo es) → error ERR_REQUIRE_ESM y "503".
// Este archivo es CommonJS y carga el servidor con import(), que funciona en todas las versiones.
import("./dist/index.js").catch((error) => {
  console.error("[arranque] No se pudo iniciar ArcoHoot:", error);
  process.exit(1);
});
