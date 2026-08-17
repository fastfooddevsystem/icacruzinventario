import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EtiquetaEstado,
  EtiquetaVerificacion,
  Tarjeta,
} from "@/components/ui";
import { perfilActual } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { bs, type Activo, type Categoria, type Movimiento } from "@/lib/tipos";
import { eliminarActivo } from "../acciones";
import PanelVerificacion from "./PanelVerificacion";

export default async function PaginaFicha({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { codigo } = await params;
  const sp = await searchParams;
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const { data: activo } = await supabase
    .from("activos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!activo) notFound();
  const a = activo as Activo;

  const [{ data: movimientos }, { data: categoria }, { data: ubicaciones }] =
    await Promise.all([
      supabase
        .from("movimientos")
        .select("*")
        .eq("activo_id", a.id)
        .order("id", { ascending: false }),
      supabase
        .from("categorias")
        .select("*")
        .eq("codigo", a.categoria)
        .maybeSingle(),
      supabase.from("ubicaciones").select("nombre").order("nombre"),
    ]);

  const nombreCategoria = (categoria as Categoria | null)?.nombre ?? a.categoria;

  return (
    <>
      {sp.alta && (
        <Aviso>
          Bien registrado con el código <strong>{a.codigo}</strong>.
        </Aviso>
      )}
      {sp.guardado && <Aviso>Cambios guardados correctamente.</Aviso>}
      {sp.verificado && <Aviso>Verificación registrada.</Aviso>}

      <Tarjeta>
        {/* Encabezado: el código es el identificador del bien */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="font-mono text-2xl font-bold tracking-wide text-[#1f3864]">
              {a.codigo}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold">
              {a.denominacion}
            </div>
            <div className="text-[12.5px] text-slate-500">{nombreCategoria}</div>
          </div>
          <div className="noprint flex flex-wrap gap-2">
            <Link
              href={`/inventario/${a.codigo}/editar`}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
            >
              Editar datos
            </Link>
            <Link
              href="/inventario"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
            >
              Volver al inventario
            </Link>
            {perfil.rol === "admin" && (
              <form action={eliminarActivo}>
                <input type="hidden" name="codigo" value={a.codigo} />
                <button
                  type="submit"
                  className="rounded border border-red-200 bg-white px-3 py-1.5 text-[13px] text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <Dato etiqueta="Marca / Modelo">
            {[a.marca, a.modelo].filter(Boolean).join(" ") || "—"}
          </Dato>
          <Dato etiqueta="Nº de serie">{a.serie || "—"}</Dato>
          <Dato etiqueta="Ubicación">{a.ubicacion || "—"}</Dato>
          <Dato etiqueta="Responsable">{a.responsable || "—"}</Dato>
          <Dato etiqueta="Estado">
            <EtiquetaEstado estado={a.estado} />
          </Dato>
          <Dato etiqueta="Procedencia">{a.procedencia}</Dato>
          <Dato etiqueta="Fecha adquisición">{a.fecha_adq || "—"}</Dato>
          <Dato etiqueta="Valor (Bs)">{bs(a.valor)}</Dato>
          <Dato etiqueta="Verificación">
            <EtiquetaVerificacion valor={a.verificacion} />
            {a.fecha_verif && (
              <span className="ml-1.5 text-[11.5px] text-slate-500">
                {new Date(a.fecha_verif).toLocaleString("es-BO")}
              </span>
            )}
          </Dato>
          <Dato etiqueta="Registrado por">{a.creado_por || "—"}</Dato>
        </div>

        {a.caracteristicas && (
          <div className="mt-3">
            <Dato etiqueta="Características">{a.caracteristicas}</Dato>
          </div>
        )}
        {a.observaciones && (
          <div className="mt-3">
            <Dato etiqueta="Observaciones">{a.observaciones}</Dato>
          </div>
        )}
      </Tarjeta>

      <PanelVerificacion
        codigo={a.codigo}
        ubicacionActual={a.ubicacion ?? ""}
        estadoActual={a.estado}
        ubicaciones={(ubicaciones ?? []).map((u) => u.nombre as string)}
      />

      <Tarjeta titulo="Historial (trazabilidad)">
        {(movimientos ?? []).length ? (
          <table className="w-full text-[12.5px]">
            <tbody>
              {(movimientos as Movimiento[]).map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap py-1.5 pr-3 align-top text-slate-500">
                    {new Date(m.fecha).toLocaleString("es-BO")}
                  </td>
                  <td className="py-1.5 pr-3 align-top">
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-px text-[11px]">
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 align-top">{m.detalle}</td>
                  <td className="py-1.5 align-top text-slate-500">
                    {m.usuario}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[12.5px] text-slate-500">Sin movimientos.</p>
        )}
      </Tarjeta>
    </>
  );
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </div>
      <div className="text-[13.5px]">{children}</div>
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="noprint mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
      {children}
    </div>
  );
}
