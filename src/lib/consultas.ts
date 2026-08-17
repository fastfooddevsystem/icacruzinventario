import { crearClienteServidor } from "./supabase/server";
import type { Activo, Categoria } from "./tipos";

export interface FiltrosActivos {
  q?: string;
  categoria?: string;
  ubicacion?: string;
  estado?: string;
  verificacion?: string;
}

/**
 * Lista los bienes aplicando los filtros de pantalla.
 * La usan la tabla de inventario, la verificación y las exportaciones,
 * para que todo respete siempre los mismos criterios.
 */
export async function listarActivos(f: FiltrosActivos): Promise<Activo[]> {
  const supabase = await crearClienteServidor();
  let consulta = supabase.from("activos").select("*").order("codigo");

  if (f.q) {
    const t = `%${f.q}%`;
    consulta = consulta.or(
      [
        `codigo.ilike.${t}`,
        `denominacion.ilike.${t}`,
        `marca.ilike.${t}`,
        `modelo.ilike.${t}`,
        `serie.ilike.${t}`,
        `observaciones.ilike.${t}`,
      ].join(","),
    );
  }
  if (f.categoria) consulta = consulta.eq("categoria", f.categoria);
  if (f.ubicacion) consulta = consulta.eq("ubicacion", f.ubicacion);
  if (f.estado) consulta = consulta.eq("estado", f.estado);
  if (f.verificacion) consulta = consulta.eq("verificacion", f.verificacion);

  const { data } = await consulta;
  return (data ?? []) as Activo[];
}

/** Categorías, ubicaciones y responsables para armar los desplegables. */
export async function cargarCatalogos() {
  const supabase = await crearClienteServidor();
  const [{ data: categorias }, { data: ubicaciones }, { data: responsables }] =
    await Promise.all([
      supabase.from("categorias").select("*").order("codigo"),
      supabase.from("ubicaciones").select("nombre").order("nombre"),
      supabase.from("responsables").select("nombre").order("nombre"),
    ]);

  return {
    categorias: (categorias ?? []) as Categoria[],
    ubicaciones: (ubicaciones ?? []).map((u) => u.nombre as string),
    responsables: (responsables ?? []).map((r) => r.nombre as string),
  };
}
