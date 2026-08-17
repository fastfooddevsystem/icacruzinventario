/** Tipos de datos del sistema (reflejan las tablas de Supabase). */

export type Rol = "admin" | "inventariador";

export interface Perfil {
  id: string;
  nombre: string;
  cargo: string | null;
  rol: Rol;
  creado_en: string;
}

export interface Categoria {
  codigo: string;
  nombre: string;
  grupo: string;
}

export interface Activo {
  id: number;
  codigo: string;
  categoria: string;
  denominacion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  caracteristicas: string | null;
  ubicacion: string | null;
  responsable: string | null;
  estado: string;
  procedencia: string;
  fecha_adq: string | null;
  valor: number;
  observaciones: string | null;
  verificacion: string;
  fecha_verif: string | null;
  creado_en: string;
  creado_por: string | null;
  actualizado_en: string;
}

export interface Movimiento {
  id: number;
  activo_id: number;
  fecha: string;
  tipo: string;
  detalle: string | null;
  usuario: string | null;
}

/** Catalogos fijos: coinciden exactamente con los valores guardados en la base. */
export const ESTADOS = [
  "Bueno",
  "Regular",
  "Malo",
  "En reparacion",
  "Dado de baja",
] as const;

export const PROCEDENCIAS = [
  "Compra",
  "Donacion",
  "Transferencia",
  "Comodato",
  "Sin dato",
] as const;

export const CONDICIONES_VERIF = [
  "Pendiente",
  "Verificado",
  "No ubicado",
  "Sobrante",
] as const;

/** Formatea un monto en bolivianos. */
export function bs(valor: number | null | undefined): string {
  return Number(valor ?? 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
