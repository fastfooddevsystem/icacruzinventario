import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente de Supabase para el servidor (Server Components y Server Actions). */
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(porGuardar) {
        try {
          porGuardar.forEach(({ name, value, options }) =>
            almacen.set(name, value, options),
          );
        } catch {
          // Los Server Components no pueden escribir cookies: lo hace el middleware.
        }
      },
    },
  });
}
