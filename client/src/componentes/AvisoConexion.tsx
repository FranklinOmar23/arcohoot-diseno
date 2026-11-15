import { useEffect, useState } from "react";
import { obtenerSocket } from "../lib/socket";

/** Franja "Reconectando…" cuando se pierde la conexión con el juego (tras 1,5 s, para no parpadear) */
export function AvisoConexion() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const socket = obtenerSocket();
    let espera: ReturnType<typeof setTimeout> | null = null;
    const caida = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => setVisible(true), 1500);
    };
    const vuelta = () => {
      if (espera) clearTimeout(espera);
      espera = null;
      setVisible(false);
    };
    socket.on("disconnect", caida);
    socket.on("connect_error", caida);
    socket.on("connect", vuelta);
    return () => {
      if (espera) clearTimeout(espera);
      socket.off("disconnect", caida);
      socket.off("connect_error", caida);
      socket.off("connect", vuelta);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "var(--sol)",
        color: "var(--sobre-claro)",
        border: "var(--borde-grueso)",
        borderRadius: "var(--radius-pill)",
        boxShadow: "var(--sombra-boton)",
        padding: "8px 18px",
        fontWeight: 900,
        fontSize: "var(--fs-pequeno)",
        whiteSpace: "nowrap",
      }}
    >
      <span className="blink" aria-hidden="true">
        ●
      </span>{" "}
      Reconectando…
    </div>
  );
}
