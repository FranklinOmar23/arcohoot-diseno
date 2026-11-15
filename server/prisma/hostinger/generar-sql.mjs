// Genera arcohoot-tablas.sql para importar en phpMyAdmin (Hostinger).
// Uso: node server/prisma/hostinger/generar-sql.mjs   (vuelve a ejecutarlo si cambias las migraciones)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpetaMigraciones = path.join(aqui, "..", "migrations");
const migraciones = fs
  .readdirSync(carpetaMigraciones, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const partes = [];
const registros = [];
for (const nombre of migraciones) {
  const sql = fs.readFileSync(path.join(carpetaMigraciones, nombre, "migration.sql"));
  // Prisma guarda el SHA-256 del archivo de migración para detectar cambios
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  partes.push(`-- ── Migración ${nombre} ──\n${sql.toString("utf8").trim()}`);
  registros.push(`    ('${crypto.randomUUID()}', '${checksum}', CURRENT_TIMESTAMP(3), '${nombre}', NULL, NULL, CURRENT_TIMESTAMP(3), 1)`);
}

const salida = `-- ═══════════════════════════════════════════════════════════════════
-- ArcoHoot · Tablas para MySQL / MariaDB (Hostinger)
--
-- Cómo usarlo:
--   1. hPanel → Bases de datos → Administración: crea la base y su usuario.
--   2. Junto a la base, pulsa «Entrar a phpMyAdmin».
--   3. Con tu base seleccionada a la izquierda: pestaña «Importar»,
--      elige este archivo y pulsa «Importar» (o pega todo en la pestaña «SQL»).
--
-- Úsalo sobre una base VACÍA. La última parte registra las migraciones para que
-- «prisma migrate deploy» (en cada despliegue) sepa que las tablas ya existen.
-- Generado por server/prisma/hostinger/generar-sql.mjs a partir de server/prisma/migrations/.
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

${partes.join("\n\n")}

-- ── Registro de migraciones de Prisma ──────────────────────────────
CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
    \`id\` VARCHAR(36) NOT NULL,
    \`checksum\` VARCHAR(64) NOT NULL,
    \`finished_at\` DATETIME(3) NULL,
    \`migration_name\` VARCHAR(255) NOT NULL,
    \`logs\` TEXT NULL,
    \`rolled_back_at\` DATETIME(3) NULL,
    \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO \`_prisma_migrations\`
    (\`id\`, \`checksum\`, \`finished_at\`, \`migration_name\`, \`logs\`, \`rolled_back_at\`, \`started_at\`, \`applied_steps_count\`)
VALUES
${registros.join(",\n")};
`;

const destino = path.join(aqui, "arcohoot-tablas.sql");
fs.writeFileSync(destino, salida);
console.log(`Listo: ${path.relative(process.cwd(), destino)} (${migraciones.length} migración/es)`);
