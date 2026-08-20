import Link from "next/link";

interface Props {
  pagina: number;
  totalPaginas: number;
  /** Query string de los filtros vigentes, sin el parámetro de página. */
  consulta: string;
}

/**
 * Números de página a mostrar: una ventana de cinco alrededor de la actual,
 * recortada contra los extremos.
 */
function ventana(pagina: number, totalPaginas: number): number[] {
  const ancho = Math.min(5, totalPaginas);
  let inicio = Math.max(1, pagina - Math.floor(ancho / 2));
  inicio = Math.min(inicio, totalPaginas - ancho + 1);
  return Array.from({ length: ancho }, (_, i) => inicio + i);
}

/**
 * Paginación de la tabla de inventario. Es un enlace por página para que la
 * dirección siga siendo compartible, igual que los filtros.
 */
export default function Paginacion({ pagina, totalPaginas, consulta }: Props) {
  if (totalPaginas <= 1) return null;

  const enlace = (p: number) => {
    const params = new URLSearchParams(consulta);
    // La primera página se deja sin parámetro, para no ensuciar la dirección.
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return qs ? `/inventario?${qs}` : "/inventario";
  };

  return (
    <nav className="noprint mt-3 flex flex-wrap items-center justify-center gap-1">
      <Salto a={enlace(pagina - 1)} activo={pagina > 1}>
        ‹ Anterior
      </Salto>

      {ventana(pagina, totalPaginas).map((p) =>
        p === pagina ? (
          <span
            key={p}
            aria-current="page"
            className="rounded bg-siga px-2.5 py-1 text-[12.8px] font-semibold text-white"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={enlace(p)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[12.8px] hover:bg-slate-100"
          >
            {p}
          </Link>
        ),
      )}

      <Salto a={enlace(pagina + 1)} activo={pagina < totalPaginas}>
        Siguiente ›
      </Salto>

      <span className="ml-2 text-[12px] text-slate-500">
        Página {pagina} de {totalPaginas}
      </span>
    </nav>
  );
}

/** Botón de anterior/siguiente: enlace si se puede ir, texto apagado si no. */
function Salto({
  a,
  activo,
  children,
}: {
  a: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  const clases = "rounded px-2.5 py-1 text-[12.8px]";
  return activo ? (
    <Link href={a} className={`${clases} border border-slate-300 bg-white hover:bg-slate-100`}>
      {children}
    </Link>
  ) : (
    <span className={`${clases} border border-slate-200 text-slate-400`}>
      {children}
    </span>
  );
}
