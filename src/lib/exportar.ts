import { cargarCatalogos, listarActivos, type FiltrosActivos } from "./consultas";
import type { Activo } from "./tipos";

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
] as const;

export type FilaExport = Activo & { categoria_nombre: string };

/** Lee los filtros desde la URL de la petición. */
export function filtrosDesdeUrl(url: string): FiltrosActivos {
  const p = new URL(url).searchParams;
  const v = (k: string) => p.get(k) || undefined;
  return {
    q: v("q"),
    categoria: v("categoria"),
    ubicacion: v("ubicacion"),
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

  const filas: FilaExport[] = activos.map((a) => ({
    ...a,
    categoria_nombre: nombre.get(a.categoria) ?? a.categoria,
  }));

  return { filas, categorias };
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
    porVerificacion: agrupar("verificacion"),
  };
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function ahora() {
  return new Date().toLocaleString("es-BO");
}
