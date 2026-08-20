"use client";

import { useActionState, useRef } from "react";
import { subirFoto, type EstadoFoto } from "../acciones-fotos";

const INICIAL: EstadoFoto = {};

/** Sube una foto del bien. En el celular abre la cámara directamente. */
export default function SubirFoto({ codigo }: { codigo: string }) {
  const [estado, enviar, pendiente] = useActionState(subirFoto, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formulario}
      action={enviar}
      className="noprint mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"
    >
      <input type="hidden" name="codigo" value={codigo} />
      <input
        type="file"
        name="archivo"
        accept="image/*"
        capture="environment"
        required
        className="text-[12.5px] file:mr-2 file:rounded file:border-0 file:bg-siga file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-white hover:file:bg-siga-claro"
      />
      <button
        type="submit"
        disabled={pendiente}
        className="rounded bg-siga px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-siga-claro disabled:opacity-60"
      >
        {pendiente ? "Subiendo…" : "Agregar foto"}
      </button>
      {estado.error && (
        <span className="text-[12.5px] text-red-700">{estado.error}</span>
      )}
    </form>
  );
}
