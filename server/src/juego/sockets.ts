import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { prisma } from "../db.js";
import { usuarioDesdeCookie } from "../auth.js";
import {
  agregarJugador,
  cerrarSala,
  jugadorPorToken,
  jugadorPublico,
  limpiarApodo,
  obtenerSala,
  resumenSala,
  todasLasSalas,
  type ErrorEntrada,
  type Sala,
} from "./salas.js";
import {
  decidirPoderNuevo,
  empezarJuego,
  pantallaAnfitrion,
  pantallaJugador,
  responder,
  revisarCierre,
  siguiente,
  usarPoder,
  type Emisor,
} from "./motor.js";
import { esIdPoder } from "./poderes.js";

// Nombres de salas de Socket.IO
const cuartoAnfitrion = (pin: string) => `${pin}:anfitrion`;
const cuartoJugadores = (pin: string) => `${pin}:jugadores`;

type Ack = (respuesta: Record<string, unknown>) => void;
const ackSeguro = (ack: unknown): Ack => (typeof ack === "function" ? (ack as Ack) : () => {});

const MENSAJES: Record<ErrorEntrada | "no-existe", string> = {
  "no-existe": "No encontramos una partida con ese PIN. Revísalo en la pantalla grande.",
  "apodo-vacio": "Escribe un apodo para entrar.",
  "apodo-usado": "Alguien ya usa ese apodo. Prueba con otro.",
  "sala-bloqueada": "El anfitrión cerró la sala. Pídele que la abra.",
  "sala-llena": "La sala está llena.",
  "ya-empezo": "La partida ya empezó.",
};

const pinValido = (pin: unknown): pin is string => typeof pin === "string" && /^\d{6}$/.test(pin);

