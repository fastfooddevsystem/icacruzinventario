import Link from "next/link";
import {
  Codigo,
  EtiquetaEstado,
  Indicador,
  Tarjeta,
} from "@/components/ui";
import { perfilActual } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Activo } from "@/lib/tipos";
import { reiniciarVerificacion } from "../inventario/acciones-verificacion";
import BuscarCodigo from "./BuscarCodigo";

export default async function PaginaVerificacion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const { data } = await supabase.from("activos").select("*").order("codigo");
  const activos = (data ?? []) as Activo[];

  const total = activos.length;
  const cuenta = (v: string) =>
    activos.filter((a) => a.verificacion === v).length;
  const verificados = cuenta("Verificado");
  const pendientes = activos.filter((a) => a.verificacion === "Pendiente");
  const avance = total ? Math.round((verificados / total) * 100) : 0;

  return (
    <>
      {sp.reiniciado && (
        <div className="noprint mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          Nueva toma de inventario iniciada: todos los bienes quedaron en
          Pendiente.
        </div>
      )}

      <Tarjeta titulo="Toma de inventario físico">
        <div className="noprint mb-3 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
          Recorra los ambientes con el celular. Lea el <strong>código</strong>{" "}
          pegado en cada bien, escríbalo aquí y presione Enter: se abre su ficha
          para confirmar ubicación y estado. Los bienes que queden en{" "}
          <strong>Pendiente</strong> al final son los faltantes.
        </div>

        <BuscarCodigo />

        <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          <Indicador numero={`${avance}%`} etiqueta="Avance" />
          <Indicador numero={verificados} etiqueta="Verificados" />
          <Indicador numero={pendientes.length} etiqueta="Pendientes" />
          <Indicador numero={cuenta("No ubicado")} etiqueta="No ubicados" />
          <Indicador numero={cuenta("Sobrante")} etiqueta="Sobrantes" />
        </div>

        {perfil.rol === "admin" && (
          <form action={reiniciarVerificacion} className="noprint mt-3.5">
            <button
              type="submit"
              className="rounded border border-red-200 bg-white px-3 py-1.5 text-[13px] text-red-700 hover:bg-red-50"
            >
              Iniciar nueva toma de inventario
            </button>
            <p className="mt-1 text-[11.5px] text-slate-500">
              Marca todos los bienes como Pendiente. Úselo solo al comenzar un
              inventario nuevo.
            </p>
          </form>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Bienes aún pendientes de verificar (${pendientes.length})`}>
        <div className="max-h-[45vh] overflow-auto rounded border border-slate-300">
          <table className="w-full text-[12.8px]">
            <thead>
              <tr>
                {[
                  "Código",
                  "Denominación",
                  "Marca / Modelo",
                  "Ubicación",
                  "Responsable",
                  "Estado",
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
              {pendientes.length ? (
                pendientes.map((a) => (
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
                      {[a.marca, a.modelo].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-2 py-1.5">{a.ubicacion || "—"}</td>
                    <td className="px-2 py-1.5">{a.responsable || "—"}</td>
                    <td className="px-2 py-1.5">
                      <EtiquetaEstado estado={a.estado} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                    {total
                      ? "No quedan bienes pendientes. Inventario completo."
                      : "Todavía no hay bienes registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}
