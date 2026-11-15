import { Router } from "express";
import ExcelJS from "exceljs";
import { prisma } from "./db.js";
import { requiereSesion } from "./auth.js";

export const rutasExcel = Router();
rutasExcel.use(requiereSesion);

const COLOR_ENCABEZADO = "FF3B2FC9"; // añil
const COLOR_TEXTO_ENCABEZADO = "FFFFFFFF";

function estilarEncabezado(hoja: ExcelJS.Worksheet) {
  const fila = hoja.getRow(1);
  fila.font = { bold: true, color: { argb: COLOR_TEXTO_ENCABEZADO } };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ENCABEZADO } };
  fila.alignment = { vertical: "middle" };
  fila.height = 22;
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnCount } };
}

const nombreArchivo = (titulo: string, fecha: Date) =>
  `${titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "quiz"}-${fecha.toISOString().slice(0, 10)}.xlsx`;

// GET /api/partidas/:id/excel → resultados de una partida terminada
rutasExcel.get("/:id/excel", async (req, res) => {
  const partida = await prisma.partida.findFirst({
    where: { id: req.params.id, anfitrionId: req.usuario!.id },
    include: {
      quiz: { select: { titulo: true } },
      participantes: { orderBy: { puesto: "asc" }, include: { respuestas: { orderBy: { pregunta: "asc" } } } },
    },
  });
  if (!partida) {
    res.status(404).json({ error: "No encontramos esa partida." });
    return;
  }
  if (partida.participantes.length === 0) {
    res.status(409).json({ error: "Esta partida aún no tiene resultados." });
    return;
  }

  const libro = new ExcelJS.Workbook();
  libro.creator = "ArcoHoot";
  libro.created = new Date();
  const totalPreguntas = Math.max(0, ...partida.participantes.flatMap((p) => p.respuestas.map((r) => r.pregunta + 1)));

  const ranking = libro.addWorksheet("Ranking");
  ranking.columns = [
    { header: "Puesto", key: "puesto", width: 9 },
    { header: "Apodo", key: "apodo", width: 22 },
    { header: "Puntos", key: "puntos", width: 12 },
    { header: "Aciertos", key: "aciertos", width: 11 },
    { header: "% de aciertos", key: "porcentaje", width: 14 },
  ];
  for (const p of partida.participantes) {
    ranking.addRow({
      puesto: p.puesto,
      apodo: p.apodo,
      puntos: p.puntos,
      aciertos: `${p.aciertos} / ${totalPreguntas}`,
      porcentaje: totalPreguntas ? p.aciertos / totalPreguntas : 0,
    });
  }
  ranking.getColumn("porcentaje").numFmt = "0%";
  ranking.getColumn("puntos").numFmt = "#,##0";
  estilarEncabezado(ranking);

  const respuestas = libro.addWorksheet("Respuestas");
  respuestas.columns = [
    { header: "Apodo", key: "apodo", width: 22 },
    { header: "N.º", key: "num", width: 6 },
    { header: "Pregunta", key: "enunciado", width: 50 },
    { header: "Respuesta", key: "respuesta", width: 36 },
    { header: "¿Correcta?", key: "correcta", width: 11 },
    { header: "Puntos", key: "puntos", width: 10 },
    { header: "Tiempo (s)", key: "tiempo", width: 11 },
  ];
  for (const p of partida.participantes) {
    for (const r of p.respuestas) {
      respuestas.addRow({
        apodo: p.apodo,
        num: r.pregunta + 1,
        enunciado: r.enunciado,
        respuesta: r.respuesta || "(sin respuesta)",
        correcta: r.correcta ? "Sí" : "No",
        puntos: r.puntos,
        tiempo: r.ms === null ? null : Math.round(r.ms / 100) / 10,
      });
    }
  }
  estilarEncabezado(respuestas);

  const info = libro.addWorksheet("Partida");
  info.columns = [
    { header: "Dato", key: "dato", width: 18 },
    { header: "Valor", key: "valor", width: 40 },
  ];
  info.addRows([
    { dato: "Quiz", valor: partida.quiz.titulo },
    { dato: "Modo", valor: partida.modo === "poderes" ? "Con poderes" : "Clásico" },
    { dato: "Fecha", valor: partida.creadaEn },
    { dato: "Jugadores", valor: partida.participantes.length },
    { dato: "Preguntas", valor: totalPreguntas },
  ]);
  info.getCell("B4").numFmt = "dd/mm/yyyy hh:mm";
  estilarEncabezado(info);

  const archivo = nombreArchivo(partida.quiz.titulo, partida.creadaEn);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${archivo}"; filename*=UTF-8''${encodeURIComponent(archivo)}`);
  await libro.xlsx.write(res);
  res.end();
});
