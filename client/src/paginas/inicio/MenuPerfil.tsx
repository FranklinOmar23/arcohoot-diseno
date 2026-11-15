import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boton, Icono } from "../../componentes";
import { estiloAvatar } from "../../componentes/Avatar";
import { useSesion } from "../../lib/sesion";

export function MenuPerfil() {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!usuario) return null;

  return (
    <div ref={raiz} className="menu-perfil">
      <button
        ref={boton}
        type="button"
        className="menu-perfil__boton"
        aria-label="Tu perfil"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((a) => !a)}
        style={estiloAvatar("var(--hielo)", 48)}
      >
        {usuario.nombre.charAt(0).toUpperCase()}
      </button>
      {abierto && (
        <div id={idMenu} className="ah-card menu-perfil__panel pop">
          <div>
            <p className="f menu-perfil__nombre">{usuario.nombre}</p>
            <p className="meta">{usuario.correo}</p>
          </div>
          <Boton
            bloque
            tamano="sm"
            icono={<Icono nombre="salir" tamano={20} />}
            onClick={async () => {
              await salir();
              navegar("/entrar", { replace: true });
            }}
          >
            Cerrar sesión
          </Boton>
        </div>
      )}
    </div>
  );
}
