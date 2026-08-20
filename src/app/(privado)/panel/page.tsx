import Link from "next/link";
import { Barras, Codigo, Indicador, Tarjeta } from "@/components/ui";
import { perfilActual } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { bs, type Activo, type Categoria } from "@/lib/tipos";

/** Agrupa y cuenta por un campo, de mayor a menor. */
function agrupar(
  filas: Activo[],
  campo: keyof Activo,
  traducir?: (v: string) => string,
) {
  const conteo = new Map<string, number>();
  for (const f of filas) {
    const bruto = String(f[campo] ?? "").trim() || "(sin dato)";
    const clave = traducir ? traducir(bruto) : bruto;
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total);
}

export default async function PaginaPanel() {
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const [{ data: activos }, { data: categorias }] = await Promise.all([
    supabase.from("activos").select("*").order("codigo"),
    supabase.from("categorias").select("*"),
  ]);

  const filas = (activos ?? []) as Activo[];
  const nombreCat = new Map(
    ((categorias ?? []) as Categoria[]).map((c) => [c.codigo, c.nombre]),
  );

  const total = filas.length;
  const valorTotal = filas.reduce((s, f) => s + Number(f.valor ?? 0), 0);
  const verificados = filas.filter((f) => f.verificacion === "Verificado").length;
  const pendientes = filas.filter((f) => f.verificacion === "Pendiente").length;
  const ambientes = new Set(
    filas.map((f) => (f.ubicacion ?? "").trim()).filter(Boolean),
  ).size;

  const ultimos = [...filas]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  return (
    <>
      <Tarjeta>
        <p className="text-sm">
          Bienvenido, <strong>{perfil.nombre}</strong>. Este es el resumen del
          inventario institucional.
        </p>
      </Tarjeta>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <Indicador numero={total} etiqueta="Bienes registrados" />
        <Indicador numero={bs(valorTotal)} etiqueta="Valor total (Bs)" />
        <Indicador numero={ambientes} etiqueta="Ambientes" />
        <Indicador numero={verificados} etiqueta="Verificados" />
        <Indicador numero={pendientes} etiqueta="Pendientes" />
      </div>

      <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        <Tarjeta titulo="Por categoría">
          <Barras
            datos={agrupar(filas, "categoria", (c) => nombreCat.get(c) ?? c)}
          />
        </Tarjeta>
        <Tarjeta titulo="Por ubicación">
          <Barras datos={agrupar(filas, "ubicacion")} />
        </Tarjeta>
        <Tarjeta titulo="Por estado de conservación">
          <Barras datos={agrupar(filas, "estado")} />
        </Tarjeta>
        <Tarjeta titulo="Avance de verificación física">
          <Barras datos={agrupar(filas, "verificacion")} />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimos bienes registrados">
        {ultimos.length ? (
          <table className="w-full text-[12.8px]">
            <tbody>
              {ultimos.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2">
                    <Link href={`/inventario/${u.codigo}`} className="hover:underline">
                      <Codigo>{u.codigo}</Codigo>
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2">{u.denominacion}</td>
                  <td className="py-1.5 pr-2">{u.ubicacion || "—"}</td>
                  <td className="py-1.5 text-slate-500">
                    {new Date(u.creado_en).toLocaleDateString("es-BO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[12.5px] text-slate-500">
            Todavía no hay bienes registrados. Comience en{" "}
            <Link href="/inventario/nuevo" className="font-semibold text-siga hover:underline">
              Registrar
            </Link>
            .
          </p>
        )}
      </Tarjeta>
    </>
  );
}
