"use server";

import { revalidatePath } from "next/cache";
import { perfilActual } from "@/lib/sesion";
import { BUCKET } from "@/lib/fotos";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoFoto {
  error?: string;
}

/** Tamaño máximo por foto; una foto de celular ronda los 2 o 3 MB. */
const MAXIMO = 8 * 1024 * 1024;

/**
 * Sube una foto y la deja asociada al bien.
 * El archivo va al bucket privado con la sesión del propio usuario, así que
 * es el RLS de Storage el que decide si puede, igual que con el resto de tablas.
 */
export async function subirFoto(
  _previo: EstadoFoto,
  datos: FormData,
): Promise<EstadoFoto> {
  const codigo = String(datos.get("codigo") ?? "").trim();
  const archivo = datos.get("archivo");

  if (!codigo) return { error: "Falta el bien al que pertenece la foto." };
  if (!(archivo instanceof File) || !archivo.size)
    return { error: "Elija una foto para subir." };
  if (!archivo.type.startsWith("image/"))
    return { error: "El archivo debe ser una imagen." };
  if (archivo.size > MAXIMO)
    return { error: "La foto no puede pesar más de 8 MB." };

  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const { data: activo } = await supabase
    .from("activos")
    .select("id, codigo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!activo) return { error: "No se encontró el bien." };

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const ruta = `subidas/${codigo}/${Date.now()}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

  if (errorSubida)
    return { error: `No se pudo subir la foto: ${errorSubida.message}` };

  const { data: foto, error: errorFoto } = await supabase
    .from("fotos")
    .insert({
      ruta,
      alcance: "bien",
      titulo: `${codigo} - foto tomada en sitio`,
      origen: "Subida desde el sistema",
      creado_por: perfil.nombre,
    })
    .select("id")
    .single();

  if (errorFoto || !foto) {
    // Si no se pudo registrar, se retira el archivo para no dejarlo huérfano.
    await supabase.storage.from(BUCKET).remove([ruta]);
    return { error: "La foto se subió pero no se pudo registrar. Intente de nuevo." };
  }

  await supabase
    .from("activo_fotos")
    .insert({ activo_id: activo.id, foto_id: foto.id });

  await supabase.from("movimientos").insert({
    activo_id: activo.id,
    tipo: "FOTO_ALTA",
    detalle: `Foto agregada (${ruta})`,
    usuario: perfil.nombre,
  });

  revalidatePath(`/inventario/${codigo}`);
  return {};
}

/**
 * Quita la foto de ESTE bien y nada mas: borra la fila de activo_fotos.
 * El archivo y la foto siguen existiendo para los demas bienes, que es lo
 * que casi siempre se quiere cuando la foto es la vista general del ambiente.
 */
export async function desvincularFoto(datos: FormData) {
  const codigo = String(datos.get("codigo") ?? "").trim();
  const fotoId = Number(datos.get("foto") ?? 0);
  if (!codigo || !fotoId) return;

  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const [{ data: activo }, { data: foto }] = await Promise.all([
    supabase.from("activos").select("id").eq("codigo", codigo).maybeSingle(),
    supabase.from("fotos").select("ruta").eq("id", fotoId).maybeSingle(),
  ]);
  if (!activo) return;

  const { error } = await supabase
    .from("activo_fotos")
    .delete()
    .eq("activo_id", activo.id)
    .eq("foto_id", fotoId);

  if (error) return;

  await supabase.from("movimientos").insert({
    activo_id: activo.id,
    tipo: "FOTO_BAJA",
    detalle: `Foto quitada de este bien (${foto?.ruta ?? fotoId}). El archivo se conserva para los demas bienes.`,
    usuario: perfil.nombre,
  });

  revalidatePath(`/inventario/${codigo}`);
  revalidatePath("/inventario");
}

/**
 * Elimina la foto del sistema: la fila de fotos, sus vinculos (en cascada)
 * y el archivo del bucket. Solo admin; el RLS lo exige igual.
 *
 * El orden no es casual. Primero se borra la fila y despues el archivo:
 * si fallara el segundo paso queda un archivo huerfano, que solo ocupa
 * espacio. Al reves quedarian filas apuntando a un archivo inexistente,
 * que es justo lo que hace aparecer el aviso de "rutas sin archivo".
 */
export async function eliminarFoto(datos: FormData) {
  const perfil = await perfilActual();
  if (perfil.rol !== "admin") return;

  const codigo = String(datos.get("codigo") ?? "").trim();
  const fotoId = Number(datos.get("foto") ?? 0);
  if (!fotoId) return;

  const supabase = await crearClienteServidor();

  const [{ data: foto }, { data: vinculos }] = await Promise.all([
    supabase.from("fotos").select("ruta").eq("id", fotoId).maybeSingle(),
    supabase.from("activo_fotos").select("activo_id").eq("foto_id", fotoId),
  ]);
  if (!foto) return;

  const afectados = (vinculos ?? []).map((v) => v.activo_id as number);

  const { error } = await supabase.from("fotos").delete().eq("id", fotoId);
  if (error) return;

  // Se registra en la ficha de cada bien que la tenia, no solo en la actual.
  if (afectados.length)
    await supabase.from("movimientos").insert(
      afectados.map((activo_id) => ({
        activo_id,
        tipo: "FOTO_BAJA",
        detalle: `Foto eliminada del sistema (${foto.ruta}), junto con su archivo.`,
        usuario: perfil.nombre,
      })),
    );

  await supabase.storage.from(BUCKET).remove([foto.ruta]);

  revalidatePath(`/inventario/${codigo}`);
  revalidatePath("/inventario");
}
