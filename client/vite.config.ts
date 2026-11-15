import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Accesible desde otros equipos de la red (celulares de los jugadores)
    host: true,
    // Mismo origen en desarrollo: la cookie de sesión viaja sin CORS
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
