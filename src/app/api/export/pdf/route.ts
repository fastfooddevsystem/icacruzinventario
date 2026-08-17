import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { INSTITUCION } from "@/lib/supabase/config";
import {
  ahora,
  datosExport,
  filtrosDesdeUrl,
  hoy,
  resumen,
  type FilaExport,
} from "@/lib/exportar";

const AZUL: [number, number, number] = [31, 56, 100];

/** Acta de inventario en PDF, con resumen y hoja de firmas. */
export async function GET(request: Request) {
  const { filas } = await datosExport(filtrosDesdeUrl(request.url));
  const r = resumen(filas);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text(`ACTA DE INVENTARIO DE BIENES - ${INSTITUCION}`, ancho / 2, 16, {
    align: "center",
  });
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(85);
  doc.text(
    `Generado el ${ahora()}  |  ${filas.length} bienes registrados`,
    ancho / 2,
    21,
    { align: "center" },
  );
  doc.setTextColor(0);

  const columnas = [
    ["codigo", "Codigo"],
    ["categoria_nombre", "Categoria"],
    ["denominacion", "Denominacion"],
    ["marca", "Marca"],
    ["modelo", "Modelo"],
    ["serie", "Serie"],
    ["ubicacion", "Ubicacion"],
    ["responsable", "Responsable"],
    ["estado", "Estado"],
    ["valor", "Valor Bs"],
  ] as const;

  autoTable(doc, {
    startY: 26,
    margin: { left: 12, right: 12, bottom: 16 },
    head: [columnas.map(([, t]) => t)],
    body: filas.map((f) =>
      columnas.map(([k]) => {
        const v = f[k as keyof FilaExport];
        if (k === "valor")
          return Number(v ?? 0).toLocaleString("es-BO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        return String(v ?? "") || "-";
      }),
    ),
    styles: { fontSize: 7, cellPadding: 1.3, lineWidth: 0.1, lineColor: [154, 165, 177] },
    headStyles: { fillColor: AZUL, textColor: 255, fontSize: 7.2, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [242, 244, 247] },
    columnStyles: { 9: { halign: "right" } },
  });

  // ---------- Resumen ----------
  doc.addPage();
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text("RESUMEN", ancho / 2, 16, { align: "center" });

  const cuerpo: string[][] = [
    ["Total de bienes inventariados", String(r.total)],
    [
      "Valor total registrado (Bs)",
      r.valorTotal.toLocaleString("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
  ];
  for (const [titulo, datos] of [
    ["Por estado", r.porEstado],
    ["Por categoria", r.porCategoria],
    ["Por ubicacion", r.porUbicacion],
    ["Por verificacion", r.porVerificacion],
  ] as const) {
    cuerpo.push([titulo.toUpperCase(), ""]);
    for (const d of datos) cuerpo.push([`    ${d.clave}`, String(d.total)]);
  }

  autoTable(doc, {
    startY: 24,
    margin: { left: 12, right: 12, bottom: 16 },
    head: [["Concepto", "Cantidad"]],
    body: cuerpo,
    styles: { fontSize: 8, cellPadding: 1.6, lineWidth: 0.1, lineColor: [154, 165, 177] },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: (ancho - 24) * 0.7 }, 1: { halign: "right" } },
  });

  // ---------- Firmas ----------
  const tabla = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let y = (tabla?.finalY ?? 24) + 24;
  const alto = doc.internal.pageSize.getHeight();
  if (y > alto - 30) {
    doc.addPage();
    y = 40;
  }

  const tercio = (ancho - 24) / 3;
  const firmas = [
    "Responsable del inventario",
    "Encargado de Sistemas",
    "Direccion",
  ];
  doc.setFontSize(8).setFont("helvetica", "normal");
  firmas.forEach((texto, i) => {
    const cx = 12 + tercio * i + tercio / 2;
    doc.text("_________________________", cx, y, { align: "center" });
    doc.text(texto, cx, y + 5, { align: "center" });
  });

  // ---------- Pie de pagina ----------
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(7).setTextColor(102);
    doc.text(`SIGA - ${INSTITUCION}`, 12, alto - 8);
    doc.text(`Pagina ${p} de ${paginas}`, ancho - 12, alto - 8, {
      align: "right",
    });
  }

  const nombre = `Inventario_${INSTITUCION}_${hoy()}.pdf`;
  return new Response(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
