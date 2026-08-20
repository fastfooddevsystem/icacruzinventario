import { Tarjeta } from "@/components/ui";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { PREFIJO } from "@/lib/supabase/config";
import type { Categoria, Perfil } from "@/lib/tipos";
import { agregarCatalogo, agregarCategoria, cambiarRol } from "./acciones";

const MENSAJES: Record<string, string> = {
  propio: "No puede cambiar su propio rol, para no quedarse sin acceso.",
  codigo: "El código de categoría debe tener exactamente 3 letras (ej. LPT).",
  nombre: "El nombre no puede quedar vacío.",
};

export default async function PaginaAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await exigirAdmin();
  const sp = await searchParams;
  const supabase = await crearClienteServidor();

  const [{ data: perfiles }, { data: categorias }, { data: ubis }, { data: resps }] =
    await Promise.all([
      supabase.from("perfiles").select("*").order("nombre"),
      supabase.from("categorias").select("*").order("codigo"),
      supabase.from("ubicaciones").select("nombre").order("nombre"),
      supabase.from("responsables").select("nombre").order("nombre"),
    ]);

  const error = typeof sp.error === "string" ? MENSAJES[sp.error] : undefined;

  return (
    <>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </div>
      )}
      {sp.guardado && (
        <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          Cambio guardado.
        </div>
      )}

      <Tarjeta titulo="Usuarios del sistema">
        <p className="mb-3 text-[12.5px] text-slate-500">
          El <strong>administrador</strong> gestiona usuarios, catálogos y puede
          eliminar bienes. El <strong>inventariador</strong> registra y verifica
          bienes.
        </p>
        <div className="overflow-auto rounded border border-slate-300">
          <table className="w-full text-[12.8px]">
            <thead>
              <tr>
                {["Nombre", "Rol actual", "Cambiar rol"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((perfiles ?? []) as Perfil[]).map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5">
                    {p.nombre}
                    {p.id === perfil.id && (
                      <span className="ml-1.5 text-[11px] text-slate-500">
                        (usted)
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-px text-[11px]">
                      {p.rol === "admin" ? "Administrador" : "Inventariador"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    {p.id === perfil.id ? (
                      <span className="text-[12px] text-slate-400">—</span>
                    ) : (
                      <form action={cambiarRol} className="flex gap-1.5">
                        <input type="hidden" name="id" value={p.id} />
                        <select
                          name="rol"
                          defaultValue={p.rol}
                          className="rounded border border-slate-300 px-2 py-1 text-[12.5px]"
                        >
                          <option value="inventariador">Inventariador</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded bg-siga px-2.5 py-1 text-[12.5px] text-white hover:bg-siga-claro"
                        >
                          Aplicar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5">
        <Tarjeta titulo="Catálogo de codificación">
          <p className="mb-2 text-[12.5px] text-slate-500">
            Estructura del código:{" "}
            <code className="rounded bg-slate-200 px-1">
              {PREFIJO}-CATEGORÍA-CORRELATIVO
            </code>
          </p>

          <form
            action={agregarCategoria}
            className="mb-3 flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50 p-2.5"
          >
            <div className="flex flex-col">
              <label className={etiqueta}>Código (3 letras)</label>
              <input
                name="codigo"
                maxLength={3}
                required
                placeholder="LPT"
                className={`${campo} w-20 font-mono uppercase`}
              />
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col">
              <label className={etiqueta}>Nombre</label>
              <input name="nombre" required placeholder="Laptop / Notebook" className={campo} />
            </div>
            <div className="flex min-w-[120px] flex-1 flex-col">
              <label className={etiqueta}>Grupo</label>
              <input name="grupo" placeholder="Equipo de computo" className={campo} />
            </div>
            <button
              type="submit"
              className="rounded bg-siga px-3 py-1.5 text-[13px] text-white hover:bg-siga-claro"
            >
              Agregar
            </button>
          </form>

          <div className="max-h-[320px] overflow-auto rounded border border-slate-300">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr>
                  {["Código", "Categoría", "Ejemplo"].map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((categorias ?? []) as Categoria[]).map((c) => (
                  <tr key={c.codigo} className="border-b border-slate-100">
                    <td className="px-2 py-1 font-mono font-semibold text-siga">
                      {c.codigo}
                    </td>
                    <td className="px-2 py-1">{c.nombre}</td>
                    <td className="px-2 py-1 font-mono text-slate-500">
                      {PREFIJO}-{c.codigo}-0001
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <div>
          <ListaCatalogo
            titulo="Ubicaciones / ambientes"
            tipo="ubicaciones"
            valores={(ubis ?? []).map((u) => u.nombre as string)}
            ejemplo="Ej. Sala de reuniones"
          />
          <ListaCatalogo
            titulo="Responsables / custodios"
            tipo="responsables"
            valores={(resps ?? []).map((r) => r.nombre as string)}
            ejemplo="Ej. Ana López"
          />
        </div>
      </div>
    </>
  );
}

function ListaCatalogo({
  titulo,
  tipo,
  valores,
  ejemplo,
}: {
  titulo: string;
  tipo: "ubicaciones" | "responsables";
  valores: string[];
  ejemplo: string;
}) {
  return (
    <Tarjeta titulo={titulo}>
      <form action={agregarCatalogo} className="mb-2.5 flex gap-2">
        <input type="hidden" name="tipo" value={tipo} />
        <input
          name="nombre"
          required
          placeholder={ejemplo}
          className={`${campo} flex-1`}
        />
        <button
          type="submit"
          className="rounded bg-siga px-3 py-1.5 text-[13px] text-white hover:bg-siga-claro"
        >
          Agregar
        </button>
      </form>
      {valores.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {valores.map((v) => (
            <li
              key={v}
              className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[12px]"
            >
              {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-slate-500">Todavía no hay registros.</p>
      )}
    </Tarjeta>
  );
}

const campo =
  "rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-siga focus:ring-2 focus:ring-siga/20";
const etiqueta =
  "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500";
