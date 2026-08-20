"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CONDICIONES_VERIF, ESTADOS, type Categoria } from "@/lib/tipos";

interface Props {
  categorias: Categoria[];
  ubicaciones: string[];
  responsables: string[];
}

/**
 * Filtros del reporte. Igual que en el inventario, los criterios viven en la
 * URL: asi el enlace del reporte se puede compartir y las descargas solo
 * reenvian el mismo query string.
 */
export default function FiltrosReporte({
  categorias,
  ubicaciones,
  responsables,
}: Props) {
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
    iniciar(() => router.replace(`/reportes?${nuevos.toString()}`));
  };

  // La busqueda por texto espera 300 ms para no consultar en cada tecla.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => aplicar({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const sel = (k: string) => params.get(k) ?? "";
  const hayFiltros = [...params.keys()].some((k) => params.get(k));

  return (
    <div className="noprint">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo etiqueta="Ubicación / área">
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
        </Campo>

        <Campo etiqueta="Responsable">
          <select
            value={sel("responsable")}
            onChange={(e) => aplicar({ responsable: e.target.value })}
            className={clases}
          >
            <option value="">Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Categoría">
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
        </Campo>

        <Campo etiqueta="Estado de conservación">
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
        </Campo>

        <Campo etiqueta="Condición de verificación">
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
        </Campo>

        <Campo etiqueta="Búsqueda libre">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, nombre, marca, serie…"
            className={clases}
          />
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => {
            setQ("");
            iniciar(() => router.replace("/reportes"));
          }}
          className={`rounded px-3 py-1.5 text-[13px] ${
            hayFiltros
              ? "border border-slate-300 bg-white hover:bg-slate-100"
              : "border border-siga bg-siga/5 font-semibold text-siga"
          }`}
        >
          Todo el inventario
        </button>
        <span className="text-[12px] text-slate-500">
          {hayFiltros
            ? "Reporte filtrado. Este botón lo devuelve a todo el inventario."
            : "Sin filtros: el reporte incluye todos los bienes."}
        </span>
        {pendiente && (
          <span className="ml-auto text-[12px] text-slate-500">
            Actualizando…
          </span>
        )}
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

const clases =
  "w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-siga focus:ring-2 focus:ring-siga/20";
