import type { NombreIcono } from "../componentes/Icono";

// Modelo de pregunta compartido por el editor y el juego. Debe coincidir con server/src/preguntas.ts

export interface OpcionQuiz {
  texto: string;
  correcta: boolean;
}

export type DatosPorTipo = {
  quiz: { opciones: OpcionQuiz[] };
  verdadero_falso: { correcta: boolean };
  respuesta_corta: { respuestas: string[] };
  deslizante: { min: number; max: number; paso: number; correcta: number; margen: number; unidad: string };
  /** a = alto / ancho de la imagen (para revisar el pin en la misma escala) */
  pin: { zona: { x: number; y: number; r: number; a?: number } };
  puzzle: { elementos: string[] };
};

export type TipoPregunta = keyof DatosPorTipo;

interface PreguntaBase<T extends TipoPregunta> {
  /** Solo en el cliente, para las keys de React */
  clave: string;
  tipo: T;
  enunciado: string;
  tiempo: number;
  puntosDobles: boolean;
  imagen: string | null;
  datos: DatosPorTipo[T];
}

export type Pregunta = { [T in TipoPregunta]: PreguntaBase<T> }[TipoPregunta];

export const TIPOS: { id: TipoPregunta; nombre: string; icono: NombreIcono }[] = [
  { id: "quiz", nombre: "Quiz", icono: "tipo-quiz" },
  { id: "verdadero_falso", nombre: "Verdadero o falso", icono: "tipo-vf" },
  { id: "respuesta_corta", nombre: "Respuesta corta", icono: "tipo-corta" },
  { id: "deslizante", nombre: "Control deslizante", icono: "tipo-deslizante" },
  { id: "pin", nombre: "Respuesta con pin", icono: "tipo-pin" },
  { id: "puzzle", nombre: "Puzzle (ordenar)", icono: "tipo-puzzle" },
];

export const infoTipo = (t: TipoPregunta) => TIPOS.find((x) => x.id === t)!;
/** Nombre corto para la lista lateral ("Puzzle" en vez de "Puzzle (ordenar)") */
export const nombreCortoTipo = (t: TipoPregunta) => infoTipo(t).nombre.replace(" (ordenar)", "");

export const TIEMPOS = [10, 20, 30, 60];
export const MAX_ENUNCIADO = 160;
export const MAX_OPCION = 90;
export const MAX_RESPUESTA_CORTA = 20;
export const MAX_ELEMENTO_PUZZLE = 60;

let contador = 0;
export const nuevaClave = () => `p${Date.now().toString(36)}${(contador++).toString(36)}`;

export function datosIniciales<T extends TipoPregunta>(tipo: T): DatosPorTipo[T] {
  const d: DatosPorTipo = {
    quiz: { opciones: [0, 1, 2, 3].map((i) => ({ texto: "", correcta: i === 0 })) },
    verdadero_falso: { correcta: true },
    respuesta_corta: { respuestas: [""] },
    deslizante: { min: 0, max: 100, paso: 1, correcta: 50, margen: 0, unidad: "" },
    pin: { zona: { x: 50, y: 50, r: 10 } },
    puzzle: { elementos: ["", "", "", ""] },
  };
  return d[tipo];
}

export function nuevaPregunta(tipo: TipoPregunta = "quiz"): Pregunta {
  return {
    clave: nuevaClave(),
    tipo,
    enunciado: "",
    tiempo: tipo === "puzzle" ? 30 : 20,
    puntosDobles: false,
    imagen: null,
    datos: datosIniciales(tipo),
  } as Pregunta;
}

/** Cambia el tipo conservando lo que se pueda (enunciado, imagen, textos de opciones) */
export function cambiarTipo(p: Pregunta, tipo: TipoPregunta): Pregunta {
  if (p.tipo === tipo) return p;
  const textos =
    p.tipo === "quiz" ? p.datos.opciones.map((o) => o.texto) : p.tipo === "puzzle" ? p.datos.elementos : [];
  const base = { ...p, tipo, datos: datosIniciales(tipo) } as Pregunta;
  if (base.tipo === "quiz" && textos.length) {
    base.datos.opciones = base.datos.opciones.map((o, i) => ({ ...o, texto: textos[i] ?? "" }));
  }
  if (base.tipo === "puzzle" && textos.length) {
    base.datos.elementos = base.datos.elementos.map((e, i) => (textos[i] ?? e).slice(0, MAX_ELEMENTO_PUZZLE));
  }
  return base;
}

/** Lo que le falta a la pregunta para poder jugarse. Vacío = lista. */
export function problemas(p: Pregunta): string[] {
  const f: string[] = [];
  if (!p.enunciado.trim()) f.push("Escribe el enunciado.");
  switch (p.tipo) {
    case "quiz":
      if (p.datos.opciones.some((o) => !o.texto.trim())) f.push("Completa todas las opciones.");
      if (!p.datos.opciones.some((o) => o.correcta)) f.push("Marca al menos una respuesta correcta.");
      break;
    case "respuesta_corta":
      if (!p.datos.respuestas.some((r) => r.trim())) f.push("Escribe al menos una respuesta aceptada.");
      break;
    case "deslizante": {
      const d = p.datos;
      if (!(d.min < d.max)) f.push("El mínimo debe ser menor que el máximo.");
      else if (d.correcta < d.min || d.correcta > d.max) f.push("La respuesta correcta debe estar dentro del rango.");
      break;
    }
    case "pin":
      if (!p.imagen) f.push("Sube una imagen para poner el pin.");
      break;
    case "puzzle":
      if (p.datos.elementos.some((e) => !e.trim())) f.push("Completa todos los pasos.");
      break;
  }
  return f;
}

/** Quita la clave local antes de enviar al servidor */
export const aServidor = ({ clave: _c, ...p }: Pregunta) => p;
