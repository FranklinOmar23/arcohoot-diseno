import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Boton, Campo, Logo, Tarjeta } from "../componentes";
import { FormasFlotantes } from "../componentes/FormasFlotantes";
import { BotonGoogle } from "../componentes/BotonGoogle";
import { useSesion } from "../lib/sesion";
import "./Acceso.css";

interface Props {
  modo: "entrar" | "registro";
}

/** Entrar / Crear cuenta del anfitrión. Sigue el lenguaje visual de J1_Entrar. */
export function Acceso({ modo }: Props) {
  const { entrar, registrar, entrarConGoogle } = useSesion();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const esRegistro = modo === "registro";

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (esRegistro) await registrar(nombre, correo, clave);
      else await entrar(correo, clave);
      // La ruta SinSesion redirige sola al cambiar el usuario
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <FormasFlotantes escala={1.4} />
      <div className="acceso__columna">
        <div className="acceso__marca">
          <Logo tamano="md" apilado />
          <p className="meta acceso__lema">Quizzes en vivo para aprender jugando</p>
        </div>

        <Tarjeta className="acceso__tarjeta">
          <h1 className="f acceso__titulo">{esRegistro ? "Crea tu cuenta" : "¡Hola de nuevo!"}</h1>
          <p className="meta acceso__sub">
            {esRegistro ? "Gratis. Crea quizzes y lánzalos en segundos." : "Entra para ver tus quizzes."}
          </p>

          <form className="acceso__form" onSubmit={enviar} noValidate>
            {esRegistro && (
              <Campo
                etiqueta="Tu nombre"
                autoComplete="name"
                placeholder="Ana Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                minLength={2}
              />
            )}
            <Campo
              etiqueta="Correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
            <Campo
              etiqueta="Contraseña"
              type="password"
              autoComplete={esRegistro ? "new-password" : "current-password"}
              placeholder={esRegistro ? "Mínimo 8 caracteres" : "Tu contraseña"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              minLength={esRegistro ? 8 : undefined}
            />

            {error && (
              <p className="acceso__error" role="alert">
                {error}
              </p>
            )}

            <Boton type="submit" variante="arco" tamano="lg" bloque disabled={enviando}>
              {enviando ? "Un momento…" : esRegistro ? "Crear cuenta" : "Entrar"}
            </Boton>
          </form>

          <BotonGoogle
            texto={esRegistro ? "signup_with" : "continue_with"}
            onCredencial={async (credencial) => {
              setError("");
              setEnviando(true);
              try {
                await entrarConGoogle(credencial);
              } catch (err) {
                setError((err as Error).message);
                setEnviando(false);
              }
            }}
          />

          <p className="meta acceso__cambio">
            {esRegistro ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
            <Link to={esRegistro ? "/entrar" : "/registro"} replace>
              {esRegistro ? "Entra aquí" : "Créala gratis"}
            </Link>
          </p>
        </Tarjeta>

        <Link to="/jugar" className="ah-btn ah-btn--sol ah-btn--md acceso__jugar">
          ¿Vas a jugar? Entra con el PIN
        </Link>
      </div>
    </main>
  );
}
