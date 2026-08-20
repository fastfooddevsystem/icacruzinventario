"use client";

import { useEffect, useRef, useState } from "react";
import FormularioActivo from "@/components/FormularioActivo";
import { actualizarActivo } from "@/app/(privado)/inventario/acciones";
import type { Activo, Categoria } from "@/lib/tipos";

interface Props {
  activo: Activo;
  categorias: Categoria[];
  ubicaciones: string[];
  responsables: string[];
  /** Foto del bien, si tiene. Se muestra dentro de la ventana. */
  foto?: string;
  /** Dirección a la que volver tras guardar, con los filtros vigentes. */
  retorno: string;
}

/**
 * Botón que abre una ventana con los datos del bien para corregirlos sin
 * salir del listado. El formulario es el mismo del alta y de la ficha, así
 * que la validación y el registro en el historial no se duplican.
 */
export default function EditarBien({
  activo,
  categorias,
  ubicaciones,
  responsables,
  foto,
  retorno,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={`Editar ${activo.codigo}`}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11.5px] hover:border-siga hover:text-siga"
      >
        Editar
      </button>

      {/* El contenido se monta solo al abrir: con 50 filas en pantalla, tener
          50 formularios en el DOM no tendria sentido. */}
      <dialog
        ref={dialogo}
        onClose={() => setAbierto(false)}
        className="w-[min(920px,92vw)] rounded-lg border border-slate-300 p-0 backdrop:bg-slate-900/40"
      >
        {abierto && (
          <div className="max-h-[85vh] overflow-auto">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-siga px-4 py-2.5 text-white">
              <div>
                <div className="font-mono text-[15px] font-bold">
                  {activo.codigo}
                </div>
                <div className="text-[12px] opacity-80">
                  {activo.denominacion}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded border border-white/30 px-2 py-1 text-[12px] hover:bg-white/15"
              >
                Cerrar
              </button>
            </header>

            <div className="px-4 py-3">
              {foto ? (
                <a
                  href={foto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- enlace
                      firmado y temporal del bucket privado */}
                  <img
                    src={foto}
                    alt={`Foto de ${activo.codigo}`}
                    className="mx-auto max-h-52 rounded border border-slate-300 bg-white object-contain"
                  />
                </a>
              ) : (
                <p className="mb-3 rounded border border-dashed border-slate-300 px-3 py-2 text-center text-[12px] text-slate-500">
                  Este bien no tiene fotos todavía.
                </p>
              )}

              <FormularioActivo
                categorias={categorias}
                ubicaciones={ubicaciones}
                responsables={responsables}
                accion={actualizarActivo}
                activo={activo}
                retorno={retorno}
                alCancelar={() => setAbierto(false)}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
