"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CONDICIONES_VERIF, ESTADOS, type Categoria } from "@/lib/tipos";

interface Props {
  categorias: Categoria[];
  ubicaciones: string[];
}

/** Barra de búsqueda y filtros: escribe los criterios en la URL. */
export default function FiltrosInventario({ categorias, ubicaciones }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const aplicar = (cambios: Record<string, string>) => {
    const nuevos = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) nuevos.set(k, v);
      else nuevos.delete(k);
    }
    iniciar(() => router.replace(`/inventario?${nuevos.toString()}`));
  };

  // La búsqueda por texto espera 300 ms para no consultar en cada tecla.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => aplicar({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const sel = (k: string) => params.get(k) ?? "";

  return (
    <div className="noprint mb-3 flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar código, nombre, marca, serie…"
        className={`${clases} min-w-[200px] flex-1`}
      />

      <select
        value={sel("categoria")}
        onChange={(e) => aplicar({ categoria: e.target.value })}
        className={clases}
      >
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.codigo} value={c.codigo}>
            {c.nombre}
          </option>
        ))}
      </select>

      <select
        value={sel("ubicacion")}
        onChange={(e) => aplicar({ ubicacion: e.target.value })}
        className={clases}
      >
        <option value="">Todas las ubicaciones</option>
        {ubicaciones.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      <select
        value={sel("estado")}
        onChange={(e) => aplicar({ estado: e.target.value })}
        className={clases}
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>

      <select
        value={sel("verificacion")}
        onChange={(e) => aplicar({ verificacion: e.target.value })}
        className={clases}
      >
        <option value="">Toda verificación</option>
        {CONDICIONES_VERIF.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          setQ("");
          iniciar(() => router.replace("/inventario"));
        }}
        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
      >
        Limpiar
      </button>

      {pendiente && (
        <span className="text-[12px] text-slate-500">Actualizando…</span>
      )}
    </div>
  );
}

const clases =
  "rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#2d4f8f] focus:ring-2 focus:ring-slate-200";
