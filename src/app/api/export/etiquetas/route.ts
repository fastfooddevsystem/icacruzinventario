import { jsPDF } from "jspdf";
import { INSTITUCION } from "@/lib/supabase/config";
import { datosExport, filtrosDesdeUrl, hoy } from "@/lib/exportar";

/**
 * Hoja A4 de etiquetas imprimibles (3 columnas x 8 filas = 24 por hoja).
 * Cada etiqueta lleva el codigo del bien en grande, para pegarla y luego
 * leerla al hacer la verificacion fisica.
 */
export async function GET(request: Request) {
  const { filas } = await datosExport(filtrosDesdeUrl(request.url));

  if (!filas.length)
    return new Response("No hay bienes que coincidan con el filtro.", {
      status: 400,
    });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const cols = 3;
  const rows = 8;
  const mx = 8;
  const my = 10;
  const cw = (W - 2 * mx) / cols;
  const ch = (H - 2 * my) / rows;

  filas.forEach((f, i) => {
    const pos = i % (cols * rows);
    if (i && pos === 0) doc.addPage();

    const cx = mx + (pos % cols) * cw;
    const cy = my + Math.floor(pos / cols) * ch;

    // Recorte punteado de la etiqueta
    doc.setLineWidth(0.3).setDrawColor(150);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(cx + 1.5, cy + 1.5, cw - 3, ch - 3);
    doc.setLineDashPattern([], 0);

    const tx = cx + 5;
    let ty = cy + 8;

    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(80);
    doc.text(INSTITUCION, tx, ty);

    // El codigo es el identificador del bien: va en grande y destacado
    ty += 8;
    doc.setFont("courier", "bold").setFontSize(15).setTextColor(31, 56, 100);
    doc.text(f.codigo, tx, ty);

    ty += 6;
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(40);
    doc
      .splitTextToSize(f.denominacion ?? "", cw - 10)
      .slice(0, 2)
      .forEach((linea: string) => {
        doc.text(linea, tx, ty);
        ty += 3.2;
      });

    doc.setFont("helvetica", "italic").setFontSize(6.5).setTextColor(110);
    doc.text(String(f.ubicacion ?? "").slice(0, 30), tx, cy + ch - 5);
  });

  return new Response(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Etiquetas_${hoy()}.pdf"`,
    },
  });
}
