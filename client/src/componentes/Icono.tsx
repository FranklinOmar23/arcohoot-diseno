// Íconos de trazo del sistema (stroke 2.6, puntas redondeadas)
export type NombreIcono =
  | "mas"
  | "jugar"
  | "exportar"
  | "buscar"
  | "jugadores"
  | "correcto"
  | "incorrecto"
  | "salir"
  | "ojo"
  | "imagen"
  | "basura"
  | "atras"
  | "adelante"
  | "copiar"
  | "importar"
  | "candado"
  | "candado-abierto"
  | "subir"
  | "bajar"
  | "tipo-quiz"
  | "tipo-vf"
  | "tipo-corta"
  | "tipo-deslizante"
  | "tipo-pin"
  | "tipo-puzzle";

const trazos: Record<NombreIcono, JSX.Element> = {
  mas: <path d="M12 5v14M5 12h14" />,
  jugar: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />,
  exportar: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  jugadores: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2" />
    </>
  ),
  correcto: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  incorrecto: <path d="M6 6l12 12M18 6 6 18" />,
  salir: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  ojo: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  imagen: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  basura: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
  adelante: <path d="M5 12h14M13 6l6 6-6 6" />,
  copiar: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  importar: <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />,
  candado: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "candado-abierto": (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  subir: <path d="m6 15 6-6 6 6" />,
  bajar: <path d="m6 9 6 6 6-6" />,
  "tipo-quiz": (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </>
  ),
  "tipo-vf": <path d="m2.5 12 3 3 5-6M14 9l6 6M20 9l-6 6" />,
  "tipo-corta": <path d="M5 6h14M12 6v13" />,
  "tipo-deslizante": (
    <>
      <path d="M3 12h18" />
      <circle cx="14" cy="12" r="3.5" fill="var(--papel)" />
    </>
  ),
  "tipo-pin": (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  "tipo-puzzle": (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 5v3M3.5 12h1.5l-1.5 2h1.5M3.5 17h1.5v2h-1.5" />
    </>
  ),
};

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  grosor?: number;
}

export function Icono({ nombre, tamano = 22, grosor = 2.6 }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazos[nombre]}
    </svg>
  );
}
