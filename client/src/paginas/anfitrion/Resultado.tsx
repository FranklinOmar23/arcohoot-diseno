import { Boton, Chip, Forma, FORMAS, Icono, Logo } from "../../componentes";
import type { NombreForma } from "../../componentes/Forma";
import { infoTipo, type DatosPorTipo } from "../../juego/preguntas";
import type { PantallaResultadoAnfitrion, Stats } from "../../lib/juego";

interface Props {
  pantalla: PantallaResultadoAnfitrion;
  onSiguiente: () => void;
}

function Check({ tamano = 22 }: { tamano?: number }) {
  return (
    <span className="res-check" aria-hidden="true">
      <Icono nombre="correcto" tamano={tamano} grosor={3.4} />
    </span>
  );
}

/** H6 · Barras por opción (Quiz y Verdadero o falso) */
function Barras({ s }: { s: PantallaResultadoAnfitrion }) {
  const p = s.pregunta;
  const stats = s.stats as Extract<Stats, { conteos: number[] }>;
  const esVF = p.tipo === "verdadero_falso";
  const textos = esVF ? ["Verdadero", "Falso"] : (p.opciones ?? []);
  const formas: readonly NombreForma[] = esVF ? ["circulo", "rombo"] : FORMAS;
  const correctas = esVF
    ? [(p.datos as DatosPorTipo["verdadero_falso"]).correcta, !(p.datos as DatosPorTipo["verdadero_falso"]).correcta]
    : (p.datos as DatosPorTipo["quiz"]).opciones.map((o) => o.correcta);
  const max = Math.max(1, ...stats.conteos);
  const resumen = textos.map((t, i) => `${t} ${stats.conteos[i]}${correctas[i] ? " (correcta)" : ""}`).join(", ");

  return (
    <>
      <div className="res-barras" style={{ gridTemplateColumns: `repeat(${textos.length}, minmax(0, 1fr))` }} role="img" aria-label={`Respuestas: ${resumen}`}>
        {textos.map((_, i) => (
          <div key={i} className="res-barras__col">
            <span className="f pop res-barras__num" style={{ animationDelay: `${0.8 + i * 0.1}s` }}>
              {correctas[i] && <Check />}
              {stats.conteos[i]}
            </span>
            <div
              className={`grow ah-op--${formas[i]} res-barras__barra${correctas[i] ? "" : " res-barras__barra--apagada"}`}
              style={{ animationDelay: `${i * 0.1}s`, height: `${Math.max(4, (stats.conteos[i] / max) * 100)}%` }}
            >
              <Forma forma={formas[i]} tamano={30} />
            </div>
          </div>
        ))}
      </div>
      <div className="res-etiquetas" style={{ gridTemplateColumns: `repeat(${textos.length}, minmax(0, 1fr))` }}>
        {textos.map((t, i) => (
          <div key={i} className={`ah-op res-etiqueta${correctas[i] ? ` ah-op--${formas[i]} res-etiqueta--correcta` : ""}`}>
            <Forma forma={formas[i]} tamano={28} color={correctas[i] ? "currentColor" : `var(--op-${formas[i]})`} />
            <span>{t}</span>
            {correctas[i] && <span className="sr">(correcta)</span>}
          </div>
        ))}
      </div>
    </>
  );
}

/** H7 · Histograma (Control deslizante) */
function Histograma({ s }: { s: PantallaResultadoAnfitrion }) {
  const st = s.stats as Extract<Stats, { barras: number[] }>;
  const max = Math.max(1, ...st.barras);
  const u = st.unidad ? ` ${st.unidad}` : "";
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((st.min + f * (st.max - st.min)) * 10) / 10);
  return (
    <section className="ah-card res-panel">
      <div className="res-panel__chips">
        <Chip color="exito" icono={<Icono nombre="correcto" tamano={16} grosor={3} />}>
          Respuesta: {st.correcta}
          {u}
        </Chip>
        {st.promedio !== null && (
          <Chip>
            Promedio del grupo: {Math.round(st.promedio * 10) / 10}
            {u}
          </Chip>
        )}
      </div>
      <div className="res-histo" role="img" aria-label={`Histograma de respuestas entre ${st.min} y ${st.max}${u}`}>
        {st.barras.map((n, i) => (
          <div key={i} className="res-histo__col">
            <span className="f res-histo__num">{n || ""}</span>
            <div
              className={`grow res-histo__barra${i === st.casillaCorrecta ? " res-histo__barra--ok" : ""}`}
              style={{ animationDelay: `${i * 0.06}s`, height: n ? `${(n / max) * 100}%` : 6 }}
            />
          </div>
        ))}
      </div>
      <div className="meta res-histo__eje">
        {marcas.map((m, i) => (
          <span key={i}>
            {m}
            {u}
          </span>
        ))}
      </div>
      <p className="meta" style={{ color: "var(--tinta)" }}>
        {st.aciertos} de {s.jugadores} {st.margen ? `quedaron a ±${st.margen}${u} de la respuesta.` : "acertaron el valor exacto."}
      </p>
    </section>
  );
}