export function crearServidorJuego(http: HttpServer) {
  const io = new Server(http, { serveClient: false });

  // El anfitrión se identifica con la cookie de sesión; los jugadores entran sin cuenta
  io.use(async (socket, next) => {
    try {
      socket.data.usuario = await usuarioDesdeCookie(socket.handshake.headers.cookie);
    } catch {
      socket.data.usuario = null;
    }
    next();
  });

  const avisarAnfitrion = (sala: Sala) => io.to(cuartoAnfitrion(sala.pin)).emit("sala:estado", resumenSala(sala));
  const avisarJugadores = (sala: Sala) =>
    io.to(cuartoJugadores(sala.pin)).emit("sala:info", {
      modo: sala.modo,
      estado: sala.estado,
      numJugadores: sala.jugadores.size,
    });
  const avisarTodos = (sala: Sala) => {
    avisarAnfitrion(sala);
    avisarJugadores(sala);
  };

  const emisor: Emisor = {
    anfitrion: (sala, pantalla) => io.to(cuartoAnfitrion(sala.pin)).emit("juego:anfitrion", pantalla),
    jugador: (_sala, j, pantalla) => {
      if (j.socketId) io.to(j.socketId).emit("juego:jugador", pantalla);
    },
    respuestas: (sala, respondieron, conectados) =>
      io.to(cuartoAnfitrion(sala.pin)).emit("juego:respuestas", { respondieron, conectados }),
  };

  io.on("connection", (socket: Socket) => {
    // Todo handler pasa por aquí: un error (p. ej. MySQL caído un instante) o datos raros de un
    // cliente responden con un error en vez de tumbar el servidor y a todos los jugadores.
    // null → undefined para que funcionen los valores por defecto ({ pin } = {}).
    const on = (evento: string, fn: (...args: any[]) => unknown) =>
      socket.on(evento, async (...args: unknown[]) => {
        try {
          await fn(...args.map((a) => (a === null ? undefined : a)));
        } catch (e) {
          console.error(`[socket ${evento}]`, e);
          const ack = args.find((a): a is (r: unknown) => void => typeof a === "function");
          ack?.({ ok: false, error: "Algo salió mal en el servidor. Inténtalo otra vez." });
        }
      });

    // ── Anfitrión ──────────────────────────────────────────
    async function salaDelAnfitrion(pin: unknown): Promise<Sala | null> {
      const usuario = socket.data.usuario;
      if (!usuario || !pinValido(pin)) return null;
      const sala = await obtenerSala(pin);
      return sala && sala.anfitrionId === usuario.id ? sala : null;
    }

    // Hora del servidor: cada pantalla mide su diferencia de reloj para que la cuenta atrás
    // sea la misma en todos los celulares aunque los avisos lleguen con retraso
    on("reloj", (_datos, ack) => ackSeguro(ack)({ ahora: Date.now() }));

    on("anfitrion:abrir", async ({ pin } = {}, ack) => {
      const responder = ackSeguro(ack);
      const sala = await salaDelAnfitrion(pin);
      if (!sala) return responder({ ok: false, error: "No encontramos esa partida." });
      socket.data.pinAnfitrion = sala.pin;
      await socket.join(cuartoAnfitrion(sala.pin));
      responder({ ok: true, sala: resumenSala(sala), pantalla: pantallaAnfitrion(sala) });
    });

    on("anfitrion:siguiente", async ({ pin } = {}, ack) => {
      const sala = await salaDelAnfitrion(pin);
      if (!sala?.juego) return ackSeguro(ack)({ ok: false });
      await siguiente(sala, emisor).catch((e) => console.error(e));
      ackSeguro(ack)({ ok: true });
    });

    on("anfitrion:bloquear", async ({ pin, bloqueada } = {}, ack) => {
      const sala = await salaDelAnfitrion(pin);
      if (!sala) return ackSeguro(ack)({ ok: false });
      sala.bloqueada = !!bloqueada;
      avisarAnfitrion(sala);
      ackSeguro(ack)({ ok: true });
    });

    on("anfitrion:expulsar", async ({ pin, jugadorId } = {}, ack) => {
      const sala = await salaDelAnfitrion(pin);
      const jugador = sala && typeof jugadorId === "string" ? sala.jugadores.get(jugadorId) : undefined;
      if (!sala || !jugador) return ackSeguro(ack)({ ok: false });
      sala.jugadores.delete(jugador.id);
      if (jugador.socketId) {
        const s = io.sockets.sockets.get(jugador.socketId);
        s?.emit("jugador:expulsado");
        s?.leave(cuartoJugadores(sala.pin));
      }
      avisarTodos(sala);
      ackSeguro(ack)({ ok: true });
    });

    on("anfitrion:empezar", async ({ pin } = {}, ack) => {
      const responder = ackSeguro(ack);
      const sala = await salaDelAnfitrion(pin);
      if (!sala) return responder({ ok: false, error: "No encontramos esa partida." });
      if (sala.jugadores.size === 0) return responder({ ok: false, error: "Espera a que entre al menos un jugador." });
      if (sala.estado !== "sala") return responder({ ok: false, error: "La partida ya empezó." });
      sala.estado = "jugando";
      await prisma.partida.update({ where: { id: sala.partidaId }, data: { estado: "jugando" } });
      avisarTodos(sala);
      try {
        await empezarJuego(sala, emisor);
      } catch (e) {
        sala.estado = "sala";
        avisarTodos(sala);
        return responder({ ok: false, error: (e as Error).message });
      }
      responder({ ok: true });
    });

    on("anfitrion:cerrar", async ({ pin } = {}, ack) => {
      const sala = await salaDelAnfitrion(pin);
      if (!sala) return ackSeguro(ack)({ ok: false });
      await prisma.partida.update({ where: { id: sala.partidaId }, data: { estado: "terminada", terminadaEn: new Date() } });
      io.to(cuartoJugadores(sala.pin)).emit("sala:cerrada");
      cerrarSala(sala.pin);
      ackSeguro(ack)({ ok: true });
    });

    // ── Jugador ────────────────────────────────────────────
    on("jugador:buscar", async ({ pin } = {}, ack) => {
      const responder = ackSeguro(ack);
      const sala = pinValido(pin) ? await obtenerSala(pin) : null;
      if (!sala) return responder({ ok: false, error: MENSAJES["no-existe"] });
      if (sala.estado !== "sala") return responder({ ok: false, error: MENSAJES["ya-empezo"] });
      if (sala.bloqueada) return responder({ ok: false, error: MENSAJES["sala-bloqueada"] });
      responder({ ok: true, titulo: sala.titulo, modo: sala.modo });
    });

    on("jugador:entrar", async ({ pin, apodo } = {}, ack) => {
      const responder = ackSeguro(ack);
      if (socket.data.jugador) return responder({ ok: false, error: "Ya estás en una partida." });
      const sala = pinValido(pin) ? await obtenerSala(pin) : null;
      if (!sala) return responder({ ok: false, error: MENSAJES["no-existe"] });
      const r = agregarJugador(sala, limpiarApodo(apodo), socket.id);
      if (typeof r === "string") return responder({ ok: false, error: MENSAJES[r] });
      socket.data.jugador = { pin: sala.pin, id: r.id };
      await socket.join(cuartoJugadores(sala.pin));
      avisarTodos(sala);
      responder({ ok: true, token: r.token, jugador: jugadorPublico(r), sala: { modo: sala.modo, titulo: sala.titulo, numJugadores: sala.jugadores.size, estado: sala.estado } });
    });

    // Recarga de página o caída de red: vuelve con su token
    on("jugador:volver", async ({ pin, token } = {}, ack) => {
      const responder = ackSeguro(ack);
      const sala = pinValido(pin) ? await obtenerSala(pin) : null;
      const jugador = sala ? jugadorPorToken(sala, token) : null;
      if (!sala || !jugador) return responder({ ok: false });
      if (jugador.socketId && jugador.socketId !== socket.id) io.sockets.sockets.get(jugador.socketId)?.disconnect(true);
      jugador.socketId = socket.id;
      jugador.conectado = true;
      jugador.desconectadoEn = null;
      socket.data.jugador = { pin: sala.pin, id: jugador.id };
      await socket.join(cuartoJugadores(sala.pin));
      avisarTodos(sala);
      responder({
        ok: true,
        jugador: jugadorPublico(jugador),
        sala: { modo: sala.modo, titulo: sala.titulo, numJugadores: sala.jugadores.size, estado: sala.estado },
        pantalla: pantallaJugador(sala, jugador),
      });
      if (sala.juego) emisor.respuestas(sala, sala.juego.respuestas.size, [...sala.jugadores.values()].filter((j) => j.conectado).length);
    });

    on("jugador:responder", async ({ indice, valor } = {}, ack) => {
      const responder_ = ackSeguro(ack);
      const datos = socket.data.jugador as { pin: string; id: string } | undefined;
      const sala = datos ? await obtenerSala(datos.pin) : null;
      const jugador = sala && datos ? sala.jugadores.get(datos.id) : undefined;
      if (!sala || !jugador) return responder_({ ok: false, error: "No estás en esta partida." });
      responder_(responder(sala, emisor, jugador, indice, valor));
    });

    // Modo con poderes
    async function jugadorActual() {
      const datos = socket.data.jugador as { pin: string; id: string } | undefined;
      const sala = datos ? await obtenerSala(datos.pin) : null;
      const jugador = sala && datos ? sala.jugadores.get(datos.id) : undefined;
      return sala && jugador ? { sala, jugador } : null;
    }

    on("jugador:poder", async ({ poder, objetivoId } = {}, ack) => {
      const yo = await jugadorActual();
      if (!yo) return ackSeguro(ack)({ ok: false, error: "No estás en esta partida." });
      ackSeguro(ack)(usarPoder(yo.sala, emisor, yo.jugador, poder, objetivoId));
    });

    // Solo para pruebas automáticas: da un poder concreto (el sorteo real es al azar)
    if (process.env.ARCOHOOT_PRUEBAS === "1" && process.env.NODE_ENV !== "production") {
      on("prueba:dar-poder", async ({ poder, nuevo } = {}, ack) => {
        const yo = await jugadorActual();
        if (!yo || !esIdPoder(poder)) return ackSeguro(ack)({ ok: false });
        if (nuevo) yo.jugador.poderNuevo = { poder, motivo: "Prueba" };
        else yo.jugador.inventario = [...yo.jugador.inventario, poder].slice(-3);
        ackSeguro(ack)({ ok: true });
      });
    }

    on("jugador:poder-nuevo", async ({ accion, objetivoId } = {}, ack) => {
      const yo = await jugadorActual();
      if (!yo) return ackSeguro(ack)({ ok: false, error: "No estás en esta partida." });
      ackSeguro(ack)(decidirPoderNuevo(yo.sala, emisor, yo.jugador, accion, objetivoId));
    });

    on("jugador:salir", async () => {
      const datos = socket.data.jugador as { pin: string; id: string } | undefined;
      if (!datos) return;
      const sala = await obtenerSala(datos.pin);
      socket.data.jugador = undefined;
      socket.leave(cuartoJugadores(datos.pin));
      if (sala?.jugadores.delete(datos.id)) avisarTodos(sala);
    });

    on("disconnect", async () => {
      const datos = socket.data.jugador as { pin: string; id: string } | undefined;
      if (!datos) return;
      const sala = await obtenerSala(datos.pin);
      const jugador = sala?.jugadores.get(datos.id);
      if (!sala || !jugador || jugador.socketId !== socket.id) return;
      jugador.conectado = false;
      jugador.socketId = null;
      jugador.desconectadoEn = Date.now();
      avisarTodos(sala);
      revisarCierre(sala, emisor);
    });
  });

  // En la sala de espera, quien se desconecta y no vuelve en 60 s sale de la lista
  setInterval(() => {
    const limite = Date.now() - 60_000;
    for (const sala of todasLasSalas()) {
      if (sala.estado !== "sala") continue;
      let cambio = false;
      for (const j of sala.jugadores.values()) {
        if (!j.conectado && j.desconectadoEn && j.desconectadoEn < limite) {
          sala.jugadores.delete(j.id);
          cambio = true;
        }
      }
      if (cambio) avisarTodos(sala);
    }
  }, 15_000).unref();

  return io;
}
