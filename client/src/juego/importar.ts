import {
  MAX_ENUNCIADO,
  MAX_OPCION,
  MAX_RESPUESTA_CORTA,
  nuevaPregunta,
  type Pregunta,
} from "./preguntas";

// Convierte texto pegado (o extraído de un PDF) en preguntas del editor.
//
// Formatos que entiende:
//   1. ¿Cuál es el planeta más grande?        ← pregunta numerada: "1." "1)" "1-" "Pregunta 1:"
//   a) Saturno                                ← opciones: "a)" "A." "a-" "( )" "[ ]" "-" "•"
//   b) Júpiter ✅ (Correcta)                   ← correcta: ✅ ✔ ✓ "(Correcta)" "*" "[x]" "(x)"
//   Respuesta: b                              ← o una línea "Respuesta/Correcta: b" (letra o texto)
//
//   2. Verdadero o falso: el Pacífico es el más grande.
//   ( ) Verdadero ✅                           ← dos opciones Verdadero/Falso → tipo V/F
//
//   3. ¿Qué número marcas en una emergencia?
//   Respuesta: 911                            ← sin opciones + "Respuesta:" → respuesta corta

export interface PreguntaImportada {
  pregunta: Pregunta;
  avisos: string[];
}

const RE_PREGUNTA = /^\s*(?:pregunta\s*)?(\d{1,3})\s*[.):\-–]\s*(.+)$/i;
const RE_OPCION_LETRA = /^\s*\(?([a-hA-H])\s*[).:\-–]\s+(.+)$/;
const RE_OPCION_MARCA = /^\s*(?:\(\s*[xX✓✔]?\s*\)|\[\s*[xX✓✔]?\s*\]|[-•●○▪◦*])\s*(.+)$/;
const RE_RESPUESTA = /^\s*(?:respuesta(?:\s+correcta)?|correcta|soluci[oó]n|clave)\s*[:=\-–]\s*(.+)$/i;
const RE_MARCA_CORRECTA = /(✅|✔️?|☑️?|✓|\(\s*correct[ao]\s*\)|\[\s*correct[ao]\s*\]|\(\s*x\s*\)|\[\s*x\s*\])/i;
const RE_ES_VF = /^\s*(?:verdadero\s*(?:o|\/)\s*falso|v\s*(?:o|\/)\s*f)\s*[:.\-–]?\s*/i;

const limpiar = (s: string) => s.replace(/\s+/g, " ").trim();
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Quita las marcas de "correcta" del texto y dice si las tenía */
function quitarMarca(texto: string): { texto: string; correcta: boolean } {
  let correcta = false;
  let t = texto;
  // "* texto" o "texto *" también cuentan como correcta
  if (/^\s*\*\s*\S/.test(t) || /\S\s*\*\s*$/.test(t)) {
    correcta = true;
    t = t.replace(/^\s*\*\s*/, "").replace(/\s*\*\s*$/, "");
  }
  while (RE_MARCA_CORRECTA.test(t)) {
    correcta = true;
    t = t.replace(RE_MARCA_CORRECTA, " ");
  }
  return { texto: limpiar(t.replace(/[\s:,;–-]+$/, "")), correcta };
}

interface Bloque {
  numero: number | null;
  enunciado: string[];
  opciones: { letra: string | null; texto: string; correcta: boolean; marcada: boolean; estrella?: boolean }[];
  respuesta: string | null;
}

