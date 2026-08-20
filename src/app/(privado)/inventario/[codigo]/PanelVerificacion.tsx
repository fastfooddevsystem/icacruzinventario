"use client";

import { useActionState } from "react";
import { Tarjeta } from "@/components/ui";
import { CONDICIONES_VERIF, ESTADOS } from "@/lib/tipos";
import { verificarActivo, type EstadoVerif } from "../acciones-verificacion";

const INICIAL: EstadoVerif = {};

interface Props {
  codigo: string;
  ubicacionActual: string;
  estadoActual: string;
  ubicaciones: string[];
}

export default function PanelVerificacion({
  codigo,
  ubicacionActual,
  estadoActual,
  ubicaciones,
}: Props) {
  const [estado, enviar, pendiente] = useActionState(verificarActivo, INICIAL);

  return (
    <Tarjeta titulo="Verificación física" className="noprint bg-slate-50">
      <form
        action={enviar}
        className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3"
      >
        <input type="hidden" name="codigo" value={codigo} />

        <Campo etiqueta="Condición encontrada">
          <select name="verificacion" className={clases}>
            {CONDICIONES_VERIF.filter((c) => c !== "Pendiente").map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Ubicación real">
          <input
            name="ubicacion"
            defaultValue={ubicacionActual}
            list="lista-ubi-verif"
            className={clases}
          />
          <datalist id="lista-ubi-verif">
            {ubicaciones.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Campo>

        <Campo etiqueta="Estado real">
          <select name="estado" defaultValue={estadoActual} className={clases}>
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Nota">
          <input name="nota" placeholder="Opcional" className={clases} />
        </Campo>

        {estado.error && (
          <p className="col-span-full rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {estado.error}
          </p>
        )}

        <div className="col-span-full">
          <button
            type="submit"
            disabled={pendiente}
            className="rounded bg-siga px-4 py-2 text-sm font-semibold text-white hover:bg-siga-claro disabled:opacity-60"
          >
            {pendiente ? "Registrando…" : "Confirmar verificación"}
          </button>
        </div>
      </form>
    </Tarjeta>
  );
}

const clases =
  "w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-siga focus:ring-2 focus:ring-siga/20";

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
