# Publicar ArcoHoot en Hostinger (plan Business)

ArcoHoot es una sola app Node.js: el servidor Express entrega la web compilada, la API y el juego en vivo.

## Antes de empezar: dos límites del plan Business

Según la ayuda de Hostinger, los planes Business/Cloud:

1. **No aceptan WebSockets entrantes.** ArcoHoot ya está preparado: el celular se conecta por HTTP
   ("polling") y solo usa WebSocket si el servidor lo permite. Funciona, con un poco más de retraso.
2. **Borran la carpeta de la app en cada despliegue.** Por eso las imágenes del editor se guardan
   en MySQL (tabla `Imagen`), no en disco.

Lo que solo se sabe probando en tu cuenta: el juego guarda la partida en curso en la memoria del
proceso de Node. Si Hostinger reinicia el proceso o reparte las visitas entre varios procesos,
una partida en curso se pierde. Las partidas terminadas siempre quedan guardadas en MySQL.
Si ves que los jugadores se desconectan solos, la solución es un **VPS** de Hostinger.

## 1. Crear la base de datos MySQL

hPanel → **Sitios web → Administrar → Bases de datos → Administración**.
Crea una base y un usuario (Hostinger les pone un prefijo, p. ej. `u123456789_arcohoot`).
Anota el nombre de la base, el usuario y la contraseña.

Las tablas se pueden crear de dos formas (elige una):

- **A · Automática:** no hagas nada; el build (`npm run build:produccion`) las crea con `prisma migrate deploy`.
- **B · A mano con phpMyAdmin:** junto a la base pulsa **Entrar a phpMyAdmin**, selecciona la base,
  pestaña **Importar** y sube [`server/prisma/hostinger/arcohoot-tablas.sql`](server/prisma/hostinger/arcohoot-tablas.sql).
  El script registra la migración, así el build después no intenta crearlas de nuevo.
  Si algún día cambias el esquema, regenera el script con `node server/prisma/hostinger/generar-sql.mjs`.

## 2. Subir el código

hPanel → **Sitios web → Crear sitio → Web App** (o **Node.js**). Elige tu dominio.

- **Origen**: conecta tu repositorio de GitHub (se vuelve a publicar con cada `push`)
  o sube un `.zip` del proyecto **sin** las carpetas `node_modules`, `client/dist` ni `server/dist`.
- **Ajustes de build**:

| Campo | Valor |
|---|---|
| Framework preset | Other / Express |
| Node version | 22.x |
| Root directory | `/` (la raíz del proyecto) |
| Package manager | npm |
| Build command | `npm run build:produccion` |
| Entry file | `server/app.cjs` (o `app.cjs` si el directorio raíz es `server`) |

`build:produccion` genera el cliente de Prisma, compila servidor y web, y crea las tablas en MySQL
(`prisma migrate deploy`).

## 3. Variables de entorno

En la misma pantalla, en **Environment variables** (o **Importar .env**).

**Opción por partes** (más cómoda; la contraseña puede tener símbolos sin codificarlos):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `127.0.0.1` (solo el host) |
| `USUARIODB` | el usuario con prefijo, p. ej. `u810873479_arcohoot` |
| `CLAVEDB` | la contraseña |
| `NOMBREDB` | (opcional) el nombre de la base; si falta, se usa el del usuario |
| `NODE_ENV` | `production` |

No agregues `PORT`: Hostinger asigna el puerto a la app.

**Opción con URL completa:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:CLAVE@127.0.0.1:3306/BASE` |
| `NODE_ENV` | `production` |
| `GOOGLE_CLIENT_ID` | (opcional) tu ID de cliente de Google |

- Usa **`127.0.0.1`**, no `localhost`: con `localhost` Node 18+ falla con "Access denied … '::1'".
- Si la contraseña tiene símbolos (`@ : / # ?`), escríbelos codificados: `@` → `%40`, `#` → `%23`, `:` → `%3A`, `/` → `%2F`.
- `DATABASE_URL` tiene que estar disponible **también durante el build**, porque ahí se crean las tablas.

## 4. Datos de ejemplo (opcional, una sola vez)

Para cargar el usuario `demo@arcohoot.app` / `arcohoot123` y sus 7 quizzes, desde tu PC
contra la base de Hostinger:

1. hPanel → **Bases de datos → MySQL remoto**: agrega tu IP y elige la base.
2. En `server/.env` pon `DATABASE_URL` con el **host remoto** que muestra esa pantalla (algo como `srv123.hstgr.io`).
3. Ejecuta `npm run db:setup`.

No lo hagas si ya tienes datos reales: el seed borra los quizzes del usuario demo.

## 5. Google (opcional)

En Google Cloud Console, en tu ID de cliente de OAuth, agrega a **Orígenes de JavaScript autorizados**
tu dominio (`https://tudominio.com`). Luego pon `GOOGLE_CLIENT_ID` en las variables de Hostinger y vuelve a publicar.

## 6. Comprobar que funciona

- `https://tudominio.com/api/salud` debe responder `{"ok":true}`.
- Entra, crea un quiz, lánzalo y únete desde el celular en `https://tudominio.com/jugar`.
- Si algo falla: en hPanel, **Web App → Logs** (de build y de ejecución).

## Desarrollo en tu PC

El proyecto usa MySQL también en local. Dos opciones:

- **XAMPP** (o Laragon): inicia MySQL, crea la base `arcohoot` y deja en `server/.env`
  `DATABASE_URL="mysql://root:@127.0.0.1:3306/arcohoot"`.
- **La base de Hostinger** vía MySQL remoto (paso 4). Ojo: estarías trabajando con los datos reales.

Luego: `npm install`, `npm run db:setup` y `npm run dev`.

Pruebas automáticas (con `npm run dev` corriendo en otra terminal):

```bash
# la prueba de poderes necesita el modo pruebas:  ARCOHOOT_PRUEBAS=1 npm run dev
npm run pruebas
```
