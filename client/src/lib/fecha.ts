const DIA = 24 * 60 * 60 * 1000;

/** "hace un momento", "hoy", "ayer", "hace 2 días", "hace 1 semana", "hace 1 mes"… */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const diff = ahora - new Date(iso).getTime();
  if (diff < 60 * 1000) return "hace un momento";
  if (diff < 60 * 60 * 1000) {
    const m = Math.floor(diff / 60000);
    return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  const dias = Math.floor(diff / DIA);
  if (dias < 1) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) {
    const s = Math.floor(dias / 7);
    return `hace ${s} ${s === 1 ? "semana" : "semanas"}`;
  }
  if (dias < 365) {
    const m = Math.floor(dias / 30);
    return `hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  const a = Math.floor(dias / 365);
  return `hace ${a} ${a === 1 ? "año" : "años"}`;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
