import FormularioActivo from "@/components/FormularioActivo";
import { Tarjeta } from "@/components/ui";
import { cargarCatalogos } from "@/lib/consultas";
import { crearActivo } from "../acciones";

export default async function PaginaNuevo() {
  const { categorias, ubicaciones, responsables } = await cargarCatalogos();

  return (
    <Tarjeta titulo="Registrar un bien">
      <FormularioActivo
        categorias={categorias}
        ubicaciones={ubicaciones}
        responsables={responsables}
        accion={crearActivo}
      />
    </Tarjeta>
  );
}
