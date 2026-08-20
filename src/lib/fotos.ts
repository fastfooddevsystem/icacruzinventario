import { crearClienteServidor } from "./supabase/server";

/** Bucket privado donde viven los archivos. */
export const BUCKET = "bienes";

/** Cuánto dura el enlace firmado de una foto (1 hora). */
const VIGENCIA = 60 * 60;

export interface ResultadoFotos {
  fotos: Foto[];
  /** Qué salió mal, si salió mal. Se muestra para no fallar en silencio. */
  problema?: string;
}

export interface Foto {
  id: number;
  ruta: string;
  alcance: "bien" | "puesto";
  titulo: string;
  origen: string;
  /** Enlace temporal para mostrarla; el bucket es privado. */
  url: string;
}

/**
 * Fotos de un bien, con enlaces firmados listos para usar en un <img>.
 * Primero las del bien en particular y después las del ambiente, porque
 * una foto del escritorio completo dice menos que la del equipo mismo.
 */
export async function fotosDelActivo(activoId: number): Promise<ResultadoFotos> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("activo_fotos")
    .select("fotos(id, ruta, alcance, titulo, origen)")
    .eq("activo_id", activoId);

  if (error) {
    console.error("[fotos] no se pudo leer activo_fotos:", error.message);
    return { fotos: [], problema: `No se pudieron leer las fotos: ${error.message}` };
  }

  const fotos = (data ?? [])
    .flatMap((f) => f.fotos ?? [])
    .sort((x, y) => (x.alcance === y.alcance ? 0 : x.alcance === "bien" ? -1 : 1));

  if (!fotos.length) return { fotos: [] };

  const { data: firmadas, error: errorUrl } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(fotos.map((f) => f.ruta), VIGENCIA);

  if (errorUrl) {
    console.error("[fotos] no se pudieron firmar las URLs:", errorUrl.message);
    return {
      fotos: [],
      problema: `Las fotos están registradas pero no se pudo acceder al archivo: ${errorUrl.message}`,
    };
  }

  const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  const conUrl = fotos.map((f) => ({ ...f, url: url.get(f.ruta) ?? "" })) as Foto[];
  const rotas = conUrl.filter((f) => !f.url);

  if (rotas.length) {
    console.error("[fotos] rutas sin archivo en el bucket:",
                  rotas.map((f) => f.ruta).join(", "));
  }

  return {
    fotos: conUrl.filter((f) => f.url),
    problema: rotas.length
      ? `${rotas.length} foto(s) registradas no existen en el bucket con esa ruta (ej. ${rotas[0].ruta}). Revise supabase/06_diagnostico_fotos.sql`
      : undefined,
  };
}

/**
 * Una miniatura por bien para la tabla de inventario: la foto del propio
 * bien si la tiene, y si no la del ambiente. Se resuelve en dos consultas
 * para toda la página, no una por fila.
 */
export async function miniaturas(ids: number[]): Promise<Map<number, string>> {
  const salida = new Map<number, string>();
  if (!ids.length) return salida;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("activo_fotos")
    .select("activo_id, fotos(ruta, alcance)")
    .in("activo_id", ids);

  if (error) {
    console.error("[fotos] miniaturas:", error.message);
    return salida;
  }

  const elegida = new Map<number, { ruta: string; alcance: string }>();
  for (const v of data ?? []) {
    const foto = (Array.isArray(v.fotos) ? v.fotos[0] : v.fotos) as
      | { ruta: string; alcance: string }
      | undefined;
    if (!foto) continue;
    const previa = elegida.get(v.activo_id as number);
    if (!previa || (previa.alcance === "puesto" && foto.alcance === "bien"))
      elegida.set(v.activo_id as number, foto);
  }
  if (!elegida.size) return salida;

  const rutas = [...elegida.values()].map((f) => f.ruta);
  const { data: firmadas } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rutas, VIGENCIA);

  const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  for (const [activoId, foto] of elegida) {
    const u = url.get(foto.ruta);
    if (u) salida.set(activoId, u);
  }
  return salida;
}
