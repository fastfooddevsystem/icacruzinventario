import type { Foto } from "@/lib/fotos";
import AccionesFoto from "./AccionesFoto";

/**
 * Fotos del bien. Las que muestran el ambiente completo se marcan como tales,
 * para que no se confundan con una foto del equipo en particular, y se avisa
 * en cuantos bienes mas esta puesta cada una.
 */
export default function Galeria({
  fotos,
  problema,
  codigo,
  ubicacion,
  esAdmin,
}: {
  fotos: Foto[];
  problema?: string;
  codigo: string;
  ubicacion: string;
  esAdmin: boolean;
}) {
  if (problema)
    return (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
        {problema}
      </p>
    );

  if (!fotos.length)
    return (
      <p className="text-[12.5px] text-slate-500">
        Este bien todavía no tiene fotos. Agregue una con el botón de abajo.
      </p>
    );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
      {fotos.map((f, i) => (
        <div
          key={f.id}
          className="overflow-hidden rounded border border-slate-300 bg-slate-50"
        >
          <a
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block"
            title={f.titulo}
          >
            {i === 0 && fotos.length > 1 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-siga px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white">
                En el acta
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- son enlaces
                firmados y temporales del bucket privado, no rutas estables que
                el optimizador de Next pueda cachear. */}
            <img
              src={f.url}
              alt={f.titulo}
              loading="lazy"
              className="h-32 w-full bg-white object-contain transition group-hover:opacity-90"
            />
            <div className="border-t border-slate-200 px-2 py-1">
              <span
                className={`text-[10.5px] uppercase tracking-wide ${
                  f.alcance === "puesto" ? "text-slate-500" : "text-siga"
                }`}
              >
                {f.alcance === "puesto" ? "Ambiente" : "Este bien"}
              </span>
              {f.bienes > 1 && (
                <span
                  className="ml-1.5 text-[10.5px] text-slate-400"
                  title={`Esta misma foto está puesta en ${f.bienes} bienes`}
                >
                  · en {f.bienes} bienes
                </span>
              )}
              <div className="text-[10.5px] text-slate-400">
                {new Date(f.creado_en).toLocaleDateString("es-BO")}
              </div>
            </div>
          </a>

          <AccionesFoto
            foto={f}
            codigo={codigo}
            ubicacion={ubicacion}
            esAdmin={esAdmin}
          />
        </div>
      ))}
    </div>
  );
}
