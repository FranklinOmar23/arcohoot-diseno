// Partida completa simulada: anfitrión + 3 jugadores, las 10 preguntas de "Seguridad en el trabajo"
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { io } = require("socket.io-client");
const ExcelJS = require("exceljs");

const B = process.env.ARCOHOOT_URL ?? "http://localhost:5173";
let fallos = 0;
const ok = (c, m) => { if (!c) fallos++; console.log(`${c ? "✔" : "✘"} ${m}`); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const r = await fetch(`${B}/api/auth/entrar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo: "demo@arcohoot.app", clave: "arcohoot123" }) });
const cookie = r.headers.get("set-cookie").split(";")[0];
const lista = await (await fetch(`${B}/api/quizzes?q=Seguridad`, { headers: { cookie } })).json();
const quizId = lista.quizzes[0].id;
const { partida } = await (await fetch(`${B}/api/partidas`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ quizId, modo: "clasico" }) })).json();
const pin = partida.pin;

const conectar = (extra = {}) => new Promise((res) => { const s = io(B, { transports: ["websocket"], ...extra }); s.on("connect", () => res(s)); });
const pedir = (s, ev, d) => new Promise((res) => s.emit(ev, d, res));

const host = await conectar({ extraHeaders: { cookie } });
let pantallaHost = null;
host.on("juego:anfitrion", (p) => (pantallaHost = p));
await pedir(host, "anfitrion:abrir", { pin });

const jugadores = [];
for (const apodo of ["Ana", "Luis", "Marta"]) {
  const s = await conectar();
  const j = { apodo, s, pantalla: null, token: null };
  s.on("juego:jugador", (p) => (j.pantalla = p));
  const e = await pedir(s, "jugador:entrar", { pin, apodo });
  j.token = e.token;
  jugadores.push(j);
}
const [ana, luis, marta] = jugadores;

const empezo = await pedir(host, "anfitrion:empezar", { pin });
await esperar(200);
ok(empezo.ok && pantallaHost?.fase === "pregunta" && pantallaHost.indice === 0, "empieza: el anfitrión ve la pregunta 1");
ok(jugadores.every((j) => j.pantalla?.fase === "pregunta"), "los 3 jugadores reciben la pregunta 1");
ok(!("datos" in pantallaHost.pregunta) && !JSON.stringify(ana.pantalla).includes("correcta"), "nadie recibe la respuesta correcta antes de tiempo");

// Respuestas por pregunta: [Ana, Luis, Marta]. Ana acierta todo; Luis falla algunas; Marta no responde la 3.
const plan = [
  /* 1 quiz EPP (0 correcta) */ [0, 1, 0],
  /* 2 V/F (falso) */ [false, true, false],
  /* 3 corta 911 */ [" 911 ", "112", null],
  /* 4 quiz riesgo x2 (2 correcta) */ [2, 2, 0],
  /* 5 deslizante 20 ±5 */ [20, 40, 24],
  /* 6 pin zona 93.9,78.7 */ [{ x: 93, y: 79 }, { x: 10, y: 10 }, { x: 95, y: 82 }],
  /* 7 puzzle */ ["ok", "mal", "ok"],
  /* 8 quiz rojo (0) */ [0, 0, 1],
  /* 9 V/F casco (true) */ [true, true, false],
  /* 10 quiz CO2 (1) */ [1, 0, 1],
];

for (let q = 0; q < plan.length; q++) {
  await esperar(150);
  ok(pantallaHost.fase === "pregunta" && pantallaHost.indice === q, `pregunta ${q + 1} (${pantallaHost.pregunta.tipo}) en pantalla`);
  for (let k = 0; k < 3; k++) {
    let v = plan[q][k];
    if (v === null) continue;
    const pj = jugadores[k].pantalla;
    if (pj.pregunta.tipo === "puzzle") {
      const ids = pj.pregunta.elementos.map((e) => e.id);
      v = v === "ok" ? [...ids].sort((a, b) => a - b) : ids; // los revueltos nunca vienen en orden
    }
    const res = await pedir(jugadores[k].s, "jugador:responder", { indice: q, valor: v });
    ok(res.ok, `  ${jugadores[k].apodo} responde`);
    await esperar(30);
  }
  if (q === 0) {
    ok(ana.pantalla.fase === "resultado" || ana.pantalla.fase === "enviada", "  tras responder, Ana ve 'enviada' o el resultado");
    const dup = await pedir(ana.s, "jugador:responder", { indice: 0, valor: 1 });
    ok(!dup.ok, "  no se puede responder dos veces");
  }
  // Marta no responde la 3: el anfitrión salta
  if (pantallaHost.fase === "pregunta") await pedir(host, "anfitrion:siguiente", { pin });
  await esperar(150);
  ok(pantallaHost.fase === "resultado", `  resultado de la pregunta ${q + 1}`);
  if (q === 0) ok(JSON.stringify(pantallaHost.stats.conteos) === "[2,1,0,0]", `  barras de la 1: ${JSON.stringify(pantallaHost.stats.conteos)}`);
  if (q === 2) {
    ok(pantallaHost.stats.aciertos === 1 && marta.pantalla.respondio === false, "  corta: solo Ana acierta ' 911 '; Marta sin responder");
    ok(marta.pantalla.correcta === false && marta.pantalla.racha === 0, "  Marta pierde la racha");
  }
  if (q === 3) ok(ana.pantalla.dobles && ana.pantalla.ganados >= 1000 * 2, `  puntos dobles: Ana gana ${ana.pantalla.ganados}`);
  if (q === 4) ok(pantallaHost.stats.aciertos === 2 && pantallaHost.stats.barras.reduce((a, b) => a + b) === 3, "  deslizante: 20 y 24 aciertan (±5), 40 no");
  if (q === 5) ok(pantallaHost.stats.aciertos === 2 && pantallaHost.stats.puntos.length === 3, "  pin: 2 dentro de la zona, 3 toques en el mapa");
  if (q === 6) ok(pantallaHost.stats.aciertos === 2, "  puzzle: 2 lo ordenaron bien");
  if (q === 1) ok(ana.pantalla.racha === 2, `  Ana lleva racha de ${ana.pantalla.racha}`);
  if (q < plan.length - 1) {
    await pedir(host, "anfitrion:siguiente", { pin });
    await esperar(100);
    ok(pantallaHost.fase === "ranking" && pantallaHost.filas[0].apodo === "Ana", `  ranking: 1.º ${pantallaHost.filas[0].apodo}`);
    await pedir(host, "anfitrion:siguiente", { pin });
  } else {
    ok(pantallaHost.ultima === true, "  la última pregunta ofrece 'Ver podio'");
    await pedir(host, "anfitrion:siguiente", { pin });
  }
}

await esperar(500);
ok(pantallaHost.fase === "podio", "podio en la pantalla grande");
console.log("   podio:", pantallaHost.podio.map((g) => `${g.puesto}.º ${g.apodo} ${g.puntos}`).join(" · "));
ok(pantallaHost.podio[0].apodo === "Ana", "Ana gana (acertó todo)");
ok(ana.pantalla.fase === "podio" && ana.pantalla.aciertos === 10 && ana.pantalla.puesto === 1, `Ana: ${ana.pantalla.aciertos}/10 aciertos, puesto ${ana.pantalla.puesto}`);

// Reconexión tras el final: vuelve a ver su resultado
ana.s.disconnect();
const s2 = await conectar();
const v = await pedir(s2, "jugador:volver", { pin, token: ana.token });
ok(v.ok && v.pantalla?.fase === "podio", "Ana recarga y sigue viendo su resultado final");

// Excel
const xl = await fetch(`${B}/api/partidas/${pantallaHost.partidaId}/excel`, { headers: { cookie } });
ok(xl.ok && xl.headers.get("content-type").includes("spreadsheetml"), `Excel descargado: ${/filename="([^"]+)"/.exec(xl.headers.get("content-disposition"))?.[1]}`);
const buf = Buffer.from(await xl.arrayBuffer());
const ruta = (await import("node:path")).join((await import("node:os")).tmpdir(), "arcohoot-resultados.xlsx");
fs.writeFileSync(ruta, buf);
const libro = new ExcelJS.Workbook();
await libro.xlsx.load(buf);
const hojaR = libro.getWorksheet("Ranking");
const hojaP = libro.getWorksheet("Respuestas");
ok(hojaR.rowCount === 4 && hojaR.getRow(2).getCell(2).value === "Ana", `hoja Ranking: ${hojaR.rowCount - 1} jugadores, 1.º ${hojaR.getRow(2).getCell(2).value}`);
ok(hojaP.rowCount === 31, `hoja Respuestas: ${hojaP.rowCount - 1} filas (3 × 10)`);
const sinRespuesta = hojaP.getRows(2, 30).find((f) => f.getCell(1).value === "Marta" && f.getCell(2).value === 3);
ok(sinRespuesta?.getCell(4).value === "(sin respuesta)", "Marta sin respuesta en la 3 queda registrada");
const sinSesion = await fetch(`${B}/api/partidas/${pantallaHost.partidaId}/excel`);
ok(sinSesion.status === 401, "el Excel exige sesión");

await pedir(host, "anfitrion:cerrar", { pin });
for (const s of [host, s2, luis.s, marta.s]) s.disconnect();
console.log(fallos ? `\n${fallos} FALLOS` : "\nTODO OK");
process.exit(fallos ? 1 : 0);
