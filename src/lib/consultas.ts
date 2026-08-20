import { crearClienteServidor } from "./supabase/server";
import type { Activo, Categoria } from "./tipos";

export interface FiltrosActivos {
  q?: string;
  categoria?: string;
  ubicacion?: string;
  estado?: string;
  verificacion?: string;
}

/** Filas por pantalla en la tabla de inventario. */
export const POR_PAGINA = 50;

type ClienteServidor = Awaited<ReturnType<typeof crearClienteServidor>>;

/** Arma la consulta de bienes con los filtros de pantalla ya aplicados. */
function consultaActivos(
  supabase: ClienteServidor,
  f: FiltrosActivos,
  opciones?: { count: "exact" },
) {
  let consulta = supabase.from("activos").select("*", opciones).order("codigo");

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

  return consulta;
}

/** Tope de filas que devuelve Supabase por consulta. */
const TOPE_SUPABASE = 1000;

/**
 * Lista los bienes aplicando los filtros de pantalla, sin paginar de cara
 * a quien la llama. La usan la verificación y las exportaciones, para que
 * los archivos generados se lleven todo lo filtrado y no solo la página.
 *
 * Internamente sí pagina: Supabase corta en 1000 filas por consulta, así que
 * pedir "todo" de una vez haría que a partir del bien 1001 los archivos
 * exportados y los conteos mintieran en silencio.
 */
export async function listarActivos(f: FiltrosActivos): Promise<Activo[]> {
  const supabase = await crearClienteServidor();
  const todos: Activo[] = [];

  for (let desde = 0; ; desde += TOPE_SUPABASE) {
    const { data } = await consultaActivos(supabase, f).range(
      desde,
      desde + TOPE_SUPABASE - 1,
    );
    const bloque = (data ?? []) as Activo[];
    todos.push(...bloque);
    if (bloque.length < TOPE_SUPABASE) break;
  }

  return todos;
}

/**
 * Igual que listarActivos, pero devuelve una sola página junto con el total
 * de bienes que coinciden con los filtros. Si la página pedida se quedó fuera
 * de rango (por ejemplo al filtrar estando en la página 5), cae en la última.
 */
export async function listarActivosPagina(f: FiltrosActivos, pagina: number) {
  const supabase = await crearClienteServidor();

  const traer = async (p: number) => {
    const desde = (p - 1) * POR_PAGINA;
    const { data, count } = await consultaActivos(supabase, f, {
      count: "exact",
    }).range(desde, desde + POR_PAGINA - 1);
    return { activos: (data ?? []) as Activo[], total: count ?? 0 };
  };

  const primera = await traer(pagina);
  const totalPaginas = Math.max(1, Math.ceil(primera.total / POR_PAGINA));

  if (pagina <= totalPaginas) return { ...primera, pagina };

  const ultima = await traer(totalPaginas);
  return { ...ultima, pagina: totalPaginas };
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
