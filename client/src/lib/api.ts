export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public estado: number,
  ) {
    super(mensaje);
  }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; signal?: AbortSignal } = {}) {
  let res: Response;
  try {
    res = await fetch(`/api${ruta}`, {
      method: opciones.metodo ?? "GET",
      credentials: "same-origin",
      headers: opciones.cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
      signal: opciones.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ErrorApi("No hay conexión con el servidor. Revisa tu internet.", 0);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(datos.error ?? "Algo salió mal. Inténtalo otra vez.", res.status);
  return datos as T;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
}

export interface ResumenQuiz {
  id: string;
  titulo: string;
  portada: number;
  favorito: boolean;
  vecesJugado: number;
  actualizadoEn: string;
  numPreguntas: number;
}
