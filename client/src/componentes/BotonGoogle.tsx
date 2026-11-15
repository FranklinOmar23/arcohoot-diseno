import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

// Google Identity Services: https://developers.google.com/identity/gsi/web
interface GoogleId {
  initialize(opciones: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: "popup"; use_fedcm_for_prompt?: boolean }): void;
  renderButton(el: HTMLElement, opciones: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let cargaScript: Promise<void> | null = null;
function cargarGoogle() {
  cargaScript ??= new Promise((resolver, rechazar) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => {
      cargaScript = null;
      rechazar(new Error("No se pudo cargar Google."));
    };
    document.head.appendChild(s);
  });
  return cargaScript;
}

let configPromesa: Promise<string | null> | null = null;
const leerConfig = () =>
  (configPromesa ??= api<{ googleClientId: string | null }>("/auth/config")
    .then((r) => r.googleClientId)
    .catch(() => null));

interface Props {
  texto: "signin_with" | "signup_with" | "continue_with";
  onCredencial: (credencial: string) => void;
}

/** Botón oficial "Continuar con Google". No se muestra si el servidor no tiene GOOGLE_CLIENT_ID. */
export function BotonGoogle({ texto, onCredencial }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [fallo, setFallo] = useState(false);
  const callback = useRef(onCredencial);
  callback.current = onCredencial;

  useEffect(() => {
    void leerConfig().then(setClientId);
  }, []);

  useEffect(() => {
    if (!clientId || !contenedor.current) return;
    let vivo = true;
    cargarGoogle()
      .then(() => {
        if (!vivo || !contenedor.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => callback.current(r.credential),
          ux_mode: "popup",
        });
        const ancho = Math.min(400, contenedor.current.offsetWidth || 320);
        window.google.accounts.id.renderButton(contenedor.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: texto,
          logo_alignment: "center",
          locale: "es",
          width: ancho,
        });
      })
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [clientId, texto]);

  if (!clientId) return null;
  return (
    <div className="boton-google">
      <div className="boton-google__separador" aria-hidden="true">
        <span>o</span>
      </div>
      <div ref={contenedor} className="boton-google__contenedor" />
      {fallo && <p className="meta">No se pudo cargar el botón de Google. Revisa tu conexión.</p>}
    </div>
  );
}
