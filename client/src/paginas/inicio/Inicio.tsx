import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boton, Campo, ChipFiltro, Icono, Logo } from "../../componentes";
import { api, type ResumenQuiz } from "../../lib/api";
import { MenuPerfil } from "./MenuPerfil";
import { TarjetaQuiz } from "./TarjetaQuiz";
import "./Inicio.css";

type Filtro = "todos" | "recientes" | "favoritos" | "compartidos";
type Orden = "recientes" | "alfabetico" | "jugados";

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "recientes", texto: "Recientes" },
  { id: "favoritos", texto: "Favoritos" },
  { id: "compartidos", texto: "Compartidos conmigo" },
];

const VACIO: Record<Filtro, string> = {
  todos: "",
  recientes: "No has tocado ningún quiz esta semana.",
  favoritos: "Aún no tienes favoritos.",
  compartidos: "Nadie ha compartido un quiz contigo todavía.",
};

export function Inicio() {
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [quizzes, setQuizzes] = useState<ResumenQuiz[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  // Espera a que dejes de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const control = new AbortController();
    const params = new URLSearchParams({ filtro, orden });
    if (q) params.set("q", q);
    api<{ total: number; quizzes: ResumenQuiz[] }>(`/quizzes?${params}`, { signal: control.signal })
      .then((r) => {
        setQuizzes(r.quizzes);
        setTotal(r.total);
        setError("");
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => control.abort();
  }, [filtro, orden, q]);

  async function crearQuiz() {
    setCreando(true);
    try {
      const r = await api<{ quiz: ResumenQuiz }>("/quizzes", { metodo: "POST", cuerpo: {} });
      navegar(`/editor/${r.quiz.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreando(false);
    }
  }

  const mostrarTileCrear = filtro === "todos" && !q;
  const sinResultados = quizzes !== null && quizzes.length === 0 && !mostrarTileCrear;

  return (
    <div className="inicio">
      <header className="inicio__barra">
        <Logo tamano="sm" />
        <div className="inicio__espacio" />
        <form className="inicio__buscar" role="search" onSubmit={(e) => e.preventDefault()}>
          <Campo
            etiqueta="Buscar quizzes"
            ocultarEtiqueta
            type="search"
            tamano="sm"
            placeholder="Buscar en mis quizzes"
            icono={<Icono nombre="buscar" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </form>
        <Boton variante="arco" icono={<Icono nombre="mas" />} onClick={crearQuiz} disabled={creando}>
          Crear quiz
        </Boton>
        <MenuPerfil />
      </header>

      <div className="inicio__titulo">
        <h1 className="f">Mis quizzes</h1>
        <div className="inicio__filtros" role="group" aria-label="Filtrar quizzes">
          {FILTROS.map((f) => (
            <ChipFiltro key={f.id} activo={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.texto}
              {f.id === "todos" && filtro === "todos" ? ` · ${total}` : ""}
            </ChipFiltro>
          ))}
        </div>
        <div className="inicio__espacio" />
        <label className="meta inicio__orden">
          Ordenar:{" "}
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
            <option value="recientes">más recientes</option>
            <option value="alfabetico">de la A a la Z</option>
            <option value="jugados">más jugados</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="inicio__error" role="alert">
          {error}
        </p>
      )}

      <div className="inicio__rejilla" aria-busy={quizzes === null} aria-live="polite">
        {quizzes?.map((quiz) => <TarjetaQuiz key={quiz.id} quiz={quiz} />)}

        {mostrarTileCrear && quizzes !== null && (
          <button type="button" className="inicio__crear" onClick={crearQuiz} disabled={creando}>
            <span className="inicio__crear-icono">
              <Icono nombre="mas" tamano={30} grosor={3} />
            </span>
            <span className="f inicio__crear-texto">Crear quiz nuevo</span>
            <span className="meta">Desde cero o con plantilla</span>
          </button>
        )}

        {sinResultados && (
          <div className="ah-panel inicio__vacio">
            <p className="f">{q ? `No hay quizzes que coincidan con “${q}”.` : VACIO[filtro]}</p>
            {filtro !== "todos" && (
              <Boton tamano="sm" onClick={() => setFiltro("todos")}>
                Ver todos
              </Boton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
