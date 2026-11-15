import { esquemaDatos, type PreguntaEntrada } from "../preguntas.js";

// Reglas puras del juego: qué ve cada pantalla, cómo se revisa cada tipo y cuántos puntos da.
// Sin estado ni sockets: así se puede probar aparte.

type Datos<T extends keyof typeof esquemaDatos> = ReturnType<(typeof esquemaDatos)[T]["parse"]>;
const datos = <T extends keyof typeof esquemaDatos>(p: PreguntaEntrada, t: T) => p.datos as Datos<T>;

export const PUNTOS_BASE = 1000;
export const BONO_RACHA = 100;
export const MAX_BONO_RACHA = 500;

/** "Á  rbol " → "arbol": sin tildes, mayúsculas ni espacios de más */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Mezcla determinista para que todos los jugadores vean el mismo orden revuelto */
export function mezcla(n: number, semilla: number): number[] {
  const orden = Array.from({ length: n }, (_, i) => i);
  let s = semilla || 1;
  const azar = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  // Nunca dejar el puzzle ya resuelto
  if (n > 1 && orden.every((v, i) => v === i)) orden.push(orden.shift()!);
  return orden;
}

/** Lo que se proyecta en la pantalla grande mientras corre la pregunta (sin respuestas correctas) */
export function vistaAnfitrion(p: PreguntaEntrada) {
  const base = { tipo: p.tipo, enunciado: p.enunciado, imagen: p.imagen, tiempo: p.tiempo, puntosDobles: p.puntosDobles };
  switch (p.tipo) {
    case "quiz":
      return { ...base, opciones: datos(p, "quiz").opciones.map((o) => o.texto) };
    case "deslizante": {
      const d = datos(p, "deslizante");
      return { ...base, min: d.min, max: d.max, unidad: d.unidad };
    }
    case "puzzle":
      return { ...base, numElementos: datos(p, "puzzle").elementos.length };
    default:
      return base;
  }
}

/** Lo que ve el jugador en el celular */
export function vistaJugador(p: PreguntaEntrada, orden: number[]) {
  const base = { tipo: p.tipo, enunciado: p.enunciado, tiempo: p.tiempo, puntosDobles: p.puntosDobles };
  switch (p.tipo) {
    case "quiz":
      return { ...base, opciones: datos(p, "quiz").opciones.map((o) => o.texto) };
    case "verdadero_falso":
    case "respuesta_corta":
      return base;
    case "deslizante": {
      const d = datos(p, "deslizante");
      return { ...base, min: d.min, max: d.max, paso: d.paso, unidad: d.unidad };
    }
    case "pin":
      return { ...base, imagen: p.imagen };
    case "puzzle": {
      const els = datos(p, "puzzle").elementos;
      // id = posición correcta; el jugador los recibe revueltos
      return { ...base, elementos: orden.map((id) => ({ id, texto: els[id] })) };
    }
  }
}

export interface Evaluacion {
  correcta: boolean;
  /** Texto legible de lo que respondió (para el Excel) */
  texto: string;
  /** Valor normalizado para las estadísticas */
  valor: unknown;
}

/** Revisa una respuesta. Devuelve null si el valor no tiene la forma esperada. */
export function evaluar(p: PreguntaEntrada, valor: unknown): Evaluacion | null {
  switch (p.tipo) {
    case "quiz": {
      const ops = datos(p, "quiz").opciones;
      if (!Number.isInteger(valor) || (valor as number) < 0 || (valor as number) >= ops.length) return null;
      const i = valor as number;
      return { correcta: ops[i].correcta, texto: ops[i].texto, valor: i };
    }
    case "verdadero_falso": {
      if (typeof valor !== "boolean") return null;
      return { correcta: valor === datos(p, "verdadero_falso").correcta, texto: valor ? "Verdadero" : "Falso", valor };
    }
    case "respuesta_corta": {
      if (typeof valor !== "string") return null;
      const t = valor.slice(0, 20).trim();
      if (!t) return null;
      const n = normalizar(t);
      const ok = datos(p, "respuesta_corta").respuestas.some((r) => r.trim() && normalizar(r) === n);
      return { correcta: ok, texto: t, valor: n };
    }
    case "deslizante": {
      const d = datos(p, "deslizante");
      if (typeof valor !== "number" || !Number.isFinite(valor) || valor < d.min || valor > d.max) return null;
      return {
        correcta: Math.abs(valor - d.correcta) <= d.margen + 1e-9,
        texto: `${valor}${d.unidad ? ` ${d.unidad}` : ""}`,
        valor,
      };
    }
    case "pin": {
      const v = valor as { x?: unknown; y?: unknown } | null;
      if (!v || typeof v.x !== "number" || typeof v.y !== "number") return null;
      const x = Math.max(0, Math.min(100, v.x));
      const y = Math.max(0, Math.min(100, v.y));
      const z = datos(p, "pin").zona;
      // x, y y r están en % del ancho; y se pasa a la misma escala con la proporción
      const a = z.a ?? 1;
      const dist = Math.hypot(x - z.x, (y - z.y) * a);
      return { correcta: dist <= z.r, texto: `(${Math.round(x)} %, ${Math.round(y)} %)`, valor: { x, y } };
    }
    case "puzzle": {
      const els = datos(p, "puzzle").elementos;
      if (!Array.isArray(valor) || valor.length !== els.length) return null;
      const ids = valor as unknown[];
      if (!ids.every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < els.length)) return null;
      if (new Set(ids).size !== els.length) return null;
      return {
        correcta: (ids as number[]).every((v, i) => v === i),
        texto: (ids as number[]).map((i) => els[i]).join(" → "),
        valor: ids,
      };
    }
  }
}

