import { useEffect, useRef } from "react";
import { Boton, Chip, Cronometro, Forma, FORMAS, Icono, Opcion } from "../../componentes";
import { infoTipo, type Pregunta } from "../../juego/preguntas";

interface Props {
  preguntas: Pregunta[];
  indice: number;
  onIndice: (i: number) => void;
  onCerrar: () => void;
}

function Respuestas({ p }: { p: Pregunta }) {
  switch (p.tipo) {
    case "quiz":
      return (
        <div className="vista__opciones">
          {p.datos.opciones.map((o, i) => (
            <Opcion key={i} forma={FORMAS[i]} tabIndex={-1} alto={84}>
              {o.texto || `Respuesta ${i + 1}`}
            </Opcion>
          ))}
        </div>
      );
    case "verdadero_falso":
      return (
        <div className="vista__opciones">
          <Opcion forma="circulo" tabIndex={-1} alto={84}>
            Verdadero
          </Opcion>
          <Opcion forma="rombo" tabIndex={-1} alto={84}>
            Falso
          </Opcion>
        </div>
      );
    case "respuesta_corta":
      return <p className="vista__aviso f">Los jugadores escriben su respuesta en el celular.</p>;
    case "deslizante":
      return (
        <p className="vista__aviso f">
          Deslizan entre {p.datos.min} y {p.datos.max}
          {p.datos.unidad ? ` ${p.datos.unidad}` : ""}.
        </p>
      );
    case "pin":
      return <p className="vista__aviso f">Los jugadores tocan la imagen para poner su pin.</p>;
    case "puzzle":
      return (
        <ol className="vista__puzzle">
          {[...p.datos.elementos].reverse().map((e, i) => (
            <li key={i} className="ah-card vista__paso">
              <Forma forma={FORMAS[i]} tamano={24} color={`var(--op-${FORMAS[i]})`} />
              {e || "Paso"}
            </li>
          ))}
        </ol>
      );
  }
}

/** Vista previa a pantalla completa: así se verá la pregunta en el proyector */
export function VistaPrevia({ preguntas, indice, onIndice, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const p = preguntas[indice];

  useEffect(() => {
    const d = dialogo.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog ref={dialogo} className="vista" aria-labelledby="vista-titulo" onCancel={onCerrar}>
      <div className="vista__barra">
        <Chip color="anil">
          {indice + 1} / {preguntas.length}
        </Chip>
        <Chip>{infoTipo(p.tipo).nombre}</Chip>
        {p.puntosDobles && <Chip color="sol">Puntos dobles ⚡</Chip>}
        <div style={{ flex: 1 }} />
        <Boton tamano="sm" onClick={onCerrar}>
          Cerrar vista previa
        </Boton>
      </div>

      <h2 id="vista-titulo" className="f vista__enunciado">
        {p.enunciado || "Sin enunciado"}
      </h2>

      <div className="vista__centro">
        <Cronometro restante={p.tiempo} total={p.tiempo} tamano={140} />
        {p.imagen && <img className="vista__imagen" src={p.imagen} alt="" />}
        <div style={{ width: 140 }} aria-hidden="true" />
      </div>

      <Respuestas p={p} />

      <div className="vista__pie">
        <Boton icono={<Icono nombre="atras" />} disabled={indice === 0} onClick={() => onIndice(indice - 1)}>
          Anterior
        </Boton>
        <Boton variante="sol" disabled={indice === preguntas.length - 1} onClick={() => onIndice(indice + 1)}>
          Siguiente <Icono nombre="adelante" />
        </Boton>
      </div>
    </dialog>
  );
}
