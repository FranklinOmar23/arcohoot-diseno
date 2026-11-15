import { Boton, Chip, Forma, FORMAS, Icono } from "../../componentes";
import { Confeti } from "../../componentes/Confeti";
import { formatoPuntos, ordinal, type BloquePoderes, type PantallaJugador } from "../../lib/juego";
import { PODERES, type IdPoder } from "../../juego/poderes";
import { BannerPoder } from "./Poderes";
import { ControlPoderes } from "./Responder";

const COLORES_FORMA = ["var(--sol)", "var(--arco)", "var(--laguna)", "var(--anil)"];

/** Respuesta enviada: espera a que cierre la pregunta (con poderes: aún puedes atacar) */
export function Enviada({ puntos, poderes, onPoder }: { puntos: number; poderes: BloquePoderes | null; onPoder: (p: IdPoder, o?: string) => Promise<boolean> }) {
  const aviso = poderes?.efectos.aviso;
  return (
    <main className="fb fb--espera">
      <div className="fb__columna" style={poderes ? { paddingBottom: 0 } : undefined}>
        {aviso && <BannerPoder aviso={aviso} />}
        <span className="pop fb__medallon fb__medallon--anil" aria-hidden="true">
          <Icono nombre="correcto" tamano={70} grosor={3.4} />
        </span>
        <h1 className="f fb__titulo">¡Respuesta enviada!</h1>
        <p className="fb__texto">Espera a que respondan los demás…</p>
        <div className="jugar__rebote" role="status" aria-label="Esperando a los demás">
          {FORMAS.map((f, i) => (
            <span key={f} className="bounce" style={{ animationDelay: `${i * 0.15}s`, display: "flex" }}>
              <Forma forma={f} tamano={26} color={COLORES_FORMA[i]} />
            </span>
          ))}
        </div>
        <Chip>{formatoPuntos(puntos)} pts</Chip>
        {poderes && poderes.inventario.some((p) => PODERES[p].ataque) && (
          <div className="fb__poderes">
            <ControlPoderes poderes={poderes} onPoder={onPoder} soloAtaques puntos={puntos} />
          </div>
        )}
      </div>
    </main>
  );
}

type Res = Extract<PantallaJugador, { fase: "resultado" }>;

/** J10 · ¡Correcto! / J11 · ¡Casi! */
export function ResultadoJugador({ r }: { r: Res }) {
  if (r.correcta) {
    return (
      <main className="fb fb--correcto">
        <Confeti />
        <div className="fb__columna" role="status">
          <span className="pop fb__medallon fb__medallon--exito" aria-hidden="true">
            <Icono nombre="correcto" tamano={80} grosor={3.4} />
          </span>
          <h1 className="f fb__titulo">¡Correcto!</h1>
          <p className="f pop fb__puntos" style={{ animationDelay: ".3s" }}>
            +{formatoPuntos(r.ganados)} pts
          </p>
          <div className="fb__chips">
            {r.racha >= 2 && <Chip>🔥 Racha de {r.racha}</Chip>}
            {r.dobles && <Chip color="sol">x2 aplicado ⚡</Chip>}
          </div>
          <p className="f fb__puesto">
            Vas en <b>{ordinal(r.puesto)} lugar</b>
          </p>
          {r.delante && <p className="fb__delante">A {formatoPuntos(r.delante.diferencia)} pts de {r.delante.apodo}</p>}
          {!r.delante && r.puesto === 1 && <p className="fb__delante">¡Vas a la cabeza! 👑</p>}
        </div>
      </main>
    );
  }

  const forma = r.respuestaCorrecta.forma;
  return (
    <main className="fb fb--incorrecto">
      <div className="fb__columna" role="status">
        <span className="pop fb__medallon fb__medallon--error" aria-hidden="true">
          <Icono nombre="incorrecto" tamano={76} grosor={3.6} />
        </span>
        <h1 className="f fb__titulo">{r.respondio ? "¡Casi!" : "¡Se acabó el tiempo!"}</h1>
        <div className="fb__correcta">
          <span className="lbl">La respuesta era</span>
          <span className="f fb__correcta-texto">
            {forma !== null && forma >= 0 && (
              <span style={{ color: `var(--op-${FORMAS[forma]})`, display: "flex" }}>
                <Forma forma={FORMAS[forma]} tamano={28} />
              </span>
            )}
            {r.respuestaCorrecta.texto}
          </span>
        </div>
        <div className="fb__chips">
          <Chip>+0 pts</Chip>
          <Chip>Racha perdida</Chip>
        </div>
        <p className="f fb__puesto">Vas en {ordinal(r.puesto)} lugar</p>
        <p className="fb__delante">¡La próxima es tuya! 💪</p>
      </div>
    </main>
  );
}

type Final = Extract<PantallaJugador, { fase: "podio" }>;

/** Fin de la partida en el celular */
export function FinalJugador({ f, onOtra }: { f: Final; onOtra: () => void }) {
  const medalla = f.puesto === 1 ? "🥇" : f.puesto === 2 ? "🥈" : f.puesto === 3 ? "🥉" : "🎉";
  return (
    <main className="fb fb--final">
      {f.puesto <= 3 && <Confeti cantidad={18} />}
      <div className="fb__columna">
        <span className="pop fb__medalla" aria-hidden="true">
          {medalla}
        </span>
        <h1 className="f fb__titulo">{f.puesto <= 3 ? "¡Al podio!" : "¡Bien jugado!"}</h1>
        <p className="f fb__puesto">
          Quedaste en <b>{ordinal(f.puesto)} lugar</b> de {f.jugadores}
        </p>
        <p className="f pop fb__puntos" style={{ animationDelay: ".3s" }}>
          {formatoPuntos(f.puntos)} pts
        </p>
        <Chip color="exito" icono={<Icono nombre="correcto" tamano={18} grosor={3} />}>
          {f.aciertos} de {f.total} aciertos
        </Chip>
        <p className="fb__delante">Mira el podio en la pantalla grande.</p>
        <Boton variante="arco" tamano="lg" bloque onClick={onOtra}>
          Jugar otra partida
        </Boton>
      </div>
    </main>
  );
}
