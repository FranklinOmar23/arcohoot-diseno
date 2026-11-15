import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Conexión única al servidor de juego (mismo origen; Vite la reenvía en desarrollo).
 * Empieza por HTTP (polling) y sube a WebSocket si el servidor lo permite: así funciona
 * también en hostings que bloquean WebSockets entrantes.
 */
export function obtenerSocket(): Socket {
  if (!socket) {
    socket = io({ withCredentials: true, transports: ["polling", "websocket"] });
    socket.on("connect", () => void sincronizarReloj());
  }
  return socket;
}

// ── Reloj del servidor ──────────────────────────────────────
// desfase = hora del servidor − hora de este equipo. Con él la cuenta atrás se calcula contra la
// hora real de cierre, no contra el momento (a veces tardío) en que llegó el aviso.
let desfase: number | null = null;

export const desfaseReloj = () => desfase;

async function sincronizarReloj() {
  const muestras: { rtt: number; desfase: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const r = await pedir<{ ahora?: number }>("reloj", {}, 4000).catch(() => null);
    const t1 = Date.now();
    if (r && typeof r.ahora === "number") muestras.push({ rtt: t1 - t0, desfase: r.ahora - (t0 + t1) / 2 });
  }
  // La muestra con menos ida y vuelta es la más precisa
  if (muestras.length) desfase = muestras.sort((a, b) => a.rtt - b.rtt)[0].desfase;
}

/** emit con respuesta como promesa; falla si el servidor no responde en `ms` */
export function pedir<T = Record<string, unknown>>(evento: string, datos: unknown = {}, ms = 8000): Promise<T> {
  return new Promise((resolver, rechazar) => {
    obtenerSocket()
      .timeout(ms)
      .emit(evento, datos, (err: Error | null, respuesta: T) => {
        if (err) rechazar(new Error("El servidor no responde. Revisa tu conexión."));
        else resolver(respuesta);
      });
  });
}

export interface JugadorPublico {
  id: string;
  apodo: string;
  color: ColorAvatar;
  conectado: boolean;
}

export type ColorAvatar = "sol" | "arco" | "laguna" | "anil" | "hielo" | "exito" | "epico" | "niebla";

export interface EstadoSala {
  pin: string;
  titulo: string;
  numPreguntas: number;
  modo: "clasico" | "poderes";
  apodosVisibles: boolean;
  bloqueada: boolean;
  estado: "sala" | "jugando" | "terminada";
  jugadores: JugadorPublico[];
}
