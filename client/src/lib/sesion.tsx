import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Usuario } from "./api";

interface ContextoSesion {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  registrar: (nombre: string, correo: string, clave: string) => Promise<void>;
  entrarConGoogle: (credencial: string) => Promise<void>;
  salir: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api<{ usuario: Usuario | null }>("/auth/yo")
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const entrar = useCallback(async (correo: string, clave: string) => {
    const r = await api<{ usuario: Usuario }>("/auth/entrar", { metodo: "POST", cuerpo: { correo, clave } });
    setUsuario(r.usuario);
  }, []);

  const registrar = useCallback(async (nombre: string, correo: string, clave: string) => {
    const r = await api<{ usuario: Usuario }>("/auth/registro", { metodo: "POST", cuerpo: { nombre, correo, clave } });
    setUsuario(r.usuario);
  }, []);

  const entrarConGoogle = useCallback(async (credencial: string) => {
    const r = await api<{ usuario: Usuario }>("/auth/google", { metodo: "POST", cuerpo: { credencial } });
    setUsuario(r.usuario);
  }, []);

  const salir = useCallback(async () => {
    await api("/auth/salir", { metodo: "POST" }).catch(() => {});
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, registrar, entrarConGoogle, salir }),
    [usuario, cargando, entrar, registrar, entrarConGoogle, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>");
  return c;
}
