-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `claveHash` VARCHAR(191) NULL,
    `googleId` VARCHAR(191) NULL,
    `foto` TEXT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_correo_key`(`correo`),
    UNIQUE INDEX `Usuario_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sesion` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `agente` VARCHAR(255) NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimoUso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiraEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sesion_tokenHash_key`(`tokenHash`),
    INDEX `Sesion_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quiz` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `portada` INTEGER NOT NULL DEFAULT 0,
    `favorito` BOOLEAN NOT NULL DEFAULT false,
    `vecesJugado` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,
    `autorId` VARCHAR(191) NOT NULL,

    INDEX `Quiz_autorId_idx`(`autorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partida` (
    `id` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `quizId` VARCHAR(191) NOT NULL,
    `anfitrionId` VARCHAR(191) NOT NULL,
    `modo` VARCHAR(191) NOT NULL,
    `apodosVisibles` BOOLEAN NOT NULL DEFAULT true,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'sala',
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `terminadaEn` DATETIME(3) NULL,

    UNIQUE INDEX `Partida_pin_key`(`pin`),
    INDEX `Partida_anfitrionId_idx`(`anfitrionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participante` (
    `id` VARCHAR(191) NOT NULL,
    `partidaId` VARCHAR(191) NOT NULL,
    `apodo` VARCHAR(191) NOT NULL,
    `puntos` INTEGER NOT NULL,
    `puesto` INTEGER NOT NULL,
    `aciertos` INTEGER NOT NULL,

    INDEX `Participante_partidaId_idx`(`partidaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Respuesta` (
    `id` VARCHAR(191) NOT NULL,
    `participanteId` VARCHAR(191) NOT NULL,
    `pregunta` INTEGER NOT NULL,
    `enunciado` VARCHAR(255) NOT NULL,
    `respuesta` TEXT NOT NULL,
    `correcta` BOOLEAN NOT NULL,
    `puntos` INTEGER NOT NULL,
    `ms` INTEGER NULL,

    INDEX `Respuesta_participanteId_idx`(`participanteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Imagen` (
    `nombre` VARCHAR(120) NOT NULL,
    `tipo` VARCHAR(40) NOT NULL,
    `datos` MEDIUMBLOB NOT NULL,
    `autorId` VARCHAR(191) NULL,
    `creadaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pregunta` (
    `id` VARCHAR(191) NOT NULL,
    `quizId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `enunciado` VARCHAR(255) NOT NULL,
    `tiempo` INTEGER NOT NULL DEFAULT 20,
    `puntosDobles` BOOLEAN NOT NULL DEFAULT false,
    `imagen` VARCHAR(255) NULL,
    `datos` TEXT NOT NULL,

    INDEX `Pregunta_quizId_idx`(`quizId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sesion` ADD CONSTRAINT `Sesion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quiz` ADD CONSTRAINT `Quiz_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partida` ADD CONSTRAINT `Partida_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partida` ADD CONSTRAINT `Partida_anfitrionId_fkey` FOREIGN KEY (`anfitrionId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participante` ADD CONSTRAINT `Participante_partidaId_fkey` FOREIGN KEY (`partidaId`) REFERENCES `Partida`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Respuesta` ADD CONSTRAINT `Respuesta_participanteId_fkey` FOREIGN KEY (`participanteId`) REFERENCES `Participante`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pregunta` ADD CONSTRAINT `Pregunta_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