/** H7 · Mapa de calor (Respuesta con pin) */
function MapaCalor({ s }: { s: PantallaResultadoAnfitrion }) {
  const st = s.stats as Extract<Stats, { puntos: { x: number; y: number }[] }>;
  return (
    <section className="ah-card res-panel">
      <div className="res-mapa">
        <div className="res-mapa__lienzo">
          {s.pregunta.imagen && <img src={s.pregunta.imagen} alt="" />}
          {st.puntos.map((pt, i) => (
            <span key={i} className="res-mapa__calor" style={{ left: `${pt.x}%`, top: `${pt.y}%` }} aria-hidden="true" />
          ))}
          <span
            className="res-mapa__zona"
            style={{ left: `${st.zona.x}%`, top: `${st.zona.y}%`, width: `${st.zona.r * 2}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="res-mapa__pie">
        <span className="meta">Pocos</span>
        <span aria-hidden="true" className="res-mapa__escala" />
        <span className="meta">Muchos toques</span>
        <div style={{ flex: 1 }} />
        <Chip color="exito" icono={<Icono nombre="correcto" tamano={16} grosor={3} />}>
          {st.aciertos} de {s.jugadores} en la zona
        </Chip>
      </div>
    </section>
  );
}

/** Respuesta corta: respuestas más repetidas */
function Palabras({ s }: { s: PantallaResultadoAnfitrion }) {
  const st = s.stats as Extract<Stats, { grupos: unknown[] }>;
  const aceptadas = (s.pregunta.datos as DatosPorTipo["respuesta_corta"]).respuestas.filter((r) => r.trim());
  const max = Math.max(1, ...st.grupos.map((g) => g.n));
  return (
    <section className="ah-card res-panel">
      <div className="res-panel__chips">
        <Chip color="exito" icono={<Icono nombre="correcto" tamano={16} grosor={3} />}>
          Aceptadas: {aceptadas.join(" · ")}
        </Chip>
      </div>
      {st.grupos.length === 0 ? (
        <p className="f res-vacio">Nadie respondió.</p>
      ) : (
        <ol className="res-palabras">
          {st.grupos.map((g, i) => (
            <li key={i} className="res-palabras__fila">
              <span className="f res-palabras__texto">
                {g.correcta && <Check tamano={18} />}
                {g.texto}
              </span>
              <span className="res-palabras__pista">
                <span className={`grow res-palabras__barra${g.correcta ? " res-palabras__barra--ok" : ""}`} style={{ width: `${(g.n / max) * 100}%`, animationDelay: `${i * 0.08}s` }} />
              </span>
              <span className="f res-palabras__num">{g.n}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Puzzle: orden correcto */
function Orden({ s }: { s: PantallaResultadoAnfitrion }) {
  const st = s.stats as Extract<Stats, { elementos: string[] }>;
  return (
    <section className="ah-card res-panel">
      <ol className="res-orden">
        {st.elementos.map((e, i) => (
          <li key={i} className="rise res-orden__paso" style={{ animationDelay: `${i * 0.12}s`, ["--from" as string]: "30px" }}>
            <span className={`f res-orden__num ah-op--${FORMAS[i]}`}>{i + 1}</span>
            <span className="f">{e}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** H6 / H7 · Resultado de la pregunta */
export function Resultado({ pantalla: s, onSiguiente }: Props) {
  const pct = s.jugadores ? Math.round((s.stats.aciertos / s.jugadores) * 100) : 0;
  const t = s.pregunta.tipo;
  return (
    <div className="juego">
      <div className="juego__barra">
        <Logo soloMarca anchoMarca={48} />
        <Chip>
          Pregunta {s.indice + 1} de {s.total}
        </Chip>
        <Chip color="exito" icono={<Icono nombre="correcto" tamano={18} grosor={3} />}>
          {s.stats.aciertos} de {s.jugadores} acertaron · {pct} %
        </Chip>
        <div style={{ flex: 1 }} />
        <Boton variante="anil" onClick={onSiguiente}>
          {s.ultima ? "Ver podio" : "Siguiente"} <Icono nombre="adelante" grosor={3} />
        </Boton>
      </div>
      {t === "quiz" || t === "verdadero_falso" ? (
        <>
          <h1 className="f res-titulo">{s.pregunta.enunciado}</h1>
          <Barras s={s} />
        </>
      ) : (
        <>
          <span className="lbl res-lbl">
            {infoTipo(t).nombre} · pregunta {s.indice + 1}
          </span>
          <h1 className="f res-titulo">{s.pregunta.enunciado}</h1>
          {t === "deslizante" && <Histograma s={s} />}
          {t === "pin" && <MapaCalor s={s} />}
          {t === "respuesta_corta" && <Palabras s={s} />}
          {t === "puzzle" && <Orden s={s} />}
        </>
      )}
    </div>
  );
}
