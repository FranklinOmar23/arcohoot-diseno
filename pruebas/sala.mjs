// Prueba de la sala en tiempo real: anfitrión + jugadores simulados
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { io } = require("socket.io-client");

const B = process.env.ARCOHOOT_URL ?? "http://localhost:5173";
const ok = (c, m) => console.log(`${c ? "✔" : "✘"} ${m}`);

// 1. Sesión del anfitrión
const r = await fetch(`${B}/api/auth/entrar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo: "demo@arcohoot.app", clave: "arcohoot123" }) });
const cookie = r.headers.get("set-cookie").split(";")[0];
const lista = await (await fetch(`${B}/api/quizzes?q=Seguridad`, { headers: { cookie } })).json();
const quizId = lista.quizzes[0].id;
const partida = await (await fetch(`${B}/api/partidas`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ quizId, modo: "poderes", apodosVisibles: true }) })).json();
const pin = partida.partida.pin;
ok(/^\d{6}$/.test(pin), `partida creada con PIN ${pin}`);

const conectar = (extra = {}) => new Promise((res) => { const s = io(B, { transports: ["websocket"], ...extra }); s.on("connect", () => res(s)); });
const pedir = (s, ev, d) => new Promise((res) => s.emit(ev, d, res));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const anfitrion = await conectar({ extraHeaders: { cookie } });
let ultimo = null;
anfitrion.on("sala:estado", (e) => (ultimo = e));
const a = await pedir(anfitrion, "anfitrion:abrir", { pin });
ok(a.ok && a.sala.jugadores.length === 0, "anfitrión abre la sala vacía");

const intruso = await conectar();
ok(!(await pedir(intruso, "anfitrion:abrir", { pin })).ok, "sin sesión no se puede abrir como anfitrión");
ok(!(await pedir(intruso, "jugador:buscar", { pin: "000000" })).ok, "PIN inexistente rechazado");
ok((await pedir(intruso, "jugador:buscar", { pin })).ok, "PIN válido encontrado");

const j1 = await conectar();
const e1 = await pedir(j1, "jugador:entrar", { pin, apodo: "  Ana  " });
ok(e1.ok && e1.jugador.apodo === "Ana", "Ana entra (apodo recortado)");
const j2 = await conectar();
ok(!(await pedir(j2, "jugador:entrar", { pin, apodo: "ána" })).ok, "apodo repetido (sin tildes/mayúsculas) rechazado");
ok(!(await pedir(j2, "jugador:entrar", { pin, apodo: "   " })).ok, "apodo vacío rechazado");
const e2 = await pedir(j2, "jugador:entrar", { pin, apodo: "Un apodo larguísimo de verdad" });
ok(e2.ok && e2.jugador.apodo.length === 15, `apodo largo cortado a 15: "${e2.jugador.apodo}"`);
await esperar(150);
ok(ultimo?.jugadores.length === 2, "anfitrión recibe la lista con 2 jugadores");

// Reconexión
j1.disconnect();
await esperar(150);
ok(ultimo.jugadores.find((j) => j.apodo === "Ana")?.conectado === false, "Ana aparece desconectada");
const j1b = await conectar();
const v = await pedir(j1b, "jugador:volver", { pin, token: e1.token });
await esperar(150);
ok(v.ok && ultimo.jugadores.find((j) => j.apodo === "Ana")?.conectado === true, "Ana vuelve con su token");
ok(!(await pedir(intruso, "jugador:volver", { pin, token: "falso" })).ok, "token falso rechazado");

// Bloquear
await pedir(anfitrion, "anfitrion:bloquear", { pin, bloqueada: true });
const j3 = await conectar();
ok(!(await pedir(j3, "jugador:entrar", { pin, apodo: "Luis" })).ok, "sala bloqueada no deja entrar");
await pedir(anfitrion, "anfitrion:bloquear", { pin, bloqueada: false });
ok((await pedir(j3, "jugador:entrar", { pin, apodo: "Luis" })).ok, "al desbloquear, Luis entra");

// Expulsar
let expulsado = false;
j3.on("jugador:expulsado", () => (expulsado = true));
const idLuis = ultimo.jugadores.find((j) => j.apodo === "Luis")?.id;
await esperar(100);
await pedir(anfitrion, "anfitrion:expulsar", { pin, jugadorId: idLuis ?? (await esperar(100), ultimo.jugadores.find((j) => j.apodo === "Luis").id) });
await esperar(150);
ok(expulsado && ultimo.jugadores.length === 2, "Luis expulsado");

// Empezar
let info = null;
j1b.on("sala:info", (i) => (info = i));
ok((await pedir(anfitrion, "anfitrion:empezar", { pin })).ok, "anfitrión empieza");
await esperar(150);
ok(info?.estado === "jugando", "jugadores reciben estado 'jugando'");
ok(!(await pedir(intruso, "jugador:entrar", { pin, apodo: "Tarde" })).ok, "ya no se puede entrar");

// Cerrar
let cerrada = false;
j1b.on("sala:cerrada", () => (cerrada = true));
await pedir(anfitrion, "anfitrion:cerrar", { pin });
await esperar(150);
ok(cerrada, "al cerrar, jugadores reciben 'sala:cerrada'");

const red = await (await fetch(`${B}/api/red`)).json();
console.log("IPs de red para el QR:", red.ips.join(", ") || "(ninguna)");
for (const s of [anfitrion, intruso, j1b, j2, j3]) s.disconnect();
process.exit(0);
