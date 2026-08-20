import FiltrosReporte from "@/components/FiltrosReporte";
import { Barras, Indicador, Tarjeta } from "@/components/ui";
import { cargarCatalogos } from "@/lib/consultas";
import { datosExport, resumen, TOPE_ANEXO } from "@/lib/exportar";
import { bs } from "@/lib/tipos";

/**
 * Armado de reportes: se eligen los filtros arriba, se ve el resumen de lo
 * que va a salir, y recien despues se descarga. Los cuatro formatos se
 * llevan exactamente los mismos bienes que muestra la vista previa, porque
 * todos reenvian el mismo query string a listarActivos().
 */
export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const uno = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v ? v : undefined;
  };

  const filtros = {
    q: uno("q"),
    categoria: uno("categoria"),
    ubicacion: uno("ubicacion"),
    responsable: uno("responsable"),
    estado: uno("estado"),
    verificacion: uno("verificacion"),
  };

  const [{ filas }, { categorias, ubicaciones, responsables }] =
    await Promise.all([datosExport(filtros), cargarCatalogos()]);

  const r = resumen(filas);
  const consulta = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();
  const sep = consulta ? "&" : "";

  const hay = filas.length > 0;
  const conFoto = filas.filter((f) => f.fotos > 0).length;
  const enAnexo = Math.min(conFoto, TOPE_ANEXO);

  const nombreCat = new Map(categorias.map((c) => [c.codigo, c.nombre]));
  const activos = Object.entries(filtros).filter(([, v]) => v) as [
    string,
    string,
  ][];

  return (
    <>
      <Tarjeta titulo="1. Qué bienes entran en el reporte">
        <FiltrosReporte
          categorias={categorias}
          ubicaciones={ubicaciones}
          responsables={responsables}
        />
      </Tarjeta>

      <Tarjeta titulo="2. Vista previa de lo que va a salir">
        {activos.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {activos.map(([clave, valor]) => (
              <span
                key={clave}
                className="rounded-full border border-siga/30 bg-siga/5 px-2.5 py-0.5 text-[11.5px] text-siga"
              >
                {ETIQUETA[clave] ?? clave}:{" "}
                <strong>
                  {clave === "categoria" ? (nombreCat.get(valor) ?? valor) : valor}
                </strong>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <Indicador numero={r.total} etiqueta="Bienes en el reporte" />
          <Indicador numero={`Bs ${bs(r.valorTotal)}`} etiqueta="Valor total" />
          <Indicador numero={conFoto} etiqueta="Con fotografía" />
          <Indicador
            numero={
              r.porVerificacion.find((v) => v.clave === "Verificado")?.total ?? 0
            }
            etiqueta="Verificados"
          />
        </div>

        {hay ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Grupo titulo="Por ubicación" datos={r.porUbicacion} />
            <Grupo titulo="Por responsable" datos={r.porResponsable} />
            <Grupo titulo="Por estado" datos={r.porEstado} />
            <Grupo titulo="Por categoría" datos={r.porCategoria} />
          </div>
        ) : (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            Ningún bien coincide con estos filtros. Ajústelos arriba o use
            «Todo el inventario».
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="3. Descargar">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Descarga
            href={`/api/export/excel?${consulta}`}
            titulo="Planilla Excel"
            detalle="Una fila por bien más una hoja de resumen. Para trabajar los datos."
            habilitado={hay}
            principal
          />
          <Descarga
            href={`/api/export/pdf?${consulta}`}
            titulo="Acta en PDF"
            detalle="Listado con resumen y hoja de firmas, para imprimir y hacer firmar."
            habilitado={hay}
            principal
          />
          <Descarga
            href={`/api/export/pdf?${consulta}${sep}fotos=1`}
            titulo="Acta en PDF con fotos"
            detalle={
              conFoto === 0
                ? "Ningún bien de este reporte tiene fotografía cargada."
                : `El acta más un anexo con ${enAnexo} fotografía(s)${
                    conFoto > TOPE_ANEXO
                      ? `, de los ${conFoto} bienes con foto (tope de ${TOPE_ANEXO})`
                      : ""
                  }. Tarda más en generarse.`
            }
            habilitado={hay && conFoto > 0}
          />
          <Descarga
            href={`/api/export/etiquetas?${consulta}`}
            titulo="Etiquetas para pegar"
            detalle="Hoja A4 con 24 etiquetas por página, con el código en grande."
            habilitado={hay}
          />
        </div>

        <p className="mt-3 border-t border-slate-200 pt-3 text-[12px] text-slate-500">
          Los cuatro archivos se llevan los {r.total} bien(es) de la vista
          previa, no solo lo que entra en una pantalla.
        </p>
      </Tarjeta>
    </>
  );
}

const ETIQUETA: Record<string, string> = {
  q: "Búsqueda",
  categoria: "Categoría",
  ubicacion: "Ubicación",
  responsable: "Responsable",
  estado: "Estado",
  verificacion: "Verificación",
};

function Grupo({
  titulo,
  datos,
}: {
  titulo: string;
  datos: { clave: string; total: number }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
        {datos.length > 8 && (
          <span className="ml-1.5 font-normal normal-case text-slate-400">
            (8 mayores de {datos.length})
          </span>
        )}
      </h3>
      <Barras datos={datos.slice(0, 8)} />
    </div>
  );
}

function Descarga({
  href,
  titulo,
  detalle,
  habilitado,
  principal = false,
}: {
  href: string;
  titulo: string;
  detalle: string;
  habilitado: boolean;
  principal?: boolean;
}) {
  const base = "block rounded border px-3.5 py-3 transition";

  if (!habilitado)
    return (
      <div
        className={`${base} cursor-not-allowed border-slate-200 bg-slate-50 opacity-70`}
      >
        <div className="text-[13.5px] font-semibold text-slate-400">
          {titulo}
        </div>
        <div className="mt-0.5 text-[12px] text-slate-400">{detalle}</div>
      </div>
    );

  return (
    <a
      href={href}
      className={`${base} ${
        principal
          ? "border-siga bg-siga text-white hover:bg-siga-claro"
          : "border-slate-300 bg-white hover:border-siga hover:bg-siga/5"
      }`}
    >
      <div className="text-[13.5px] font-semibold">{titulo}</div>
      <div
        className={`mt-0.5 text-[12px] ${
          principal ? "text-white/85" : "text-slate-500"
        }`}
      >
        {detalle}
      </div>
    </a>
  );
}
