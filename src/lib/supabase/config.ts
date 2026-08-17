/** Configuracion compartida de Supabase y de la institucion. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const INSTITUCION =
  process.env.NEXT_PUBLIC_SIGA_INSTITUCION ?? "ICACRUZ";
export const PREFIJO = process.env.NEXT_PUBLIC_SIGA_PREFIJO ?? "ICA";
