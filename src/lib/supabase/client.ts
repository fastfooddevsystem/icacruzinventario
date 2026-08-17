"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente de Supabase para componentes del navegador. */
export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
