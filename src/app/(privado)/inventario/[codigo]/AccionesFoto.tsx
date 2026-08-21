"use client";

import type { Foto } from "@/lib/fotos";
import { desvincularFoto, eliminarFoto } from "../acciones-fotos";
import CompartirFoto from "./CompartirFoto";

/**
 * Lo que se puede hacer con una foto ya cargada: extenderla a otros bienes,
 * quitarla de este, o borrarla del sistema. Las dos bajas no son la misma
 * cosa, y la confirmacion dice siempre a cuantas fichas alcanza, porque una
 * vista general de un ambiente puede estar puesta en decenas de bienes.
 */
export default function AccionesFoto({
  foto,
  codigo,
  ubicacion,
  esAdmin,
}: {
  foto: Foto;
  codigo: string;
  ubicacion: string;
  esAdmin: boolean;
}) {
  const otros = foto.bienes - 1;

  const avisoQuitar =
    otros > 0
      ? `Quitar esta foto de ${codigo}.\n\nSeguirá disponible en los otros ${otros} bien(es) donde está puesta.`
      : `Quitar esta foto de ${codigo}.\n\nEs el único bien que la usa, así que la foto quedará sin ningún bien asociado y dejará de verse en el sistema.${
          esAdmin ? " Si quiere borrarla de verdad, use «Eliminar»." : ""
        }`;

  const avisoEliminar =
    `Eliminar la foto del sistema, junto con su archivo.\n\n` +
    (foto.bienes > 1
      ? `ATENCIÓN: está puesta en ${foto.bienes} bienes y va a desaparecer de todos ellos, no solo de ${codigo}.\n\n`
      : "") +
    `Esta acción no se puede deshacer.`;

  return (
    <div className="noprint flex flex-wrap items-center gap-1.5 border-t border-slate-200 px-2 py-1.5">
      <CompartirFoto foto={foto} codigo={codigo} ubicacion={ubicacion} />

      <form
        action={desvincularFoto}
        onSubmit={(e) => {
          if (!confirm(avisoQuitar)) e.preventDefault();
        }}
      >
        <input type="hidden" name="codigo" value={codigo} />
        <input type="hidden" name="foto" value={foto.id} />
        <button
          type="submit"
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
        >
          Quitar de aquí
        </button>
      </form>

      {esAdmin && (
        <form
          action={eliminarFoto}
          onSubmit={(e) => {
            if (!confirm(avisoEliminar)) e.preventDefault();
          }}
        >
          <input type="hidden" name="codigo" value={codigo} />
          <input type="hidden" name="foto" value={foto.id} />
          <button
            type="submit"
            className="rounded border border-siga-rojo/40 bg-white px-2 py-0.5 text-[11px] text-siga-rojo hover:bg-siga-rojo/5"
          >
            Eliminar
          </button>
        </form>
      )}
    </div>
  );
}
