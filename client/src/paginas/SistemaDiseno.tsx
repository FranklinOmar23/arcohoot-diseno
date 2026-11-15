import { useEffect, useState } from "react";
import {
  Boton,
  Campo,
  Chip,
  Cronometro,
  EtiquetaRareza,
  FORMAS,
  Icono,
  Interruptor,
  Logo,
  Opcion,
  TarjetaPoder,
} from "../componentes";
import { PODERES, type IdPoder } from "../juego/poderes";

const textos = ["Triángulo", "Rombo", "Círculo", "Cuadrado"];

/** /sistema — vitrina de componentes base para compararlos con pantallas/Main.html */
export function SistemaDiseno() {
  const [encendido, setEncendido] = useState(true);
  const [segundos, setSegundos] = useState(15);
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => (s <= 0 ? 20 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (oscuro) document.documentElement.dataset.theme = "oscuro";
    else delete document.documentElement.dataset.theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [oscuro]);

  const seccion = { display: "flex", flexDirection: "column", gap: 18 } as const;
  const h2 = { fontWeight: 600, fontSize: "var(--fs-titulo)" } as const;

  return (
    <div style={{ padding: 56, display: "flex", flexDirection: "column", gap: 44, maxWidth: 1440, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Logo tamano="lg" />
          <h1 className="f" style={{ fontWeight: 700, fontSize: "var(--fs-display)", lineHeight: 1.05 }}>
            Sistema de diseño
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span id="lbl-tema" className="meta">
            Tema oscuro
          </span>
          <Interruptor activo={oscuro} onCambio={setOscuro} idEtiqueta="lbl-tema" />
        </div>
      </header>

      <section style={seccion}>
        <h2 className="f" style={h2}>Opciones de respuesta</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {FORMAS.map((f, i) => (
            <Opcion key={f} forma={f}>
              {textos[i]}
            </Opcion>
          ))}
        </div>
      </section>

      <section style={seccion}>
        <h2 className="f" style={h2}>Botones y controles</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <Boton variante="arco" icono={<Icono nombre="mas" />}>Crear quiz</Boton>
          <Boton variante="sol" icono={<Icono nombre="jugar" tamano={20} />}>Empezar</Boton>
          <Boton variante="anil" icono={<Icono nombre="exportar" />}>Exportar</Boton>
          <Boton>Cancelar</Boton>
          <Boton disabled>Desactivado</Boton>
          <Boton variante="arco" tamano="lg">Entrar</Boton>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Chip color="sol">Puntos dobles ⚡</Chip>
          <Chip color="anil" icono={<Icono nombre="jugadores" tamano={18} />}>14 jugadores</Chip>
          <Chip color="exito" icono={<Icono nombre="correcto" tamano={18} />}>Correcto</Chip>
          <Chip color="error" icono={<Icono nombre="incorrecto" tamano={18} />}>Incorrecto</Chip>
          <Chip>🔥 Racha de 3</Chip>
          <Interruptor activo={encendido} onCambio={setEncendido} etiqueta="Interruptor de ejemplo" />
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 300 }}>
            <Campo etiqueta="PIN del juego" ocultarEtiqueta placeholder="PIN del juego" inputMode="numeric" style={{ textAlign: "center", letterSpacing: "0.08em" }} />
          </div>
          <Cronometro restante={segundos} total={20} />
        </div>
      </section>

      <section style={seccion}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 className="f" style={h2}>Tarjetas de poder</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="meta">Rareza = color del aro + gemas:</span>
            <EtiquetaRareza rareza="comun" />
            <EtiquetaRareza rareza="raro" />
            <EtiquetaRareza rareza="epico" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
          {(Object.keys(PODERES) as IdPoder[]).map((id) => (
            <TarjetaPoder key={id} poder={id} />
          ))}
        </div>
      </section>
    </div>
  );
}
