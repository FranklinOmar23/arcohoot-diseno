export type Rareza = "comun" | "raro" | "epico";

export type IdPoder =
  | "doble"
  | "tiempo"
  | "cincuenta"
  | "escudo"
  | "segunda"
  | "niebla"
  | "revolver"
  | "congelar"
  | "robo";

export interface Poder {
  id: IdPoder;
  nombre: string;
  emoji: string;
  rareza: Rareza;
  descripcion: string;
  /** Los de ataque piden elegir rival y el Escudo los bloquea */
  ataque: boolean;
}

export const PODERES: Record<IdPoder, Poder> = {
  doble: { id: "doble", nombre: "Doble", emoji: "⚡", rareza: "comun", descripcion: "Tu próxima respuesta vale el doble.", ataque: false },
  tiempo: { id: "tiempo", nombre: "Tiempo extra", emoji: "⏱️", rareza: "comun", descripcion: "+5 segundos solo para ti en esta pregunta.", ataque: false },
  cincuenta: { id: "cincuenta", nombre: "50/50", emoji: "✂️", rareza: "comun", descripcion: "Quita dos opciones incorrectas.", ataque: false },
  escudo: { id: "escudo", nombre: "Escudo", emoji: "🛡️", rareza: "raro", descripcion: "Bloquea el próximo ataque que te lancen.", ataque: false },
  segunda: { id: "segunda", nombre: "Segunda oportunidad", emoji: "🔁", rareza: "raro", descripcion: "Si fallas, puedes responder otra vez.", ataque: false },
  niebla: { id: "niebla", nombre: "Niebla", emoji: "🌫️", rareza: "raro", descripcion: "Nubla las opciones de un rival por 5 s.", ataque: true },
  revolver: { id: "revolver", nombre: "Revolver", emoji: "🔀", rareza: "raro", descripcion: "Cambia de lugar los botones de un rival.", ataque: true },
  congelar: { id: "congelar", nombre: "Congelar", emoji: "❄️", rareza: "epico", descripcion: "Congela la pantalla de un rival 3 s.", ataque: true },
  robo: { id: "robo", nombre: "Robo", emoji: "💰", rareza: "epico", descripcion: "Roba el 10 % de los puntos de un rival.", ataque: true },
};

export const RAREZAS: Record<Rareza, { nombre: string; gemas: string }> = {
  comun: { nombre: "Común", gemas: "◆" },
  raro: { nombre: "Raro", gemas: "◆◆" },
  epico: { nombre: "Épico", gemas: "◆◆◆" },
};
