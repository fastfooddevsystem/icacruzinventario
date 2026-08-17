import type { Metadata } from "next";
import "./globals.css";
import { INSTITUCION } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: `SIGA · Inventario de bienes ${INSTITUCION}`,
  description:
    "Sistema Integrado de Gestión de Activos - Inventario de bienes institucionales",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-100 text-slate-800">
        {children}
      </body>
    </html>
  );
}
