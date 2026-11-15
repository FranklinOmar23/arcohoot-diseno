import "./Logo.css";

const medidas = {
  sm: { ancho: 51, alto: 32, texto: 26 }, // barra del anfitrión (H1)
  md: { ancho: 90, alto: 56, texto: 40 }, // pantallas de entrada (J1)
  lg: { ancho: 86, alto: 54, texto: 48 }, // portada del sistema (Main)
};

interface Props {
  tamano?: keyof typeof medidas;
  /** Apila el arco sobre el texto, como en la pantalla de entrada */
  apilado?: boolean;
  /** Solo el arco, sin la palabra */
  soloMarca?: boolean;
  /** Texto claro, para fondos añil (cabecera de H4) */
  claro?: boolean;
  /** Ancho del arco en px, si no sirve ninguno de los tamaños */
  anchoMarca?: number;
}

export function Logo({ tamano = "sm", apilado = false, soloMarca = false, claro = false, anchoMarca }: Props) {
  const m = anchoMarca ? { ancho: anchoMarca, alto: (anchoMarca * 30) / 48, texto: 0 } : medidas[tamano];
  return (
    <span
      className={`ah-logo${apilado ? " ah-logo--apilado" : ""}${claro ? " ah-logo--claro" : ""}`}
      role={soloMarca ? "img" : undefined}
      aria-label={soloMarca ? "ArcoHoot" : undefined}
    >
      <svg width={m.ancho} height={m.alto} viewBox="0 0 48 30" fill="none" strokeLinecap="round" aria-hidden="true">
        <path d="M4 27a20 20 0 0 1 40 0" stroke="var(--arco)" strokeWidth="5.5" />
        <path d="M11 27a13 13 0 0 1 26 0" stroke="var(--sol)" strokeWidth="5.5" />
        <path d="M18 27a6 6 0 0 1 12 0" stroke="var(--laguna)" strokeWidth="5.5" />
        <circle cx="24" cy="27" r="2.6" fill="var(--anil)" />
      </svg>
      {!soloMarca && (
        <span className="ah-logo__texto f" style={{ fontSize: m.texto }}>
          Arco<span className="ah-logo__hoot">Hoot</span>
        </span>
      )}
    </span>
  );
}
