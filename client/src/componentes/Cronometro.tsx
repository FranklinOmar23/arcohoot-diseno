interface Props {
  restante: number;
  total: number;
  /** Diámetro en px (168 en la pantalla del anfitrión) */
  tamano?: number;
}

/** Anillo de cuenta atrás: pista de línea, progreso sol, doble contorno de tinta */
export function Cronometro({ restante, total, tamano = 168 }: Props) {
  const grosor = tamano / 12;
  const c = tamano / 2;
  const r = c - grosor / 2;
  const circunferencia = 2 * Math.PI * r;
  const fraccion = total > 0 ? Math.max(0, Math.min(1, restante / total)) : 0;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Quedan ${restante} segundos`}
      style={{ position: "relative", width: tamano, height: tamano, flex: "none" }}
    >
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="var(--papel)" stroke="var(--linea)" strokeWidth={grosor} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--sol)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${circunferencia * fraccion} ${circunferencia}`}
          style={{ transition: "stroke-dasharray 1s linear" }}
        />
        <circle cx={c} cy={c} r={c} fill="none" stroke="var(--borde)" strokeWidth="3" />
        <circle cx={c} cy={c} r={r - grosor / 2} fill="none" stroke="var(--borde)" strokeWidth="3" />
      </svg>
      <span
        className="f"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: Math.round(tamano * 0.38),
        }}
      >
        {restante}
      </span>
    </div>
  );
}
