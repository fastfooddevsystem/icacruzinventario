import Navegacion from "@/components/Navegacion";
import { perfilActual } from "@/lib/sesion";
import { INSTITUCION } from "@/lib/supabase/config";
import { cerrarSesion } from "../login/acciones";

export default async function LayoutPrivado({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await perfilActual();

  return (
    <>
      <header className="noprint sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b-2 border-siga-oscuro bg-siga px-4 py-2.5 text-white">
        <div>
          <div className="text-[15px] font-bold tracking-wide">SIGA</div>
          <div className="text-[11.5px] opacity-75">
            Inventario de bienes · {INSTITUCION}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Navegacion esAdmin={perfil.rol === "admin"} />

          <div className="flex items-center gap-2 border-l border-white/25 pl-3">
            <div className="text-right leading-tight">
              <div className="text-[12.5px] font-semibold">{perfil.nombre}</div>
              <div className="text-[10.5px] uppercase tracking-wide opacity-75">
                {perfil.rol === "admin" ? "Administrador" : "Inventariador"}
              </div>
            </div>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded border border-white/30 px-2.5 py-1 text-[12px] hover:bg-white/15"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 p-4">
        {children}
      </main>
    </>
  );
}
