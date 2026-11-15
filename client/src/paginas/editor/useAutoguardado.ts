import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error";

/**
 * Guarda automáticamente 1 s después del último cambio.
 * `version` sube en cada edición; si llega un cambio mientras se guarda, vuelve a guardar al terminar.
 */
export function useAutoguardado(version: number, guardar: () => Promise<void>, espera = 1000) {
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");
  const [error, setError] = useState("");
  const guardada = useRef(version);
  const enCurso = useRef<Promise<void> | null>(null);
  const fnGuardar = useRef(guardar);
  fnGuardar.current = guardar;
  const versionActual = useRef(version);
  versionActual.current = version;

  const guardarAhora = useCallback(async (): Promise<boolean> => {
    if (enCurso.current) await enCurso.current.catch(() => {});
    const v = versionActual.current;
    if (v === guardada.current) return true;
    setEstado("guardando");
    const p = fnGuardar.current();
    enCurso.current = p;
    try {
      await p;
      guardada.current = v;
      setError("");
      setEstado(versionActual.current === v ? "guardado" : "pendiente");
      return true;
    } catch (e) {
      setError((e as Error).message);
      setEstado("error");
      return false;
    } finally {
      enCurso.current = null;
    }
  }, []);

  useEffect(() => {
    if (version === guardada.current) return;
    setEstado((e) => (e === "guardando" ? e : "pendiente"));
    const t = setTimeout(() => void guardarAhora(), espera);
    return () => clearTimeout(t);
  }, [version, espera, guardarAhora]);

  // Avisa antes de cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (versionActual.current !== guardada.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

  return { estado, error, guardarAhora };
}
