import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSesion } from "./lib/sesion";
import { Acceso } from "./paginas/Acceso";
import { Inicio } from "./paginas/inicio/Inicio";
import { Editor } from "./paginas/editor/Editor";
import { Lanzar } from "./paginas/lanzar/Lanzar";
import { Sala } from "./paginas/anfitrion/Sala";
import { Jugar } from "./paginas/jugar/Jugar";
import { SistemaDiseno } from "./paginas/SistemaDiseno";

function Cargando() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} aria-busy="true">
      <p className="meta">Cargando…</p>
    </div>
  );
}

function ConSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />;
  return <>{children}</>;
}

function SinSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (usuario) return <Navigate to={(ubicacion.state as { desde?: string } | null)?.desde ?? "/"} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<SinSesion><Acceso modo="entrar" /></SinSesion>} />
      <Route path="/registro" element={<SinSesion><Acceso modo="registro" /></SinSesion>} />
      <Route path="/" element={<ConSesion><Inicio /></ConSesion>} />
      <Route path="/editor/:id" element={<ConSesion><Editor /></ConSesion>} />
      <Route path="/lanzar/:id" element={<ConSesion><Lanzar /></ConSesion>} />
      <Route path="/anfitrion/:pin" element={<ConSesion><Sala /></ConSesion>} />
      <Route path="/jugar" element={<Jugar />} />
      <Route path="/sistema" element={<SistemaDiseno />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
