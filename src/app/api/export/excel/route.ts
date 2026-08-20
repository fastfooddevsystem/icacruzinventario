import ExcelJS from "exceljs";
import { INSTITUCION, PREFIJO } from "@/lib/supabase/config";
import {
  ahora,
  datosExport,
  ENCABEZADOS,
  filtrosDesdeUrl,
  hoy,
  resumen,
  VERDE_ARGB,
  type FilaExport,
} from "@/lib/exportar";

export async function GET(request: Request) {
  const { filas, categorias } = await datosExport(filtrosDesdeUrl(request.url));
  const r = resumen(filas);

  const wb = new ExcelJS.Workbook();
  wb.creator = `SIGA - ${INSTITUCION}`;

  // ---------- Hoja Inventario ----------
  const ws = wb.addWorksheet("Inventario");
  const ncols = ENCABEZADOS.length;

  ws.mergeCells(1, 1, 1, ncols);
  const t1 = ws.getCell(1, 1);
  t1.value = `INVENTARIO DE BIENES - ${INSTITUCION}`;
  t1.font = { bold: true, size: 14 };
  t1.alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, ncols);
  const t2 = ws.getCell(2, 1);
  t2.value = `Generado: ${ahora()}   |   Registros: ${filas.length}`;
  t2.alignment = { horizontal: "center" };

  ENCABEZADOS.forEach(([, titulo], i) => {
    const c = ws.getCell(4, i + 1);
    c.value = titulo;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_ARGB } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = borde();
  });

  filas.forEach((f, i) => {
    ENCABEZADOS.forEach(([clave], j) => {
      const c = ws.getCell(5 + i, j + 1);
      const valor = f[clave as keyof FilaExport];
      c.value =
        clave === "valor" || clave === "fotos"
          ? Number(valor ?? 0)
          : ((valor ?? "") as string);
      c.border = borde();
      c.alignment = {
        vertical: "top",
        wrapText: clave === "caracteristicas" || clave === "observaciones",
      };
      if (clave === "valor") c.numFmt = "#,##0.00";
      if (clave === "fotos") c.alignment = { horizontal: "center", vertical: "top" };
    });
  });

  [16, 24, 30, 14, 16, 18, 28, 18, 20, 14, 14, 15, 13, 14, 18, 28, 8].forEach(
    (w, i) => (ws.getColumn(i + 1).width = w),
  );
  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, filas.length + 4), column: ncols } };

  // ---------- Hoja Resumen ----------
  const ws2 = wb.addWorksheet("Resumen");
  ws2.getCell("A1").value = "RESUMEN DEL INVENTARIO";
  ws2.getCell("A1").font = { bold: true, size: 13 };

  let fila = 3;
  ws2.getCell(fila, 1).value = "Total de bienes";
  ws2.getCell(fila, 1).font = { bold: true };
  ws2.getCell(fila, 2).value = r.total;
  fila++;
  ws2.getCell(fila, 1).value = "Valor total (Bs)";
  ws2.getCell(fila, 1).font = { bold: true };
  ws2.getCell(fila, 2).value = Number(r.valorTotal.toFixed(2));
  ws2.getCell(fila, 2).numFmt = "#,##0.00";
  fila += 2;

  for (const [titulo, datos] of [
    ["Por categoria", r.porCategoria],
    ["Por estado", r.porEstado],
    ["Por ubicacion", r.porUbicacion],
    ["Por responsable", r.porResponsable],
    ["Por verificacion", r.porVerificacion],
  ] as const) {
    for (const col of [1, 2]) {
      const c = ws2.getCell(fila, col);
      c.value = col === 1 ? titulo : "Cantidad";
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_ARGB } };
    }
    fila++;
    for (const d of datos) {
      ws2.getCell(fila, 1).value = d.clave;
      ws2.getCell(fila, 2).value = d.total;
      fila++;
    }
    fila++;
  }
  ws2.getColumn(1).width = 40;
  ws2.getColumn(2).width = 14;

  // ---------- Hoja Codificacion ----------
  const ws3 = wb.addWorksheet("Codificacion");
  ws3.getCell("A1").value = "CATALOGO DE CODIGOS DE CATEGORIA";
  ws3.getCell("A1").font = { bold: true, size: 13 };
  ["Codigo", "Categoria", "Grupo", "Ejemplo"].forEach((t, i) => {
    const c = ws3.getCell(3, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_ARGB } };
  });
  categorias.forEach((cat, i) => {
    ws3.getCell(4 + i, 1).value = cat.codigo;
    ws3.getCell(4 + i, 2).value = cat.nombre;
    ws3.getCell(4 + i, 3).value = cat.grupo;
    ws3.getCell(4 + i, 4).value = `${PREFIJO}-${cat.codigo}-0001`;
  });
  [12, 40, 28, 20].forEach((w, i) => (ws3.getColumn(i + 1).width = w));

  const buffer = await wb.xlsx.writeBuffer();
  const nombre = `Inventario_${INSTITUCION}_${hoy()}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}

function borde(): Partial<ExcelJS.Borders> {
  const linea = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  return { top: linea, left: linea, bottom: linea, right: linea };
}
