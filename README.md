# ArcoHoot

Quizzes en vivo. `client/` (React + Vite + TS) · `server/` (Express + Socket.IO + Prisma + MySQL).
El diseño de referencia está en `pantallas/` y los tokens en `estilos/tokens.css` (el cliente los importa desde ahí).

## Arrancar

Necesitas un MySQL/MariaDB (XAMPP, Laragon o la base de Hostinger por MySQL remoto) y su URL en `server/.env`
(copia `server/.env.example`).

```bash
npm install          # instala client y server (workspaces)
npm run db:setup     # crea las tablas en MySQL y carga datos de ejemplo
npm run dev          # API en :3001 y web en http://localhost:5173
npm run pruebas      # pruebas automáticas (con npm run dev corriendo; ver DESPLIEGUE-HOSTINGER.md)
```

Para publicar en Hostinger: **[DESPLIEGUE-HOSTINGER.md](DESPLIEGUE-HOSTINGER.md)**.

Usuario de ejemplo: `demo@arcohoot.app` / `arcohoot123`.

## Rutas

- `/entrar`, `/registro`: acceso del anfitrión
- `/`: H1 · Mis quizzes
- `/sistema`: vitrina de componentes base (compárala con `pantallas/Main.html`)
- `/editor/:id`: H2 · Editor (6 tipos de pregunta, autoguardado, imágenes, vista previa)
- `/lanzar/:id`: H3 · Elegir modo y abrir sala (crea la partida con su PIN)
- `/anfitrion/:pin`: H4 Sala → H5 Pregunta → H6/H7 Resultado → H8 Ranking → H9 Podio (+ Exportar a Excel)
- `/jugar`: J1 PIN → J2 Apodo → J3 ¡Estás dentro! → J4–J9 Responder → J10/J11 Correcto/Casi → resultado final

## Puntos

Acertar da de 500 a 1000 puntos según la rapidez (1000 al instante, 500 en el último segundo).
Desde el segundo acierto seguido suma +100 por racha (máx. +500). "Puntos dobles ⚡" multiplica todo por 2.
El reloj lo lleva el servidor; los resultados se guardan en `Participante` y `Respuesta` al llegar al podio.

## Probar con celulares

`npm run dev` deja la web abierta en la red local. En la sala, el QR apunta a la IP de tu equipo
(p. ej. `http://192.168.1.5:5173/jugar?pin=…`). Los celulares deben estar en la misma Wi-Fi.
Si no cargan, permite Node.js en el Firewall de Windows (redes privadas).

Las imágenes subidas se guardan en MySQL, tabla `Imagen` (solo PNG, JPG, WEBP o GIF, hasta 4 MB).

## Entrar con Google (opcional)

1. En <https://console.cloud.google.com/apis/credentials> crea un **ID de cliente de OAuth** de tipo **Aplicación web**.
2. En **Orígenes de JavaScript autorizados** agrega `http://localhost:5173` (y tu dominio cuando publiques).
3. Copia el ID en `server/.env`: `GOOGLE_CLIENT_ID="1234-abc.apps.googleusercontent.com"` y reinicia `npm run dev`.

Sin ese valor, el botón «Continuar con Google» no aparece. Si ya existe una cuenta con el mismo correo
(verificado por Google), se vincula a ella en vez de crear otra.

## Modo con poderes

- Se gana un poder solo acertando (máx. 1 por pregunta, inventario de 3, nunca en la última pregunta):
  pregunta de puntos dobles en quizzes de más de 10 preguntas (seguro), racha de 3, 6, 9… (seguro)
  o responder en menos del 30 % del tiempo (40 % de probabilidad).
- Rareza al sortear: común 55 %, raro 33 %, épico 12 %.
- Se usan durante la pregunta desde la barra del celular. «Usar ahora» en «¡Ganaste un poder!» lo activa al empezar la siguiente.
- Ataques (Congelar 3 s, Niebla 5 s, Revolver, Robo 10 %) piden rival; el Escudo bloquea el siguiente y se gasta.

Pruebas automáticas: arrancar con `ARCOHOOT_PRUEBAS=1 npm run dev` habilita un evento que da poderes a mano
(nunca se activa con `NODE_ENV=production`).

## Base de datos

`server/prisma/schema.prisma` (MySQL): Usuario, Sesion (cada inicio de sesión, con hash del token), Quiz, Pregunta,
Imagen, Partida, Participante y Respuesta. Para cambiar el esquema: edítalo y ejecuta `npm run db:nueva-migracion -w server`.
`npm run db:studio -w server` abre Prisma Studio para ver los datos.