/** Divide el texto en bloques, uno por pregunta */
function dividir(texto: string): Bloque[] {
  const lineas = texto
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/ /g, " ").trimEnd());
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;
  const nuevo = (numero: number | null, primera: string) => {
    actual = { numero, enunciado: [primera], opciones: [], respuesta: null };
    bloques.push(actual);
  };

  for (const linea of lineas) {
    if (!linea.trim()) continue;
    const mResp = RE_RESPUESTA.exec(linea);
    const mPreg = RE_PREGUNTA.exec(linea);
    const mLetra = RE_OPCION_LETRA.exec(linea);
    const mMarca = RE_OPCION_MARCA.exec(linea);
    const b = actual as Bloque | null;

    if (mResp && b) {
      b.respuesta = limpiar(mResp[1]);
    } else if (mPreg && !(b && b.opciones.length === 0 && mLetra)) {
      nuevo(Number(mPreg[1]), mPreg[2]);
    } else if (b && mLetra) {
      const { texto, correcta } = quitarMarca(mLetra[2]);
      b.opciones.push({ letra: mLetra[1].toLowerCase(), texto, correcta, marcada: correcta });
    } else if (b && mMarca && (b.opciones.length > 0 || b.enunciado.join(" ").trim().endsWith("?") || /\(\s*[xX✓✔]?\s*\)|\[\s*[xX✓✔]?\s*\]/.test(linea.slice(0, 5)))) {
      const marcadaCaja = /^\s*[([]\s*[xX✓✔]\s*[)\]]/.test(linea);
      // "* Siete" entre opciones con "-" marca la correcta
      const estrella = /^\s*\*/.test(linea);
      const { texto, correcta } = quitarMarca(mMarca[1]);
      const marcada = correcta || marcadaCaja || estrella;
      b.opciones.push({ letra: null, texto, correcta: marcada, marcada, estrella });
    } else if (b && b.opciones.length === 0) {
      // Enunciado de varias líneas
      b.enunciado.push(linea);
    } else if (b && b.opciones.length > 0) {
      // Continuación de la última opción (texto partido en dos líneas, típico de PDF)
      const ultima = b.opciones[b.opciones.length - 1];
      const { texto, correcta } = quitarMarca(linea);
      ultima.texto = limpiar(`${ultima.texto} ${texto}`);
      ultima.correcta ||= correcta;
    } else {
      // Texto antes de la primera pregunta numerada (p. ej. un título): se ignora
      // salvo que parezca una pregunta sin número
      if (/[?¿]/.test(linea)) nuevo(null, linea);
    }
  }
  return bloques;
}

function recortar(texto: string, max: number, que: string, avisos: string[]) {
  if (texto.length <= max) return texto;
  avisos.push(`${que} recortado a ${max} caracteres.`);
  return texto.slice(0, max - 1).trimEnd() + "…";
}

