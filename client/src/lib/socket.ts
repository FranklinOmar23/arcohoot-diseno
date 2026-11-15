import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Conexión única al servidor de juego (mismo origen; Vite la reenvía en desarrollo).
 * Empieza por HTTP (polling) y sube a WebSocket si el servidor lo permite: así funciona
 * también en hostings que bloquean WebSockets entrantes.
 */
export function obtenerSocket(): Socket {
  if (!socket) socket = io({ withCredentials: true, transports: ["polling", "websocket"] });
  return socket;
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