/**
 * Puntos: 500–1000 según la rapidez (1000 al instante, 500 al último segundo),
 * más 100 por cada acierto seguido desde el segundo (máx. +500). Puntos dobles multiplica todo.
 */
export function puntuar(correcta: boolean, ms: number, duracionMs: number, rachaNueva: number, dobles: boolean) {
  if (!correcta) return 0;
  const fraccion = Math.max(0, Math.min(1, ms / duracionMs));
  const rapidez = Math.round(PUNTOS_BASE * (1 - fraccion / 2));
  const bono = Math.min(MAX_BONO_RACHA, Math.max(0, rachaNueva - 1) * BONO_RACHA);
  return (rapidez + bono) * (dobles ? 2 : 1);
}

/** Texto (y forma, si aplica) de la respuesta correcta para la pantalla "¡Casi!" */
export function respuestaCorrecta(p: PreguntaEntrada): { texto: string; forma: number | null } {
  switch (p.tipo) {
    case "quiz": {
      const ops = datos(p, "quiz").opciones;
      const i = ops.findIndex((o) => o.correcta);
      return { texto: ops.filter((o) => o.correcta).map((o) => o.texto).join(" o "), forma: i };
    }
    case "verdadero_falso": {
      const v = datos(p, "verdadero_falso").correcta;
      // Verdadero = círculo (2), Falso = rombo (1)
      return { texto: v ? "Verdadero" : "Falso", forma: v ? 2 : 1 };
    }
    case "respuesta_corta":
      return { texto: datos(p, "respuesta_corta").respuestas.find((r) => r.trim()) ?? "", forma: null };
    case "deslizante": {
      const d = datos(p, "deslizante");
      const u = d.unidad ? ` ${d.unidad}` : "";
      return { texto: `${d.correcta}${u}${d.margen ? ` (±${d.margen})` : ""}`, forma: null };
    }
    case "pin":
      return { texto: "La zona marcada en la pantalla grande", forma: null };
    case "puzzle":
      return { texto: datos(p, "puzzle").elementos.join(" → "), forma: null };
  }
}

/** Estadísticas para la pantalla de resultado (H6 / H7) */
export function estadisticas(p: PreguntaEntrada, respuestas: { valor: unknown; texto: string; correcta: boolean }[]) {
  const aciertos = respuestas.filter((r) => r.correcta).length;
  switch (p.tipo) {
    case "quiz": {
      const n = datos(p, "quiz").opciones.length;
      const conteos = Array.from({ length: n }, (_, i) => respuestas.filter((r) => r.valor === i).length);
      return { aciertos, conteos };
    }
    case "verdadero_falso":
      return { aciertos, conteos: [respuestas.filter((r) => r.valor === true).length, respuestas.filter((r) => r.valor === false).length] };
    case "respuesta_corta": {
      const grupos = new Map<string, { texto: string; n: number; correcta: boolean }>();
      for (const r of respuestas) {
        const g = grupos.get(r.valor as string) ?? { texto: r.texto, n: 0, correcta: r.correcta };
        g.n++;
        grupos.set(r.valor as string, g);
      }
      return { aciertos, grupos: [...grupos.values()].sort((a, b) => b.n - a.n).slice(0, 6) };
    }
    case "deslizante": {
      const d = datos(p, "deslizante");
      const NUM = 12;
      const ancho = (d.max - d.min) / NUM || 1;
      const casilla = (v: number) => Math.min(NUM - 1, Math.max(0, Math.floor((v - d.min) / ancho)));
      const barras = Array(NUM).fill(0) as number[];
      for (const r of respuestas) barras[casilla(r.valor as number)]++;
      const valores = respuestas.map((r) => r.valor as number);
      const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
      return { aciertos, barras, casillaCorrecta: casilla(d.correcta), promedio, min: d.min, max: d.max, correcta: d.correcta, margen: d.margen, unidad: d.unidad };
    }
    case "pin":
      return { aciertos, puntos: respuestas.slice(0, 500).map((r) => r.valor as { x: number; y: number }), zona: datos(p, "pin").zona };
    case "puzzle":
      return { aciertos, elementos: datos(p, "puzzle").elementos };
  }
}
