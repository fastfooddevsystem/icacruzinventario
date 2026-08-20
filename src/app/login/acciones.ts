"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoLogin {
  error?: string;
}

/** Traduce los mensajes de error de Supabase Auth. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "El correo aún no fue confirmado. Avise al administrador.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espere un momento e intente de nuevo.";
  return mensaje;
}

/**
 * Unica puerta de entrada al sistema. No hay registro publico: las cuentas
 * las crea el administrador desde el modulo de Administracion.
 */
export async function iniciarSesion(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) return { error: "Complete el correo y la contraseña." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (error) return { error: traducir(error.message) };

  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
