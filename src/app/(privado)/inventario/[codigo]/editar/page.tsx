import { notFound } from "next/navigation";
import FormularioActivo from "@/components/FormularioActivo";
import { Tarjeta } from "@/components/ui";
import { cargarCatalogos } from "@/lib/consultas";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Activo } from "@/lib/tipos";
import { actualizarActivo } from "../../acciones";

export default async function PaginaEditar({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: activo }, catalogos] = await Promise.all([
    supabase.from("activos").select("*").eq("codigo", codigo).maybeSingle(),
    cargarCatalogos(),
  ]);

  if (!activo) notFound();

  return (
    <Tarjeta titulo={`Editar ${codigo}`}>
      <FormularioActivo
        categorias={catalogos.categorias}
        ubicaciones={catalogos.ubicaciones}
        responsables={catalogos.responsables}
        accion={actualizarActivo}
        activo={activo as Activo}
      />
    </Tarjeta>
  );
}
