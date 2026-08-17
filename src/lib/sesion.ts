import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";
import type { Perfil } from "./tipos";

/**
 * Devuelve el perfil del usuario con sesion activa.
 * Si no hay sesion, redirige al login.
 */
export async function perfilActual(): Promise<Perfil> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Si el perfil aun no existe, se usa uno minimo con el correo del usuario.
  return (
    (perfil as Perfil | null) ?? {
      id: user.id,
      nombre: user.email ?? "",
      cargo: "",
      rol: "inventariador",
      creado_en: new Date().toISOString(),
    }
  );
}

/** Igual que perfilActual, pero exige rol de administrador. */
export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await perfilActual();
  if (perfil.rol !== "admin") redirect("/panel");
  return perfil;
}
