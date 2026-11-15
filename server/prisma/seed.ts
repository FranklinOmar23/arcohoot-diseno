// Datos de ejemplo: un usuario demo y los 7 quizzes de la pantalla H1.
// "Seguridad en el trabajo" lleva las preguntas reales de los diseños (H2, J4–J9).
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIA = 24 * 60 * 60 * 1000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA);

// Ilustraciones de los diseños (H2 y J8), guardadas como archivos propios
const IMAGENES: Record<string, string> = {
  "piso-mojado.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="#bde8ff"/><rect y="150" width="400" height="70" fill="#ecdfcc"/><path d="M0 150h400" stroke="#1e1b3a" stroke-width="3"/><ellipse cx="250" cy="182" rx="86" ry="18" fill="#0c7d70" opacity=".35"/><path d="M120 40 182 148H58z" fill="#ffc21a" stroke="#1e1b3a" stroke-width="5" stroke-linejoin="round"/><path d="M120 78v34" stroke="#1e1b3a" stroke-width="9" stroke-linecap="round"/><circle cx="120" cy="130" r="5.5" fill="#1e1b3a"/><path d="M296 70 324 168h-56z" fill="#ff5a36" stroke="#1e1b3a" stroke-width="5" stroke-linejoin="round"/><path d="M286 104h20M279 132h34" stroke="#fff" stroke-width="9"/><rect x="254" y="164" width="84" height="12" rx="4" fill="#1e1b3a"/><circle cx="356" cy="44" r="18" fill="#fff" opacity=".7"/><circle cx="40" cy="36" r="10" fill="#fff" opacity=".7"/></svg>`,
  "plano-oficina.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="300" viewBox="0 0 360 300"><rect x="4" y="4" width="352" height="292" rx="12" fill="#fff" stroke="#1e1b3a" stroke-width="3"/><g stroke="#1e1b3a" stroke-width="3" stroke-linecap="round"><path d="M150 4v60M150 96v120M150 248v48M4 130h110M150 170h50M232 170h124M260 170v40M260 242v54"/></g><g fill="#ecdfcc"><rect x="20" y="24" width="90" height="34" rx="6"/><rect x="176" y="30" width="60" height="36" rx="6"/><rect x="260" y="30" width="60" height="36" rx="6"/><rect x="176" y="100" width="60" height="36" rx="6"/><rect x="260" y="100" width="60" height="36" rx="6"/><rect x="36" y="186" width="80" height="60" rx="30"/><rect x="166" y="250" width="80" height="30" rx="6"/></g><g font-family="Nunito, sans-serif" font-weight="800" font-size="12" fill="#5b5675"><text x="20" y="100">Recepción</text><text x="176" y="160">Oficinas</text><text x="20" y="280">Sala de reuniones</text><text x="166" y="236">Cocina</text><text x="272" y="196">Pasillo</text></g><g stroke="#1e1b3a" stroke-width="2.5" fill="none"><path d="M300 222h26M300 232h26M300 242h26M300 252h26"/></g><text x="290" y="276" font-family="Nunito, sans-serif" font-weight="800" font-size="11" fill="#5b5675">Escalera</text></svg>`,
};

type P = { tipo: string; enunciado: string; tiempo?: number; puntosDobles?: boolean; imagen?: string; datos: unknown };

const quiz = (...ops: [string, boolean?][]) => ({ opciones: ops.map(([texto, correcta]) => ({ texto, correcta: !!correcta })) });

