"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Activo } from "@/lib/tipos";

export interface EstadoActivo {
  error?: string;
}

/** Campos que el usuario puede editar (mismo orden que en el formulario). */
const CAMPOS = [
  "denominacion",
  "marca",
  "modelo",
  "serie",
  "caracteristicas",
  "ubicacion",
  "responsable",
  "estado",
  "procedencia",
  "fecha_adq",
  "valor",
  "observaciones",
] as const;

function leerFormulario(datos: FormData) {
  const texto = (k: string) => String(datos.get(k) ?? "").trim();
  const fecha = texto("fecha_adq");
  return {
    categoria: texto("categoria"),
    denominacion: texto("denominacion"),
    marca: texto("marca"),
    modelo: texto("modelo"),
    serie: texto("serie"),
    caracteristicas: texto("caracteristicas"),
    ubicacion: texto("ubicacion"),
    responsable: texto("responsable"),
    estado: texto("estado") || "Bueno",
    procedencia: texto("procedencia") || "Sin dato",
    fecha_adq: fecha || null,
    valor: Number(texto("valor").replace(",", ".")) || 0,
    observaciones: texto("observaciones"),
  };
}

/** Registra ubicacion y responsable nuevos en sus catalogos. */
async function sembrarCatalogos(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  ubicacion: string,
  responsable: string,
) {
  if (ubicacion)
    await supabase
      .from("ubicaciones")
      .upsert({ nombre: ubicacion }, { onConflict: "nombre" });
  if (responsable)
    await supabase
      .from("responsables")
      .upsert({ nombre: responsable }, { onConflict: "nombre" });
}

export async function crearActivo(
  _previo: EstadoActivo,
  datos: FormData,
): Promise<EstadoActivo> {
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();
  const valores = leerFormulario(datos);

  if (!valores.categoria) return { error: "Seleccione la categoría del bien." };
  if (!valores.denominacion)
    return { error: "La denominación del bien es obligatoria." };

  // El codigo lo genera la base de datos (ICA-CAT-0001) con su trigger.
  const { data, error } = await supabase
    .from("activos")
    .insert({ ...valores, creado_por: perfil.nombre })
    .select("id, codigo")
    .single();

  if (error) return { error: error.message };

  await supabase.from("movimientos").insert({
    activo_id: data.id,
    tipo: "ALTA",
    detalle: `Registro inicial en ${valores.ubicacion || "s/ubicacion"}`,
    usuario: perfil.nombre,
  });

  await sembrarCatalogos(supabase, valores.ubicacion, valores.responsable);

  revalidatePath("/inventario");
  revalidatePath("/panel");
  redirect(`/inventario/${data.codigo}?alta=1`);
}

export async function actualizarActivo(
  _previo: EstadoActivo,
  datos: FormData,
): Promise<EstadoActivo> {
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();
  const codigo = String(datos.get("codigo") ?? "");
  const valores = leerFormulario(datos);

  if (!valores.denominacion)
    return { error: "La denominación del bien es obligatoria." };

  const { data: previo } = await supabase
    .from("activos")
    .select("*")
    .eq("codigo", codigo)
    .single();

  if (!previo) return { error: "No se encontró el bien." };

  // Diferencia legible de lo que cambio, para el historial.
  const anterior = previo as Activo;
  const cambios: string[] = [];
  for (const campo of CAMPOS) {
    const viejo = anterior[campo] ?? "";
    const nuevo = valores[campo] ?? "";
    if (campo === "valor") {
      if (Math.abs(Number(viejo) - Number(nuevo)) > 0.001)
        cambios.push(`valor: ${viejo} -> ${nuevo}`);
    } else if (String(viejo) !== String(nuevo)) {
      cambios.push(`${campo}: '${viejo}' -> '${nuevo}'`);
    }
  }

  const { error } = await supabase
    .from("activos")
    .update(valores)
    .eq("codigo", codigo);

  if (error) return { error: error.message };

  if (cambios.length)
    await supabase.from("movimientos").insert({
      activo_id: anterior.id,
      tipo: "MODIFICACION",
      detalle: cambios.join("; ").slice(0, 600),
      usuario: perfil.nombre,
    });

  await sembrarCatalogos(supabase, valores.ubicacion, valores.responsable);

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${codigo}`);
  revalidatePath("/panel");
  redirect(`/inventario/${codigo}?guardado=1`);
}

/** Elimina un bien. Solo el administrador puede hacerlo (tambien lo exige el RLS). */
export async function eliminarActivo(datos: FormData) {
  const perfil = await perfilActual();
  if (perfil.rol !== "admin") redirect("/inventario");

  const codigo = String(datos.get("codigo") ?? "");
  const supabase = await crearClienteServidor();
  await supabase.from("activos").delete().eq("codigo", codigo);

  revalidatePath("/inventario");
  revalidatePath("/panel");
  redirect("/inventario?eliminado=1");
}
