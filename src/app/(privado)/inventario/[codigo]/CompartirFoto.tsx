"use client";

import { useActionState, useState } from "react";
import type { Foto } from "@/lib/fotos";
import { vincularFoto } from "../acciones-fotos";

/**
 * Poner esta misma foto en otros bienes, sin volver a subir el archivo.
 * Es la forma de documentar un ambiente con una sola toma: la foto del
 * escritorio sirve para el monitor, la CPU y el teclado a la vez.
 *
 * Se abre en un panel sobre la pantalla porque las tarjetas de la galeria
 * son angostas y no dan lugar para un formulario.
 */
export default function CompartirFoto({
  foto,
  codigo,
  ubicacion,
}: {
  foto: Foto;
  codigo: string;
  ubicacion: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"codigos" | "ubicacion">("codigos");
  const [estado, accion, enviando] = useActionState(vincularFoto, {});

  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
        title="Usar esta misma foto en otros bienes"
      >
        Usar en otros
      </button>
    );

  return (
    <>
      <button
        type="button"
        className="rounded border border-siga bg-siga/5 px-2 py-0.5 text-[11px] font-semibold text-siga"
        onClick={() => setAbierto(false)}
      >
        Usar en otros
      </button>

      <div
        className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
        onClick={() => setAbierto(false)}
      >
        <div
          className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace
                firmado y temporal del bucket privado. */}
            <img
              src={foto.url}
              alt={foto.titulo}
              className="h-16 w-20 shrink-0 rounded border border-slate-200 bg-slate-50 object-contain"
            />
            <div>
              <h2 className="text-[14px] font-semibold">
                Usar esta foto en otros bienes
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                No se vuelve a subir el archivo: es la misma foto, puesta
                también en las fichas que indique. Hoy está en {foto.bienes}{" "}
                bien(es).
              </p>
            </div>
          </div>

          <form action={accion} className="mt-3">
            <input type="hidden" name="codigo" value={codigo} />
            <input type="hidden" name="foto" value={foto.id} />
            <input type="hidden" name="ubicacion" value={ubicacion} />
            <input type="hidden" name="modo" value={modo} />

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-[13px]">
                <input
                  type="radio"
                  checked={modo === "codigos"}
                  onChange={() => setModo("codigos")}
                  className="mt-1"
                />
                <span>
                  Los bienes que yo escriba
                  <span className="block text-[11.5px] text-slate-500">
                    Separados por coma, espacio o salto de línea.
                  </span>
                </span>
              </label>

              {modo === "codigos" && (
                <textarea
                  name="codigos"
                  rows={3}
                  autoFocus
                  placeholder="ICA-CPU-0012, ICA-MON-0034, ICA-TEC-0009"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-[12.5px] outline-none focus:border-siga focus:ring-2 focus:ring-siga/20"
                />
              )}

              <label className="flex items-start gap-2 text-[13px]">
                <input
                  type="radio"
                  checked={modo === "ubicacion"}
                  onChange={() => setModo("ubicacion")}
                  disabled={!ubicacion}
                  className="mt-1"
                />
                <span className={ubicacion ? "" : "text-slate-400"}>
                  Todos los bienes de{" "}
                  <strong>{ubicacion || "(este bien no tiene ubicación)"}</strong>
                  <span className="block text-[11.5px] text-slate-500">
                    Práctico cuando el ambiente tiene muchos bienes. Los que ya
                    la tienen se saltan.
                  </span>
                </span>
              </label>
            </div>

            {estado.error && (
              <p className="mt-3 rounded border border-siga-rojo/30 bg-siga-rojo/5 px-3 py-2 text-[12.5px] text-siga-rojo">
                {estado.error}
              </p>
            )}
            {estado.aviso && (
              <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
                {estado.aviso}
              </p>
            )}

            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="rounded bg-siga px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-siga-claro disabled:opacity-60"
              >
                {enviando ? "Vinculando…" : "Vincular"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
