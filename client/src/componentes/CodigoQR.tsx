import { useMemo } from "react";
import qrcode from "qrcode-generator";

interface Props {
  texto: string;
  tamano?: number;
  etiqueta: string;
}

/** Código QR en SVG con el color de la tinta */
export function CodigoQR({ texto, tamano = 160, etiqueta }: Props) {
  const { n, camino } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { n, camino: d };
  }, [texto]);

  return (
    <svg width={tamano} height={tamano} viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label={etiqueta} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill="var(--papel)" />
      <path d={camino} fill="var(--tinta)" />
    </svg>
  );
}
