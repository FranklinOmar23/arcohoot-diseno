// Modo con poderes: 4 jugadores usan los 9 poderes en "Seguridad en el trabajo"
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { io } = require("socket.io-client");

const B = process.env.ARCOHOOT_URL ?? "http://localhost:5173";
let fallos = 0;
const ok = (c, m) => { if (!c) fallos++; console.log(`${c ? "✔" : "✘"} ${m}`); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// Cada pregunta empieza tras 3 s de «¡Prepárate!»: espera a que arranque antes de responder
const aEmpezar = async (p) => { const ms = (p?.inicioEn ?? 0) - Date.now(); if (ms > 0) await esperar(ms + 80); };

// Google sin configurar: el botón no aparece y el endpoint lo dice
const cfg = await (await fetch(`${B}/api/auth/config`)).json();
ok(cfg.googleClientId === null, "Google sin GOOGLE_CLIENT_ID: config devuelve null");
const g = await fetch(`${B}/api/auth/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
ok(g.status === 503, "POST /auth/google responde 503 si no está configurado");

const r = await fetch(`${B}/api/auth/entrar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo: "demo@arcohoot.app", clave: "arcohoot123" }) });
const cookie = r.headers.get("set-cookie").split(";")[0];
const lista = await (await fetch(`${B}/api/quizzes?q=Seguridad`, { headers: { cookie } })).json();
const { partida } = await (await fetch(`${B}/api/partidas`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ quizId: lista.quizzes[0].id, modo: "poderes" }) })).json();
const pin = partida.pin;

const conectar = (extra = {}) => new Promise((res) => { const s = io(B, { transports: ["websocket"], ...extra }); s.on("connect", () => res(s)); });
const pedir = (s, ev, d) => new Promise((res) => s.emit(ev, d, res));

const host = await conectar({ extraHeaders: { cookie } });
let ph = null;
host.on("juego:anfitrion", (p) => (ph = p));
await pedir(host, "anfitrion:abrir", { pin });

const J = {};
for (const apodo of ["Ana", "Luis", "Marta", "Pedro"]) {
  const s = await conectar();
  const j = { apodo, s, p: null };
  s.on("juego:jugador", (p) => (j.p = p));
  const e = await pedir(s, "jugador:entrar", { pin, apodo });
  j.id = e.jugador.id;
  J[apodo] = j;
}
const { Ana, Luis, Marta, Pedro } = J;
const dar = async (j, ...ps) => { for (const poder of ps) ok((await pedir(j.s, "prueba:dar-poder", { poder })).ok, `  (prueba) ${j.apodo} recibe ${poder}`); };
const usar = (j, poder, objetivo) => pedir(j.s, "jugador:poder", { poder, objetivoId: objetivo?.id });

await pedir(host, "anfitrion:empezar", { pin });
await esperar(200);
ok(ph.fase === "pregunta" && Array.isArray(ph.feed), "pregunta 1 con panel de poderes en la pantalla grande");
ok(Ana.p.poderes && Ana.p.poderes.inventario.length === 0 && Ana.p.poderes.rivales.length === 3, "cada jugador ve su inventario vacío y 3 rivales");

await aEmpezar(Ana.p);
// ── Pregunta 1 (Quiz: la correcta es la 0) ──
await dar(Ana, "doble", "cincuenta", "congelar");
ok(!(await pedir(Ana.s, "prueba:dar-poder", { poder: "inventado" })).ok, "un poder inexistente se rechaza");
let u = await usar(Ana, "doble");
ok(u.ok && Ana.p.poderes.efectos.doble && Ana.p.poderes.efectos.aviso?.tipo === "doble", "P8 · Ana activa x2");
u = await usar(Ana, "cincuenta");
const ocultas = Ana.p.poderes.efectos.ocultas;
ok(u.ok && ocultas.length === 2 && !ocultas.includes(0), `50/50 · oculta ${JSON.stringify(ocultas)} (nunca la correcta)`);
ok(!(await usar(Ana, "cincuenta")).ok, "no puede usar un poder que ya no tiene");

