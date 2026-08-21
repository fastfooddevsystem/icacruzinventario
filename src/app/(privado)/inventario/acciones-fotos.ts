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

/**
 * Vincula una foto YA subida a otros bienes, sin volver a subir el archivo.
 *
 * Es lo que hace posible el concepto de "vista de ambiente" desde la
 * aplicacion: una sola foto del escritorio documenta el monitor, la CPU y el
 * teclado. Sin esto, cada bien exige su propia foto y una renovacion del
 * inventario pasa de 122 fotos a 274.
 *
 * Se puede indicar los codigos a mano o pedir todos los bienes de una
 * ubicacion, que es lo practico cuando el ambiente tiene decenas de bienes.
 *
 * No se toca el `alcance` de la foto a proposito. Marcarla como 'puesto' por
 * el hecho de compartirse la haria perder contra cualquier foto vieja de
 * alcance 'bien' en `ordenFotos()`, y el acta seguiria mostrando la foto
 * anterior: justo lo contrario de lo que se busca al refotografiar.
 */
export async function vincularFoto(
  _previo: EstadoFoto & { aviso?: string },
  datos: FormData,
): Promise<EstadoFoto & { aviso?: string }> {
  const codigo = String(datos.get("codigo") ?? "").trim();
  const fotoId = Number(datos.get("foto") ?? 0);
  const porUbicacion = String(datos.get("modo") ?? "") === "ubicacion";
  const ubicacion = String(datos.get("ubicacion") ?? "").trim();

  if (!fotoId) return { error: "No se indicó la foto." };

  const perfil = await perfilActual();
  const supabase = await crearClienteServidor();

  const { data: foto } = await supabase
    .from("fotos")
    .select("id, ruta")
    .eq("id", fotoId)
    .maybeSingle();
  if (!foto) return { error: "La foto ya no existe." };

  // 1. A qué bienes hay que vincularla
  let destinos: { id: number; codigo: string }[] = [];
  let faltantes: string[] = [];

  if (porUbicacion) {
    if (!ubicacion)
      return { error: "Este bien no tiene ubicación cargada, así que no se puede usar ese modo." };
    const { data, error } = await supabase
      .from("activos")
      .select("id, codigo")
      .eq("ubicacion", ubicacion);
    if (error) return { error: `No se pudieron leer los bienes: ${error.message}` };
    destinos = (data ?? []) as { id: number; codigo: string }[];
  } else {
    const pedidos = [
      ...new Set(
        String(datos.get("codigos") ?? "")
          .split(/[\s,;]+/)
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean),
      ),
    ];
    if (!pedidos.length)
      return { error: "Escriba al menos un código de bien." };

    const { data, error } = await supabase
      .from("activos")
      .select("id, codigo")
      .in("codigo", pedidos);
    if (error) return { error: `No se pudieron leer los bienes: ${error.message}` };

    destinos = (data ?? []) as { id: number; codigo: string }[];
    const hallados = new Set(destinos.map((d) => d.codigo));
    faltantes = pedidos.filter((c) => !hallados.has(c));
  }

  if (!destinos.length)
    return {
      error: faltantes.length
        ? `Ningún código existe en el inventario: ${faltantes.join(", ")}`
        : "No se encontró ningún bien para vincular.",
    };

  // 2. Se descartan los que ya la tienen, para no duplicar ni ensuciar el historial
  const { data: yaLaTienen } = await supabase
    .from("activo_fotos")
    .select("activo_id")
    .eq("foto_id", fotoId)
    .in(
      "activo_id",
      destinos.map((d) => d.id),
    );

  const conocidos = new Set((yaLaTienen ?? []).map((v) => v.activo_id as number));
  const nuevos = destinos.filter((d) => !conocidos.has(d.id));

  if (!nuevos.length)
    return {
      aviso: `Esa foto ya estaba puesta en ${destinos.length === 1 ? "ese bien" : `esos ${destinos.length} bienes`}. No se cambió nada.`,
    };

  const { error: errorVinculo } = await supabase
    .from("activo_fotos")
    .insert(nuevos.map((d) => ({ activo_id: d.id, foto_id: fotoId })));

  if (errorVinculo)
    return { error: `No se pudo vincular la foto: ${errorVinculo.message}` };

  await supabase.from("movimientos").insert(
    nuevos.map((d) => ({
      activo_id: d.id,
      tipo: "FOTO_ALTA",
      detalle: `Foto compartida desde ${codigo} (${foto.ruta}).`,
      usuario: perfil.nombre,
    })),
  );

  if (codigo) revalidatePath(`/inventario/${codigo}`);
  revalidatePath("/inventario");

  const omitidos = destinos.length - nuevos.length;
  return {
    aviso:
      `Foto agregada a ${nuevos.length} bien(es).` +
      (omitidos ? ` ${omitidos} ya la tenían.` : "") +
      (faltantes.length ? ` No existen en el inventario: ${faltantes.join(", ")}.` : ""),
  };
}
