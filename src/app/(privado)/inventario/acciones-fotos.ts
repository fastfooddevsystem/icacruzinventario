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

  revalidatePath(`/inventario/${codigo}`);
  return {};
}