await dar(Pedro, "escudo", "tiempo");
ok((await usar(Pedro, "escudo")).ok, "P7 · Pedro activa su Escudo");
await esperar(50);
ok(Marta.p.poderes.rivales.find((x) => x.apodo === "Pedro")?.protegido === true, "P3 · Marta ve a Pedro como «Protegido»");
await dar(Marta, "niebla", "revolver", "robo");
u = await usar(Marta, "niebla", Pedro);
await esperar(50);
ok(u.ok && u.bloqueado && Pedro.p.poderes.efectos.aviso?.tipo === "bloqueo" && !Pedro.p.poderes.escudo, "el Escudo bloquea la Niebla de Marta y se gasta");
ok(Pedro.p.poderes.efectos.nieblaMs === 0, "Pedro no queda nublado");

u = await usar(Ana, "congelar", Luis);
await esperar(50);
ok(u.ok && Luis.p.poderes.efectos.congeladoMs > 2000 && Luis.p.poderes.efectos.aviso?.de === "Ana", "P4 · Ana congela a Luis 3 s");
const congelado = await pedir(Luis.s, "jugador:responder", { indice: 0, valor: 0 });
ok(!congelado.ok && /congelado/i.test(congelado.error), "Luis congelado no puede responder");

u = await usar(Marta, "revolver", Pedro);
await esperar(50);
const orden = Pedro.p.poderes.efectos.orden;
ok(u.ok && orden?.length === 4 && orden.some((v, i) => v !== i), `P6 · Marta revuelve a Pedro: ${JSON.stringify(orden)}`);
u = await usar(Pedro, "tiempo");
await esperar(50);
ok(u.ok && Pedro.p.poderes.efectos.extraMs === 5000 && Pedro.p.restanteMs > 20000, `P9 · Pedro +5 s (le quedan ${Math.round(Pedro.p.restanteMs / 1000)} s)`);
ok(!(await usar(Marta, "robo", Marta)).ok, "no puedes atacarte a ti mismo");

await esperar(50);
const textos = ph.feed.map((f) => f.texto);
ok(textos.some((t) => t.includes("congeló a Luis")) && textos.some((t) => t.includes("Escudo de Pedro bloqueó")), "el feed de H5 muestra «Ana congeló a Luis» y el bloqueo");
console.log("   feed:", textos.slice(0, 4).join(" | "));

await dar(Luis, "segunda");
await esperar(3100);
ok((await usar(Luis, "segunda")).ok, "Luis se descongela y activa Segunda oportunidad");
const fallo = await pedir(Luis.s, "jugador:responder", { indice: 0, valor: 2 });
ok(fallo.ok && fallo.reintento && Luis.p.fase === "pregunta" && Luis.p.poderes.efectos.descartadas.includes(2), "🔁 Luis falla, pero puede volver a responder (la 3 queda descartada)");
ok((await pedir(Luis.s, "jugador:responder", { indice: 0, valor: 0 })).ok, "Luis acierta al segundo intento");
await pedir(Ana.s, "jugador:responder", { indice: 0, valor: 0 });
await pedir(Marta.s, "jugador:responder", { indice: 0, valor: 0 });
await pedir(Pedro.s, "jugador:responder", { indice: 0, valor: 0 });
await esperar(200);
ok(ph.fase === "resultado", "todos respondieron: la pregunta se cierra sola");
ok(Ana.p.dobles && Ana.p.ganados > Luis.p.ganados * 1.5, `x2 · Ana gana ${Ana.p.ganados} vs Luis ${Luis.p.ganados}`);

