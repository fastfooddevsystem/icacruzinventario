"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Cambia el rol de un usuario (admin <-> inventariador). */
export async function cambiarRol(datos: FormData) {
  const admin = await exigirAdmin();
  const id = String(datos.get("id") ?? "");
  const rol = String(datos.get("rol") ?? "");

  if (!["admin", "inventariador"].includes(rol)) redirect("/admin");
  // Evita que el administrador se quite el rol a si mismo y quede sin acceso.
  if (id === admin.id) redirect("/admin?error=propio");

  const supabase = await crearClienteServidor();
  await supabase.from("perfiles").update({ rol }).eq("id", id);

  revalidatePath("/admin");
  redirect("/admin?guardado=1");
}

/** Agrega una categoría nueva al catálogo de codificación. */
export async function agregarCategoria(datos: FormData) {
  await exigirAdmin();
  const codigo = String(datos.get("codigo") ?? "").trim().toUpperCase();
  const nombre = String(datos.get("nombre") ?? "").trim();
  const grupo = String(datos.get("grupo") ?? "").trim();

  if (!/^[A-Z]{3}$/.test(codigo)) redirect("/admin?error=codigo");
  if (!nombre) redirect("/admin?error=nombre");

  const supabase = await crearClienteServidor();
  await supabase
    .from("categorias")
    .upsert({ codigo, nombre, grupo }, { onConflict: "codigo" });

  revalidatePath("/admin");
  revalidatePath("/inventario");
  redirect("/admin?guardado=1");
}

/** Agrega una ubicación o un responsable al catálogo correspondiente. */
export async function agregarCatalogo(datos: FormData) {
  await exigirAdmin();
  const tipo = String(datos.get("tipo") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();

  if (!["ubicaciones", "responsables"].includes(tipo)) redirect("/admin");
  if (!nombre) redirect("/admin?error=nombre");

  const supabase = await crearClienteServidor();
  await supabase.from(tipo).upsert({ nombre }, { onConflict: "nombre" });

  revalidatePath("/admin");
  revalidatePath("/inventario");
  redirect("/admin?guardado=1");
}
