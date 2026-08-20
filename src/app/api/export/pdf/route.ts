import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { INSTITUCION } from "@/lib/supabase/config";
import {
  ahora,
  datosExport,
  filtrosDesdeUrl,
  fotosParaAnexo,
  hoy,
  resumen,
  TOPE_ANEXO,
  VERDE_RGB,
  type FilaExport,
} from "@/lib/exportar";

/** Acta de inventario en PDF, con resumen y hoja de firmas. */
export async function GET(request: Request) {
  const { filas } = await datosExport(filtrosDesdeUrl(request.url));
  const r = resumen(filas);
  // El anexo se pide aparte porque descargar las fotos es lo caro del informe.
  const conAnexo = new URL(request.url).searchParams.get("fotos") === "1";

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
    ["fotos", "Fotos"],
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
    headStyles: { fillColor: VERDE_RGB, textColor: 255, fontSize: 7.2, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [242, 244, 247] },
    columnStyles: { 9: { halign: "right" }, 10: { halign: "center", cellWidth: 12 } },
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
    headStyles: { fillColor: VERDE_RGB, textColor: 255, fontStyle: "bold" },
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

  // ---------- Anexo fotografico ----------
  if (conAnexo) {
    const { fotos, omitidos } = await fotosParaAnexo(filas);

    if (fotos.length) {
      doc.addPage();
      doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(0);
      doc.text("ANEXO FOTOGRAFICO", ancho / 2, 16, { align: "center" });
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(85);
      doc.text(
        omitidos
          ? `${fotos.length} fotos (se omitieron ${omitidos} por el limite de ${TOPE_ANEXO}; filtre por ambiente para verlas)`
          : `${fotos.length} fotos`,
        ancho / 2,
        21,
        { align: "center" },
      );
      doc.setTextColor(0);

      const COLS = 3;
      const FILAS = 2;
      const margen = 12;
      const anchoCelda = (ancho - margen * 2) / COLS;
      const altoCelda = (alto - 34) / FILAS;

      fotos.forEach((f, i) => {
        const enPagina = i % (COLS * FILAS);
        if (i > 0 && enPagina === 0) {
          doc.addPage();
          doc.setFont("helvetica", "bold").setFontSize(15);
          doc.text("ANEXO FOTOGRAFICO", ancho / 2, 16, { align: "center" });
        }

        const cx = margen + (enPagina % COLS) * anchoCelda;
        const cy = 26 + Math.floor(enPagina / COLS) * altoCelda;
        const cajaAlto = altoCelda - 14;
        const cajaAncho = anchoCelda - 6;

        // Se respeta la proporcion de la foto para que no salga deformada.
        const prop = doc.getImageProperties(f.dataUrl);
        const escala = Math.min(cajaAncho / prop.width, cajaAlto / prop.height);
        const w = prop.width * escala;
        const h = prop.height * escala;

        doc.addImage(
          f.dataUrl,
          "JPEG",
          cx + (cajaAncho - w) / 2 + 3,
          cy + (cajaAlto - h) / 2,
          w,
          h,
        );

        doc.setFont("courier", "bold").setFontSize(8).setTextColor(...VERDE_RGB);
        doc.text(f.codigo, cx + anchoCelda / 2, cy + cajaAlto + 5, {
          align: "center",
        });
        doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(70);
        const pie = `${f.denominacion}${f.ubicacion ? " - " + f.ubicacion : ""}`;
        doc.text(
          doc.splitTextToSize(pie, cajaAncho)[0] +
            (f.esDelAmbiente ? " (ambiente)" : ""),
          cx + anchoCelda / 2,
          cy + cajaAlto + 9,
          { align: "center" },
        );
        doc.setTextColor(0);
      });
    }
  }

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
