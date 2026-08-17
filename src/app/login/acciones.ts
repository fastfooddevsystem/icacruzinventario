"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoLogin {
  error?: string;
  aviso?: string;
}

/** Traduce los mensajes de error de Supabase Auth. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "El correo aún no fue confirmado. Revise su bandeja de entrada.";
  if (m.includes("user already registered"))
    return "Ese correo ya está registrado. Inicie sesión.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espere un momento e intente de nuevo.";
  return mensaje;
}

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

export async function registrarse(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();

  if (!correo || !clave || !nombre)
    return { error: "Complete su nombre, correo y contraseña." };
  if (clave.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: clave,
    options: { data: { nombre } },
  });

  if (error) return { error: traducir(error.message) };

  // Si el proyecto exige confirmar el correo, no viene sesion todavia.
  if (!data.session)
    return {
      aviso:
        "Cuenta creada. Revise su correo para confirmarla y luego inicie sesión.",
    };

  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
