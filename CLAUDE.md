# ArcoHoot — guía para Claude Code

ArcoHoot es una plataforma web **gratuita** de quizzes en vivo para clases, capacitaciones e inducciones.
Un **anfitrión** proyecta el quiz en pantalla grande (16:9) y los **jugadores** responden desde el celular entrando con un **PIN**.
Toda la interfaz va en **español** (de tú, frases cortas, con signos de apertura: "¡Estás dentro!").

## Qué hay en esta carpeta

- `pantallas/*.html`: el diseño aprobado. Son 30 pantallas estáticas en HTML+CSS (ábrelas en el navegador). **Son la referencia visual: replícalas fielmente**, pero no copies su markup tal cual: conviértelo en componentes.
  - `Main.html` — sistema de diseño (colores, tipografía, opciones, botones, tarjetas de poder).
  - `H1…H9` — anfitrión: Inicio, Editor, Lanzar, Sala de espera, Pregunta en curso (con feed de poderes), Resultado (barras), Histograma + mapa de calor, Ranking, Podio.
  - `J1…J11` — jugador: PIN, Apodo, Espera, Quiz, Verdadero/Falso, Respuesta corta, Deslizante, Pin sobre imagen, Puzzle, Correcto, Incorrecto.
  - `P1…P9` — modo con poderes: Inventario, ¡Ganaste un poder!, Selector de objetivo, Congelado, Niebla, Revuelto, Escudo, x2, +5 s.
- `estilos/tokens.css`: todos los tokens (colores, tipografía, radios, sombras) como variables CSS. **Úsalos siempre; no metas colores a mano.**
- `index.html`: índice para navegar las pantallas.

## Reglas de diseño que no se rompen

1. **Color + forma, siempre.** Opción 1 ▲ triángulo (sol), 2 ◆ rombo (arco), 3 ● círculo (laguna), 4 ■ cuadrado (añil). Verdadero = círculo, Falso = rombo. Ninguna respuesta depende solo del color.
2. **Se lee de lejos:** Fredoka para lo grande (PIN, enunciados, opciones, botones); Nunito para texto corrido. Nada importante por debajo de 14 px. Contraste ≥ 4.5:1.
3. **Look de "pegatina":** borde de 3 px `--borde`, sombra sólida sin desenfoque (`--sombra-boton`, `--sombra-tarjeta`). Al pulsar, el elemento baja 5 px y la sombra desaparece.
4. **Tocable:** botones de 56 px o más (72 px los principales en móvil).
5. **Animaciones cortas y alegres** (< 1 s, salvo la ruleta de poderes de 2,4 s) y desactivadas con `prefers-reduced-motion`.
6. Accesible: `<button>`, `<a>` e `<input>` reales con `<label>`; `aria-label` en botones de solo ícono; `aria-live` en contadores y feed.

## Reglas del juego

- Tipos de pregunta: Quiz (2–4 opciones), Verdadero o falso, Respuesta corta, Control deslizante, Respuesta con pin (sobre imagen), Puzzle (ordenar).
- Cada pregunta: tiempo límite, imagen opcional y opción "Puntos dobles ⚡".
- Puntos por acertar y por rapidez; racha 🔥 por aciertos seguidos.
- Dos modos: **Clásico** y **Con poderes**.
- En modo con poderes, los poderes se ganan al azar: en preguntas de puntos dobles (en quizzes de más de 10 preguntas) y por responder rápido. Inventario de 3 ranuras.
- Poderes y rareza (propuesta):
  - Común ◆: Doble ⚡, Tiempo extra ⏱️ (+5 s), 50/50 ✂️
  - Raro ◆◆: Escudo 🛡️, Segunda oportunidad 🔁, Niebla 🌫️ (5 s), Revolver 🔀
  - Épico ◆◆◆: Congelar ❄️ (3 s), Robo 💰 (10 % de los puntos)
- Los poderes de ataque (Congelar, Niebla, Revolver, Robo) piden elegir rival; el Escudo los bloquea.
- Al final: podio y **Exportar resultados a Excel** (.xlsx).

## Stack sugerido (ajústalo si ya tengo uno)

- Frontend: React + Vite + TypeScript, CSS con las variables de `tokens.css` (o CSS Modules).
- Tiempo real: Socket.IO (Node + Express) para sala, preguntas, respuestas, ranking y eventos de poderes.
- Base de datos: SQLite/PostgreSQL con Prisma para quizzes y resultados.
- Exportar a Excel: SheetJS (`xlsx`) o `exceljs`.
- Rutas: `/` inicio, `/editor/:id`, `/lanzar/:id`, `/anfitrion/:pin` (sala → pregunta → resultado → ranking → podio), `/jugar` (PIN → apodo → espera → responder → feedback).

## Cómo trabajar

1. Lee `estilos/tokens.css` y abre `pantallas/Main.html` primero.
2. Crea los componentes base: `Boton`, `Campo`, `Chip`, `Opcion` (color+forma), `Cronometro` (anillo), `MedallonPoder`, `Interruptor`, `Logo`.
3. Construye las pantallas en el orden del flujo, comparando cada una con su HTML de referencia.
4. Luego la lógica en tiempo real y, al final, el modo con poderes.