function aPregunta(b: Bloque): PreguntaImportada | null {
  const avisos: string[] = [];
  let { texto: enunciado } = quitarMarca(b.enunciado.join(" "));
  enunciado = limpiar(enunciado);
  if (!enunciado && b.opciones.length === 0) return null;

  // Si todas las opciones usan "*" como viñeta, el asterisco no marca nada
  if (b.opciones.length > 1 && b.opciones.every((o) => o.estrella)) {
    for (const o of b.opciones) {
      o.correcta = false;
      o.marcada = false;
    }
  }

  // Línea "Respuesta: b" o "Respuesta: Júpiter"
  if (b.respuesta && b.opciones.length > 0) {
    const r = normalizar(b.respuesta.replace(/^\(?([a-h])\)?[.)]?$/i, "$1"));
    const porLetra = b.opciones.find((o) => o.letra && o.letra === r);
    const porTexto = b.opciones.find((o) => normalizar(o.texto) === r);
    // Opciones sin letra (viñetas) + "Respuesta: c" → la tercera
    const porPosicion = /^[a-h]$/.test(r) && b.opciones.every((o) => !o.letra) ? b.opciones[r.charCodeAt(0) - 97] : undefined;
    const elegida = porLetra ?? porTexto ?? porPosicion;
    if (elegida) b.opciones.forEach((o) => (o.correcta = o === elegida || o.marcada));
  }

  const textos = b.opciones.map((o) => normalizar(o.texto));
  const pareceVF =
    RE_ES_VF.test(enunciado) ||
    (b.opciones.length === 2 && textos.includes("verdadero") && textos.includes("falso")) ||
    (b.opciones.length === 0 && b.respuesta !== null && /^(v|f|verdadero|falso)$/i.test(normalizar(b.respuesta)));

  // ── Verdadero o falso ──
  if (pareceVF && (b.opciones.length === 0 || b.opciones.every((o) => ["verdadero", "falso", "v", "f"].includes(normalizar(o.texto))))) {
    const p = nuevaPregunta("verdadero_falso");
    p.enunciado = recortar(limpiar(enunciado.replace(RE_ES_VF, "")) || enunciado, MAX_ENUNCIADO, "Enunciado", avisos);
    let correcta: boolean | null = null;
    const marcada = b.opciones.find((o) => o.correcta);
    if (marcada) correcta = ["verdadero", "v"].includes(normalizar(marcada.texto));
    else if (b.respuesta) correcta = /^(v|verdadero)/i.test(normalizar(b.respuesta));
    if (correcta === null) avisos.push("No se marcó la respuesta: quedó «Verdadero». Revísala.");
    if (p.tipo === "verdadero_falso") p.datos = { correcta: correcta ?? true };
    return { pregunta: p, avisos };
  }

  // ── Respuesta corta ──
  if (b.opciones.length === 0) {
    const p = nuevaPregunta("respuesta_corta");
    p.enunciado = recortar(enunciado, MAX_ENUNCIADO, "Enunciado", avisos);
    if (p.tipo === "respuesta_corta") {
      const respuestas = (b.respuesta ?? "")
        .split(/\s*(?:\/|\bo\b|,|;)\s*/i)
        .map((r) => r.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((r) => recortar(r, MAX_RESPUESTA_CORTA, "Respuesta", avisos));
      p.datos = { respuestas: respuestas.length ? respuestas : [""] };
      if (!respuestas.length) avisos.push("Sin opciones ni «Respuesta:»: quedó como respuesta corta sin respuesta. Complétala.");
    }
    return { pregunta: p, avisos };
  }

  // ── Quiz (2–4 opciones) ──
  const p = nuevaPregunta("quiz");
  p.enunciado = recortar(enunciado, MAX_ENUNCIADO, "Enunciado", avisos);
  let opciones = b.opciones;
  if (opciones.length > 4) {
    // Conserva las correctas aunque estén después de la 4.ª
    const correctas = opciones.filter((o) => o.correcta);
    const resto = opciones.filter((o) => !o.correcta).slice(0, Math.max(0, 4 - correctas.length));
    opciones = opciones.filter((o) => correctas.includes(o) || resto.includes(o)).slice(0, 4);
    avisos.push(`Tenía ${b.opciones.length} opciones: se dejaron 4 (el máximo).`);
  }
  if (opciones.length === 1) {
    opciones = [...opciones, { letra: null, texto: "", correcta: false, marcada: false }];
    avisos.push("Solo tenía una opción: agrega otra.");
  }
  if (!opciones.some((o) => o.correcta)) avisos.push("No se marcó la respuesta correcta. Márcala en el editor.");
  if (p.tipo === "quiz") {
    p.datos = { opciones: opciones.map((o) => ({ texto: recortar(o.texto, MAX_OPCION, "Opción", avisos), correcta: o.correcta })) };
  }
  return { pregunta: p, avisos };
}

/** Convierte texto en preguntas. Devuelve también avisos por pregunta para la vista previa. */
export function importarPreguntas(texto: string): PreguntaImportada[] {
  return dividir(texto)
    .map(aPregunta)
    .filter((x): x is PreguntaImportada => x !== null);
}

/** Extrae el texto de un PDF (carga pdf.js solo cuando hace falta) */
export async function textoDePdf(archivo: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const { default: urlWorker } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker;
  const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const paginas: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const contenido = await pagina.getTextContent();
    // Reconstruye las líneas: pdf.js da trozos sueltos con su posición vertical
    let linea = "";
    const lineas: string[] = [];
    let yAnterior: number | null = null;
    for (const item of contenido.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      if (yAnterior !== null && Math.abs(y - yAnterior) > 2) {
        lineas.push(linea);
        linea = "";
      }
      linea += item.str;
      if (item.hasEOL) {
        lineas.push(linea);
        linea = "";
        yAnterior = null;
        continue;
      }
      yAnterior = y;
    }
    if (linea) lineas.push(linea);
    paginas.push(lineas.join("\n"));
  }
  await doc.destroy();
  return paginas.join("\n");
}
