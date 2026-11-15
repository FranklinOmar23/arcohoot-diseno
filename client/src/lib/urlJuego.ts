import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * Dirección que los jugadores abren en el celular.
 * Si el anfitrión entró por localhost, se cambia por la IP de la red local (solo en desarrollo).
 */
export function useUrlJuego(pin: string) {
  const [base, setBase] = useState(window.location.origin);

  useEffect(() => {
    const { hostname, port, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return;
    api<{ ips: string[] }>("/red")
      .then(({ ips }) => {
        const ip = ips.find((i) => i.startsWith("192.168.")) ?? ips.find((i) => i.startsWith("10.")) ?? ips[0];
        if (ip) setBase(`${protocol}//${ip}${port ? `:${port}` : ""}`);
      })
      .catch(() => {});
  }, []);

  return { base, url: `${base}/jugar?pin=${pin}` };
}

/** "482913" → "482 913" */
export const formatoPin = (pin: string) => (pin.length > 3 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin);