const SEGURIDAD: P[] = [
  { tipo: "quiz", enunciado: "¿Qué es un EPP?", datos: quiz(["Equipo de protección personal", true], ["Examen periódico de personal"], ["Plan de evacuación"], ["Equipo para pintar paredes"]) },
  { tipo: "verdadero_falso", enunciado: "La salida de emergencia puede quedar bloqueada si es solo por un rato.", datos: { correcta: false } },
  { tipo: "respuesta_corta", enunciado: "¿Qué número marcas en una emergencia?", datos: { respuestas: ["911"] } },
  {
    tipo: "quiz",
    enunciado: "¿Qué debes hacer si ves un riesgo en tu área de trabajo?",
    puntosDobles: true,
    imagen: "/api/subidas/piso-mojado.svg",
    datos: quiz(["Ignorarlo"], ["Esperar a mañana"], ["Reportarlo a tu supervisor", true], ["Publicarlo en redes"]),
  },
  { tipo: "deslizante", enunciado: "¿Cuántos segundos debes lavarte las manos?", datos: { min: 0, max: 60, paso: 1, correcta: 20, margen: 5, unidad: "s" } },
  { tipo: "pin", enunciado: "¿Dónde está la salida de emergencia?", imagen: "/api/subidas/plano-oficina.svg", datos: { zona: { x: 93.9, y: 78.7, r: 9.5, a: 300 / 360 } } },
  {
    tipo: "puzzle",
    enunciado: "Ordena los pasos ante un incendio",
    tiempo: 30,
    datos: { elementos: ["Mantén la calma", "Activa la alarma", "Sal por la ruta de evacuación", "Ve al punto de encuentro"] },
  },
  { tipo: "quiz", enunciado: "¿De qué color son las señales de prohibición?", datos: quiz(["Rojo", true], ["Verde"], ["Azul"], ["Amarillo"]) },
  { tipo: "verdadero_falso", enunciado: "Debes usar casco en todas las zonas de obra.", datos: { correcta: true } },
  { tipo: "quiz", enunciado: "¿Qué extintor usas en un fuego eléctrico?", datos: quiz(["Agua"], ["CO₂", true], ["Espuma"], ["Arena mojada"]) },
];

const relleno = (n: number): P[] =>
  Array.from({ length: n }, (_, i) => ({
    tipo: "quiz",
    enunciado: `Pregunta ${i + 1}`,
    datos: quiz(["Opción 1", true], ["Opción 2"], ["Opción 3"], ["Opción 4"]),
  }));

const QUIZZES = [
  { titulo: "Seguridad en el trabajo", preguntas: SEGURIDAD, dias: 2, jugado: 9, portada: 0, favorito: true },
  { titulo: "Inducción: cultura y valores", preguntas: relleno(12), dias: 1, jugado: 14, portada: 1, favorito: false },
  { titulo: "Redes: conceptos básicos", preguntas: relleno(15), dias: 4, jugado: 6, portada: 2, favorito: false },
  { titulo: "Atención al cliente", preguntas: relleno(8), dias: 7, jugado: 11, portada: 3, favorito: true },
  { titulo: "Excel para principiantes", preguntas: relleno(20), dias: 14, jugado: 3, portada: 4, favorito: false },
  { titulo: "Geografía dominicana", preguntas: relleno(12), dias: 21, jugado: 7, portada: 1, favorito: false },
  { titulo: "Primeros auxilios básicos", preguntas: relleno(9), dias: 30, jugado: 5, portada: 5, favorito: false },
];

async function main() {
  // Las ilustraciones de ejemplo van a la tabla Imagen (son nuestras, por eso se permite SVG)
  for (const [nombre, svg] of Object.entries(IMAGENES)) {
    const datos = Buffer.from(svg, "utf8");
    await prisma.imagen.upsert({ where: { nombre }, update: { datos }, create: { nombre, tipo: "image/svg+xml", datos } });
  }

  const correo = "demo@arcohoot.app";
  const usuario = await prisma.usuario.upsert({
    where: { correo },
    update: {},
    create: { nombre: "Ana", correo, claveHash: await bcrypt.hash("arcohoot123", 12) },
  });
  await prisma.quiz.deleteMany({ where: { autorId: usuario.id } });

  for (const q of QUIZZES) {
    await prisma.quiz.create({
      data: {
        titulo: q.titulo,
        portada: q.portada,
        favorito: q.favorito,
        vecesJugado: q.jugado,
        creadoEn: hace(q.dias + 10),
        actualizadoEn: hace(q.dias),
        autorId: usuario.id,
        preguntas: {
          create: q.preguntas.map((p, orden) => ({
            orden,
            tipo: p.tipo,
            enunciado: p.enunciado,
            tiempo: p.tiempo ?? 20,
            puntosDobles: p.puntosDobles ?? false,
            imagen: p.imagen ?? null,
            datos: JSON.stringify(p.datos),
          })),
        },
      },
    });
  }
  console.log(`Listo: ${correo} / arcohoot123 con ${QUIZZES.length} quizzes.`);
}

main().finally(() => prisma.$disconnect());
