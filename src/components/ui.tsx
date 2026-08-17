/** Piezas visuales reutilizables del sistema. */

export function Tarjeta({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mb-3.5 rounded border border-slate-300 bg-white px-4 py-3.5 ${className}`}
    >
      {titulo && (
        <h2 className="mb-3 border-b border-slate-200 pb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Indicador({
  numero,
  etiqueta,
}: {
  numero: string | number;
  etiqueta: string;
}) {
  return (
    <div className="rounded border border-slate-300 border-l-[3px] border-l-[#1f3864] bg-white px-3.5 py-3">
      <div className="text-2xl font-bold leading-tight">{numero}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
        {etiqueta}
      </div>
    </div>
  );
}

/** Barras horizontales comparativas (por categoría, ubicación, etc.). */
export function Barras({
  datos,
}: {
  datos: { clave: string; total: number }[];
}) {
  if (!datos.length)
    return <p className="text-[12.5px] text-slate-500">Sin datos todavía.</p>;

  const max = Math.max(1, ...datos.map((d) => d.total));

  return (
    <div className="space-y-1.5">
      {datos.map((d) => (
        <div key={d.clave} className="flex items-center gap-2 text-[12.5px]">
          <span className="w-[44%] truncate" title={d.clave}>
            {d.clave}
          </span>
          <span className="h-3 flex-1 overflow-hidden rounded-sm bg-slate-200">
            <span
              className="block h-full min-w-[2px] bg-[#2d4f8f]"
              style={{ width: `${(d.total / max) * 100}%` }}
            />
          </span>
          <span className="w-9 text-right font-semibold tabular-nums">
            {d.total}
          </span>
        </div>
      ))}
    </div>
  );
}

const CLASES_ETIQUETA = "inline-block rounded-full border px-2 py-px text-[11px] whitespace-nowrap";

export function EtiquetaEstado({ estado }: { estado: string }) {
  const color =
    estado === "Bueno"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : estado === "Regular" || estado === "En reparacion"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : estado === "Malo" || estado === "Dado de baja"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-slate-100 border-slate-300 text-slate-600";
  return <span className={`${CLASES_ETIQUETA} ${color}`}>{estado}</span>;
}

export function EtiquetaVerificacion({ valor }: { valor: string }) {
  const color =
    valor === "Verificado"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : valor === "No ubicado"
        ? "bg-red-50 border-red-200 text-red-700"
        : valor === "Sobrante"
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-slate-100 border-slate-300 text-slate-600";
  return <span className={`${CLASES_ETIQUETA} ${color}`}>{valor}</span>;
}

/** Código institucional del bien, resaltado como identificador. */
export function Codigo({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[12px] font-semibold text-[#1f3864]">
      {children}
    </span>
  );
}
