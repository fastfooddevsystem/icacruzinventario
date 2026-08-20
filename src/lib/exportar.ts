import { cargarCatalogos, listarActivos, type FiltrosActivos } from "./consultas";
import { BUCKET, ordenFotos } from "./fotos";
import { crearClienteServidor } from "./supabase/server";
import type { Activo } from "./tipos";

/**
 * Verde institucional del emblema, en los dos formatos que piden las
 * librerias: ARGB para exceljs y RGB para jspdf. Es el mismo --color-siga
 * de globals.css; si cambia alli, cambia aqui.
 */
export const VERDE_ARGB = "FF1B6E3C";
export const VERDE_RGB: [number, number, number] = [27, 110, 60];

/** Columnas de las exportaciones (mismo orden en Excel y PDF). */
export const ENCABEZADOS = [
  ["codigo", "Codigo"],
  ["categoria_nombre", "Categoria"],
  ["denominacion", "Denominacion"],
  ["marca", "Marca"],
  ["modelo", "Modelo"],
  ["serie", "N. Serie"],
  ["caracteristicas", "Caracteristicas"],
  ["ubicacion", "Ubicacion"],
  ["responsable", "Responsable"],
  ["estado", "Estado"],
  ["procedencia", "Procedencia"],
  ["fecha_adq", "Fecha adquisicion"],
  ["valor", "Valor (Bs)"],
  ["verificacion", "Verificacion"],
  ["fecha_verif", "Fecha verificacion"],
  ["observaciones", "Observaciones"],
  ["fotos", "Fotos"],
] as const;

export type FilaExport = Activo & { categoria_nombre: string; fotos: number };

/** Lee los filtros desde la URL de la petición. */
export function filtrosDesdeUrl(url: string): FiltrosActivos {
  const p = new URL(url).searchParams;
  const v = (k: string) => p.get(k) || undefined;
  return {
    q: v("q"),
    categoria: v("categoria"),
    ubicacion: v("ubicacion"),
    responsable: v("responsable"),
    estado: v("estado"),
    verificacion: v("verificacion"),
  };
}

/**
 * Trae los bienes que coinciden con los filtros de pantalla, ya con el
 * nombre legible de la categoría, para que las exportaciones y la tabla
 * muestren siempre lo mismo.
 */
export async function datosExport(filtros: FiltrosActivos) {
  const [activos, { categorias }] = await Promise.all([
    listarActivos(filtros),
    cargarCatalogos(),
  ]);
  const nombre = new Map(categorias.map((c) => [c.codigo, c.nombre]));

  const fotos = await contarFotos(activos.map((a) => a.id));

  const filas: FilaExport[] = activos.map((a) => ({
    ...a,
    categoria_nombre: nombre.get(a.categoria) ?? a.categoria,
    fotos: fotos.get(a.id) ?? 0,
  }));

  return { filas, categorias };
}

/**
 * Cuantas fotos tiene cada bien. Si la tabla todavia no existe en la base
 * (04_fotos.sql sin aplicar), devuelve el mapa vacio en vez de romper la
 * exportacion entera: la columna sale en cero y el archivo se genera igual.
 */
async function contarFotos(ids: number[]): Promise<Map<number, number>> {
  const cuenta = new Map<number, number>();
  if (!ids.length) return cuenta;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("activo_fotos")
    .select("activo_id")
    .in("activo_id", ids);

  if (error) return cuenta;
  for (const f of data ?? [])
    cuenta.set(f.activo_id as number, (cuenta.get(f.activo_id as number) ?? 0) + 1);
  return cuenta;
}

/** Resumen agrupado que va al final del Excel y del PDF. */
export function resumen(filas: FilaExport[]) {
  const agrupar = (campo: keyof FilaExport) => {
    const m = new Map<string, number>();
    for (const f of filas) {
      const k = String(f[campo] ?? "").trim() || "(sin dato)";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([clave, total]) => ({ clave, total }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    total: filas.length,
    valorTotal: filas.reduce((s, f) => s + Number(f.valor ?? 0), 0),
    porCategoria: agrupar("categoria_nombre"),
    porEstado: agrupar("estado"),
    porUbicacion: agrupar("ubicacion"),
    porResponsable: agrupar("responsable"),
    porVerificacion: agrupar("verificacion"),
  };
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function ahora() {
  return new Date().toLocaleString("es-BO");
}

export interface FotoAnexo {
  codigo: string;
  denominacion: string;
  ubicacion: string;
  esDelAmbiente: boolean;
  /** La imagen en base64, que es lo que sabe insertar jspdf. */
  dataUrl: string;
}

/** Cuántas fotos entran como máximo en el anexo, para que el PDF no se dispare. */
export const TOPE_ANEXO = 60;

/**
 * Una foto por bien para el anexo del acta, prefiriendo la del bien mismo
 * antes que la del ambiente. Descarga desde el bucket privado, así que solo
 * funciona con la sesión del usuario que pidió la exportación.
 */
export async function fotosParaAnexo(
  filas: FilaExport[],
): Promise<{ fotos: FotoAnexo[]; omitidos: number }> {
  const conFoto = filas.filter((f) => f.fotos > 0);
  if (!conFoto.length) return { fotos: [], omitidos: 0 };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("activo_fotos")
    .select("activo_id, fotos(ruta, alcance, creado_en)")
    .in("activo_id", conFoto.map((f) => f.id));

  if (error) return { fotos: [], omitidos: 0 };

  // Una sola foto por bien, con la misma regla que usa la galeria:
  // la del bien le gana a la del ambiente, y la mas reciente a la vieja.
  type Elegible = { ruta: string; alcance: string; creado_en: string };
  const elegida = new Map<number, Elegible>();
  for (const v of data ?? []) {
    const foto = (Array.isArray(v.fotos) ? v.fotos[0] : v.fotos) as
      | Elegible
      | undefined;
    if (!foto) continue;
    const previa = elegida.get(v.activo_id as number);
    if (!previa || ordenFotos(foto, previa) < 0)
      elegida.set(v.activo_id as number, foto);
  }

  const candidatos = conFoto.filter((f) => elegida.has(f.id));
  const seleccion = candidatos.slice(0, TOPE_ANEXO);

  const fotos: FotoAnexo[] = [];
  // De a seis para no abrir sesenta descargas a la vez.
  for (let i = 0; i < seleccion.length; i += 6) {
    const lote = await Promise.all(
      seleccion.slice(i, i + 6).map(async (f) => {
        const foto = elegida.get(f.id)!;
        const { data: archivo } = await supabase.storage
          .from(BUCKET)
          .download(foto.ruta);
        if (!archivo) return null;
        const base64 = Buffer.from(await archivo.arrayBuffer()).toString("base64");
        return {
          codigo: f.codigo,
          denominacion: f.denominacion,
          ubicacion: f.ubicacion ?? "",
          esDelAmbiente: foto.alcance === "puesto",
          dataUrl: `data:image/jpeg;base64,${base64}`,
        };
      }),
    );
    fotos.push(...lote.filter((x): x is FotoAnexo => x !== null));
  }

  return { fotos, omitidos: candidatos.length - seleccion.length };
}
