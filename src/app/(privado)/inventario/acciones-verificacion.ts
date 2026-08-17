"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Activo } from "@/lib/tipos";

export interface EstadoVerif {
  error?: string;
}

/**
 * Registra la verificación física de un bien: marca la condición encontrada
 * y, si cambiaron, actualiza su ubicación y estado dejando constancia.
 */
export async function verificarActivo(
  _previo: EstadoVerif,
  datos: FormData,
): Promise<EstadoVerif> {
  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const codigo = String(datos.get("codigo") ?? "");
  const condicion = String(datos.get("verificacion") ?? "Verificado");
  const nota = String(datos.get("nota") ?? "").trim();

  const { data: previo } = await supabase
    .from("activos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!previo) return { error: "No se encontró el bien." };
  const a = previo as Activo;

  const ubicacion = String(datos.get("ubicacion") ?? "").trim() || (a.ubicacion ?? "");
  const estado = String(datos.get("estado") ?? "") || a.estado;

  let detalle = `Condicion: ${condicion}`;
  if (ubicacion !== (a.ubicacion ?? ""))
    detalle += `; traslado ${a.ubicacion || "s/d"} -> ${ubicacion}`;
  if (estado !== a.estado) detalle += `; estado ${a.estado} -> ${estado}`;
  if (nota) detalle += `; nota: ${nota}`;

  const { error } = await supabase
    .from("activos")
    .update({
      verificacion: condicion,
      fecha_verif: new Date().toISOString(),
      ubicacion,
      estado,
    })
    .eq("codigo", codigo);

  if (error) return { error: error.message };

  await supabase.from("movimientos").insert({
    activo_id: a.id,
    tipo: "VERIFICACION",
    detalle,
    usuario: perfil.nombre,
  });

  if (ubicacion)
    await supabase
      .from("ubicaciones")
      .upsert({ nombre: ubicacion }, { onConflict: "nombre" });

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${codigo}`);
  revalidatePath("/verificacion");
  revalidatePath("/panel");
  redirect(`/inventario/${codigo}?verificado=1`);
}

/** Inicia una nueva toma de inventario: todo vuelve a Pendiente. Solo admin. */
export async function reiniciarVerificacion() {
  const perfil = await perfilActual();
  if (perfil.rol !== "admin") redirect("/verificacion");

  const supabase = await crearClienteServidor();
  await supabase
    .from("activos")
    .update({ verificacion: "Pendiente", fecha_verif: null })
    .neq("verificacion", "Pendiente");

  revalidatePath("/verificacion");
  revalidatePath("/inventario");
  revalidatePath("/panel");
  redirect("/verificacion?reiniciado=1");
}
