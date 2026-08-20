import Link from "next/link";
import FiltrosInventario from "@/components/FiltrosInventario";
import EditarBien from "@/components/EditarBien";
import Paginacion from "@/components/Paginacion";
import {
  Codigo,
  EtiquetaEstado,
  EtiquetaVerificacion,
  Tarjeta,
} from "@/components/ui";
import { POR_PAGINA, cargarCatalogos, listarActivosPagina } from "@/lib/consultas";
import { miniaturas } from "@/lib/fotos";

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

  const pedida = Number(uno("pagina"));
  const solicitada = Number.isFinite(pedida) && pedida >= 1 ? Math.trunc(pedida) : 1;

  const [{ activos, total, pagina }, { categorias, ubicaciones, responsables }] =
    await Promise.all([
      listarActivosPagina(filtros, solicitada),
      cargarCatalogos(),
    ]);

  const fotos = await miniaturas(activos.map((a) => a.id));
  const nombreCat = new Map(categorias.map((c) => [c.codigo, c.nombre]));
  // Sin "pagina": las exportaciones se llevan todo lo filtrado, no solo lo visible.
  const consulta = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();

  const retorno = (codigo: string) => {
    const p = new URLSearchParams(consulta);
    if (pagina > 1) p.set("pagina", String(pagina));
    p.set("guardado", codigo);
    return `/inventario?${p.toString()}`;
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total ? (pagina - 1) * POR_PAGINA + 1 : 0;
  const hasta = (pagina - 1) * POR_PAGINA + activos.length;

  return (
    <Tarjeta>
      {uno("guardado") && (
        <div className="noprint mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          Cambios guardados en <strong>{uno("guardado")}</strong>.
        </div>
      )}

      <FiltrosInventario categorias={categorias} ubicaciones={ubicaciones} />

      <div className="noprint mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/inventario/nuevo"
          className="rounded bg-siga px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-siga-claro"
        >
          + Registrar bien
        </Link>
        <a
          href={`/api/export/excel?${consulta}`}
          className="rounded bg-siga px-3 py-1.5 text-[13px] text-white hover:bg-siga-claro"
        >
          Exportar Excel
        </a>
        <a
          href={`/api/export/pdf?${consulta}`}
          className="rounded bg-siga px-3 py-1.5 text-[13px] text-white hover:bg-siga-claro"
        >
          Exportar PDF
        </a>
        <a
          href={`/api/export/pdf?${consulta}${consulta ? "&" : ""}fotos=1`}
          className="rounded border border-siga bg-white px-3 py-1.5 text-[13px] text-siga hover:bg-siga/5"
        >
          PDF con fotos
        </a>
        <a
          href={`/api/export/etiquetas?${consulta}`}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
        >
          Imprimir etiquetas
        </a>
        <span className="ml-auto text-[12.5px] text-slate-500">
          {total
            ? `Mostrando ${desde}–${hasta} de ${total} bien(es)`
            : "0 bien(es) listados"}
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
                "",
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
                  <td className="noprint px-2 py-1.5 text-right">
                    <EditarBien
                      activo={a}
                      categorias={categorias}
                      ubicaciones={ubicaciones}
                      responsables={responsables}
                      foto={fotos.get(a.id)}
                      retorno={retorno(a.codigo)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-2 py-6 text-center text-slate-500"
                >
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        consulta={consulta}
      />
    </Tarjeta>
  );
}
