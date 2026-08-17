import Link from "next/link";
import FiltrosInventario from "@/components/FiltrosInventario";
import {
  Codigo,
  EtiquetaEstado,
  EtiquetaVerificacion,
  Tarjeta,
} from "@/components/ui";
import { cargarCatalogos, listarActivos } from "@/lib/consultas";

export default async function PaginaInventario({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const uno = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };

  const filtros = {
    q: uno("q"),
    categoria: uno("categoria"),
    ubicacion: uno("ubicacion"),
    estado: uno("estado"),
    verificacion: uno("verificacion"),
  };

  const [activos, { categorias, ubicaciones }] = await Promise.all([
    listarActivos(filtros),
    cargarCatalogos(),
  ]);

  const nombreCat = new Map(categorias.map((c) => [c.codigo, c.nombre]));
  const consulta = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <Tarjeta>
      <FiltrosInventario categorias={categorias} ubicaciones={ubicaciones} />

      <div className="noprint mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/inventario/nuevo"
          className="rounded bg-[#1f3864] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#2d4f8f]"
        >
          + Registrar bien
        </Link>
        <a
          href={`/api/export/excel?${consulta}`}
          className="rounded bg-[#1f3864] px-3 py-1.5 text-[13px] text-white hover:bg-[#2d4f8f]"
        >
          Exportar Excel
        </a>
        <a
          href={`/api/export/pdf?${consulta}`}
          className="rounded bg-[#1f3864] px-3 py-1.5 text-[13px] text-white hover:bg-[#2d4f8f]"
        >
          Exportar PDF
        </a>
        <a
          href={`/api/export/etiquetas?${consulta}`}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
        >
          Imprimir etiquetas
        </a>
        <span className="ml-auto text-[12.5px] text-slate-500">
          {activos.length} bien(es) listados
        </span>
      </div>

      <div className="max-h-[63vh] overflow-auto rounded border border-slate-300">
        <table className="w-full border-collapse text-[12.8px]">
          <thead>
            <tr>
              {[
                "Código",
                "Denominación",
                "Categoría",
                "Marca / Modelo",
                "Serie",
                "Ubicación",
                "Responsable",
                "Estado",
                "Verif.",
              ].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 whitespace-nowrap border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activos.length ? (
              activos.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1.5">
                    <Link href={`/inventario/${a.codigo}`} className="hover:underline">
                      <Codigo>{a.codigo}</Codigo>
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">
                    <Link href={`/inventario/${a.codigo}`} className="hover:underline">
                      {a.denominacion}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">
                    {nombreCat.get(a.categoria) ?? a.categoria}
                  </td>
                  <td className="px-2 py-1.5">
                    {[a.marca, a.modelo].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-2 py-1.5">{a.serie || "—"}</td>
                  <td className="px-2 py-1.5">{a.ubicacion || "—"}</td>
                  <td className="px-2 py-1.5">{a.responsable || "—"}</td>
                  <td className="px-2 py-1.5">
                    <EtiquetaEstado estado={a.estado} />
                  </td>
                  <td className="px-2 py-1.5">
                    <EtiquetaVerificacion valor={a.verificacion} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-slate-500"
                >
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