// ── Pregunta 2: Robo ──
await pedir(host, "anfitrion:siguiente", { pin });
await pedir(host, "anfitrion:siguiente", { pin });
await esperar(150);
await aEmpezar(Ana.p);
const antesAna = Ana.p.puntos;
const antesMarta = Marta.p.puntos;
u = await usar(Marta, "robo", Ana);
await esperar(80);
const robados = Math.floor(antesAna * 0.1);
ok(u.ok && Ana.p.puntos === antesAna - robados && Marta.p.puntos === antesMarta + robados, `💰 Marta le roba ${robados} pts a Ana (10 %)`);
ok(Ana.p.poderes.efectos.aviso?.tipo === "robo", "Ana ve el aviso «¡Te robaron!»");
ok(!(await usar(Pedro, "revolver", Ana)).ok, "Pedro no tiene Revolver: se rechaza");
for (const j of [Ana, Luis, Marta, Pedro]) await pedir(j.s, "jugador:responder", { indice: 1, valor: false });
await esperar(150);

// ── Pregunta 3: Ana llega a racha de 3 y gana un poder ──
await pedir(host, "anfitrion:siguiente", { pin });
await pedir(host, "anfitrion:siguiente", { pin });
await esperar(150);
await aEmpezar(Ana.p);
ok(!(await usar(Pedro, "revolver", Ana)).ok, "Revolver no se puede usar en Respuesta corta");
await pedir(Ana.s, "jugador:responder", { indice: 2, valor: "911" });
for (const j of [Luis, Marta, Pedro]) await pedir(j.s, "jugador:responder", { indice: 2, valor: "no sé" });
await esperar(200);
ok(Ana.p.fase === "resultado" && Ana.p.racha === 3 && Ana.p.poderNuevo?.poder, `P2 · Ana gana «${Ana.p.poderNuevo?.poder}» — ${Ana.p.poderNuevo?.motivo}`);
ok(!Luis.p.poderNuevo, "quien falló no gana poder");
const antesInv = Ana.p.poderes.inventario.length;
u = await pedir(Ana.s, "jugador:poder-nuevo", { accion: "guardar" });
await esperar(50);
ok(u.ok && !Ana.p.poderNuevo && Ana.p.poderes.inventario.length === antesInv + 1, `Ana lo guarda en su inventario (${antesInv + 1} de 3)`);

// "Usar ahora" arma el poder para la próxima pregunta
ok(!(await pedir(Pedro.s, "jugador:poder-nuevo", { accion: "usar" })).ok, "sin poder nuevo, «Usar ahora» se rechaza");
await pedir(Pedro.s, "prueba:dar-poder", { poder: "congelar", nuevo: true });
ok(!(await pedir(Pedro.s, "jugador:poder-nuevo", { accion: "usar" })).ok, "«Usar ahora» un ataque sin elegir rival se rechaza");
ok((await pedir(Pedro.s, "jugador:poder-nuevo", { accion: "usar", objetivoId: Marta.id })).ok, "Pedro arma Congelar contra Marta para la próxima pregunta");
await pedir(Luis.s, "prueba:dar-poder", { poder: "doble", nuevo: true });
ok((await pedir(Luis.s, "jugador:poder-nuevo", { accion: "usar" })).ok, "Luis arma su x2");
await pedir(host, "anfitrion:siguiente", { pin });
await pedir(host, "anfitrion:siguiente", { pin });
await esperar(200);
ok(ph.fase === "pregunta" && ph.indice === 3, "empieza la pregunta 4");
ok(Marta.p.poderes.efectos.congeladoMs > 2000 && Marta.p.poderes.efectos.aviso?.de === "Pedro", "al empezar, Marta queda congelada por Pedro");
ok(Luis.p.poderes.efectos.doble, "al empezar, Luis ya tiene x2 activo");

await pedir(host, "anfitrion:cerrar", { pin });
for (const j of Object.values(J)) j.s.disconnect();
host.disconnect();
console.log(fallos ? `\n${fallos} FALLOS` : "\nTODO OK");
process.exit(fallos ? 1 : 0);
