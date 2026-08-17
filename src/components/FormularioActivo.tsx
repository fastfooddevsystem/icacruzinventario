"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ESTADOS,
  PROCEDENCIAS,
  type Activo,
  type Categoria,
} from "@/lib/tipos";
import type { EstadoActivo } from "@/app/(privado)/inventario/acciones";

const INICIAL: EstadoActivo = {};

interface Props {
  categorias: Categoria[];
  ubicaciones: string[];
  responsables: string[];
  accion: (previo: EstadoActivo, datos: FormData) => Promise<EstadoActivo>;
  activo?: Activo;
}

export default function FormularioActivo({
  categorias,
  ubicaciones,
  responsables,
  accion,
  activo,
}: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, INICIAL);
  const esEdicion = Boolean(activo);

  return (
    <form action={enviar}>
      {esEdicion && <input type="hidden" name="codigo" value={activo!.codigo} />}

      <div className="mb-3 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
        {esEdicion ? (
          <>
            Editando el bien{" "}
            <strong className="font-mono text-[#1f3864]">
              {activo!.codigo}
            </strong>
            . La categoría no se cambia porque define el código.
          </>
        ) : (
          <>
            El código institucional se genera automáticamente al guardar
            (formato <code className="rounded bg-slate-200 px-1">ICA-CAT-0000</code>).
            Deje en blanco lo que no aplique.
          </>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
        <Campo etiqueta="Categoría *">
          <select
            name="categoria"
            required
            defaultValue={activo?.categoria ?? ""}
            disabled={esEdicion}
            className={clases + " disabled:bg-slate-100 disabled:text-slate-500"}
          >
            <option value="">— seleccione —</option>
            {categorias.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
          {/* Al estar deshabilitado el select no se envia: se manda aparte. */}
          {esEdicion && (
            <input type="hidden" name="categoria" value={activo!.categoria} />
          )}
        </Campo>

        <Campo etiqueta="Denominación del bien *">
          <input
            name="denominacion"
            required
            defaultValue={activo?.denominacion ?? ""}
            placeholder="Ej. Laptop de secretaría"
            className={clases}
          />
        </Campo>

        <Campo etiqueta="Marca">
          <input name="marca" defaultValue={activo?.marca ?? ""} className={clases} />
        </Campo>

        <Campo etiqueta="Modelo">
          <input name="modelo" defaultValue={activo?.modelo ?? ""} className={clases} />
        </Campo>

        <Campo etiqueta="Nº de serie">
          <input name="serie" defaultValue={activo?.serie ?? ""} className={clases} />
        </Campo>

        <Campo etiqueta="Ubicación / ambiente">
          <input
            name="ubicacion"
            list="lista-ubicaciones"
            defaultValue={activo?.ubicacion ?? ""}
            className={clases}
          />
          <datalist id="lista-ubicaciones">
            {ubicaciones.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Campo>

        <Campo etiqueta="Responsable / custodio">
          <input
            name="responsable"
            list="lista-responsables"
            defaultValue={activo?.responsable ?? ""}
            className={clases}
          />
          <datalist id="lista-responsables">
            {responsables.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Campo>

        <Campo etiqueta="Estado de conservación">
          <select
            name="estado"
            defaultValue={activo?.estado ?? "Bueno"}
            className={clases}
          >
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Procedencia">
          <select
            name="procedencia"
            defaultValue={activo?.procedencia ?? "Sin dato"}
            className={clases}
          >
            {PROCEDENCIAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Fecha de adquisición">
          <input
            type="date"
            name="fecha_adq"
            defaultValue={activo?.fecha_adq ?? ""}
            className={clases}
          />
        </Campo>

        <Campo etiqueta="Valor referencial (Bs)">
          <input
            type="number"
            step="0.01"
            min="0"
            name="valor"
            defaultValue={activo?.valor ?? 0}
            className={clases}
          />
        </Campo>

        <Campo etiqueta="Características técnicas" ancho>
          <input
            name="caracteristicas"
            defaultValue={activo?.caracteristicas ?? ""}
            placeholder="Ej. Core i5, 8GB RAM, SSD 256GB / medidas, color, material"
            className={clases}
          />
        </Campo>

        <Campo etiqueta="Observaciones" ancho>
          <textarea
            name="observaciones"
            defaultValue={activo?.observaciones ?? ""}
            className={clases + " min-h-[52px] resize-y"}
          />
        </Campo>
      </div>

      {estado.error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {estado.error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded bg-[#1f3864] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d4f8f] disabled:opacity-60"
        >
          {pendiente
            ? "Guardando…"
            : esEdicion
              ? `Guardar cambios de ${activo!.codigo}`
              : "Guardar bien"}
        </button>
        <Link
          href={esEdicion ? `/inventario/${activo!.codigo}` : "/inventario"}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const clases =
  "w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#2d4f8f] focus:ring-2 focus:ring-slate-200";

function Campo({
  etiqueta,
  children,
  ancho = false,
}: {
  etiqueta: string;
  children: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <div className={`flex flex-col ${ancho ? "col-span-full" : ""}`}>
      <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
