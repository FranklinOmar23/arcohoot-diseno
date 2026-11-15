import { ErrorApi } from "./api";

export const TIPOS_IMAGEN = "image/png,image/jpeg,image/webp,image/gif";
const MAX_MB = 4;

/** Sube una imagen y devuelve su URL pública (/api/subidas/…) */
export async function subirImagen(archivo: File): Promise<string> {
  if (!TIPOS_IMAGEN.split(",").includes(archivo.type)) throw new ErrorApi("Sube una imagen PNG, JPG, WEBP o GIF.", 400);
  if (archivo.size > MAX_MB * 1024 * 1024) throw new ErrorApi(`La imagen pesa más de ${MAX_MB} MB.`, 400);
  const res = await fetch("/api/subidas", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": archivo.type, "X-Nombre-Archivo": encodeURIComponent(archivo.name) },
    body: archivo,
  }).catch(() => {
    throw new ErrorApi("No hay conexión con el servidor.", 0);
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(datos.error ?? "No pudimos subir la imagen.", res.status);
  return datos.url as string;
}

/** "piso-mojado-3f9a1c2b4d5e.png" → "piso-mojado.png" */
export function nombreImagen(url: string) {
  const archivo = url.split("/").pop() ?? "";
  return archivo.replace(/-[0-9a-f]{12}(\.\w+)$/, "$1");
}
