# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Comandos

```bash
npm run dev     # http://localhost:3000 (hay .claude/launch.json, se puede previsualizar)
npm run build   # verificacion principal: compila y corre TypeScript
npm run lint    # eslint (eslint-config-next)
```

No hay pruebas automatizadas, asi que no existe "correr un solo test": lo que sustituye
a las pruebas es `npm run build` mas una pasada por el navegador.

`README.md` es el de `create-next-app` sin tocar; no describe este proyecto.

## Detalles que complementan a AGENTS.md

### Archivos SQL: hay seis y no todos son estructura

Se ejecutan a mano en el SQL Editor de Supabase, en orden numerico:

| Archivo | Que es |
| --- | --- |
| `01_estructura.sql`, `02_seguridad.sql` | El esquema real: tablas, `generar_codigo()`, RLS |
| `03_migracion_computacion.sql` | Carga de datos de una sola vez (274 bienes del PDF de computacion) |
| `04_fotos.sql` | Tablas `fotos` / `activo_fotos` y su RLS |
| `05_fotos_computacion.sql` | Carga de una sola vez de las 122 fotos migradas |
| `06_diagnostico_fotos.sql` | Solo consultas de diagnostico; no modifica nada |
| `07_fotos_borrado.sql` | Politicas de baja de fotos; idempotente, se puede repetir |

`03` y `05` son idempotentes por bloqueo: detectan su propia marca (`creado_por`) y
abortan con `raise exception` si ya se corrieron. No son migraciones repetibles; un
cambio de columna sigue siendo un `ALTER TABLE` escrito a mano.

`supabase/schema.sql` esta obsoleto: es la version monolitica anterior a `01`+`02`.
Editar siempre los archivos numerados.

### Fotos: bucket privado, relacion N a N, URLs firmadas

- Los archivos viven en Supabase Storage, bucket **privado** `bienes` (`BUCKET` en
  `src/lib/fotos.ts`); la base solo guarda la ruta.
- La relacion es N a N a proposito: una foto de un escritorio documenta varios bienes
  y un bien puede tener varias fotos. Por eso no hay columna `foto_url` en `activos`.
- `alcance` distingue `'bien'` (el objeto en particular) de `'puesto'` (el ambiente
  completo). **`ordenFotos()` en `src/lib/fotos.ts` es la unica regla** de cual foto
  representa a un bien, y la usan las tres funciones que eligen una sola
  (`fotosDelActivo`, `miniaturas`, `fotosParaAnexo`): primero la del bien sobre la del
  ambiente, y dentro de cada grupo la mas reciente.
- **Por eso no hace falta borrar las fotos viejas para renovar el inventario.** Cuando se
  vuelve a fotografiar todo, las fotos nuevas se suben con alcance `'bien'` y, siendo mas
  recientes, desplazan solas a las anteriores en la galeria y en el anexo del acta; las
  viejas quedan como historico. Ojo: **la recencia sola no sirve** como criterio. En 7 de
  las fichas migradas la vista general del ambiente se inserto despues de la foto propia
  del bien, asi que ordenar solo por fecha haria que el acta mostrara el escritorio en vez
  del equipo. El nivel de `alcance` va primero por esa razon.
- Como el bucket es privado, todo se muestra con `createSignedUrls` (vigencia de una
  hora) y el PDF con anexo baja los archivos en base64. Se resuelve por lote para toda
  la pagina, nunca una consulta por fila.
- **Dar de baja una foto son dos operaciones distintas, no una.** *Desvincular*
  (`desvincularFoto`) borra solo la fila de `activo_fotos`: la foto sobrevive en los
  demas bienes, y lo puede hacer cualquier usuario. *Eliminar* (`eliminarFoto`) borra la
  fila de `fotos` mas el archivo, y en cascada todos los vinculos; es solo de admin. La
  diferencia no es cosmetica: 32 de las 122 fotos migradas son vistas de ambiente
  compartidas entre 4 y 75 bienes, asi que un borrado hecho desde una ficha alcanza a
  decenas de fichas ajenas. Por eso `Foto.bienes` trae ese conteo y la confirmacion lo dice.
- **Al eliminar, primero la fila y despues el archivo.** Al reves quedan filas apuntando a
  un archivo inexistente, que es exactamente lo que dispara el aviso de "rutas sin
  archivo". Un archivo huerfano solo gasta espacio; una fila huerfana rompe la galeria.
- Las fotos tambien dejan rastro en `movimientos`, con los tipos `FOTO_ALTA` y `FOTO_BAJA`.
  Al eliminar una foto compartida se inserta un movimiento **por cada bien afectado**, no
  solo por el que estaba en pantalla.
- `fotosDelActivo` devuelve `{ fotos, problema? }`: los fallos se muestran en pantalla
  en vez de dejar la galeria vacia en silencio. `contarFotos` en `exportar.ts` hace lo
  contrario a proposito — si `04_fotos.sql` no esta aplicado devuelve el mapa vacio y
  la exportacion se genera igual con la columna en cero.

### Catalogos

Ademas de `categorias`, tambien `ubicaciones` y `responsables` son tablas.
`cargarCatalogos()` en `src/lib/consultas.ts` las trae juntas para armar los
desplegables. Cualquier usuario autenticado puede insertar en `ubicaciones` y
`responsables`; solo `admin` administra `categorias`.

Los catalogos **se siembran solos**: `sembrarCatalogos()` hace `upsert` de la ubicacion
y el responsable cada vez que se crea o edita un bien, y la verificacion hace lo mismo
con la ubicacion. Escribir una ubicacion nueva en el formulario la agrega al catalogo.

### Listado: dos funciones, un solo filtro

`consultaActivos()` arma los filtros una vez y la usan las dos entradas publicas:

- `listarActivos()` — todo lo filtrado, **paginando por dentro** de a 1000 filas porque
  ese es el tope de Supabase por consulta. Sin ese bucle, a partir del bien 1001 los
  archivos exportados y los conteos mentirian en silencio. La usan las exportaciones.
- `listarActivosPagina()` — una pagina de `POR_PAGINA` filas mas el total; si la pagina
  pedida quedo fuera de rango cae en la ultima. La usa la tabla de inventario.

Los filtros viven en la URL (`?q=&categoria=&ubicacion=&responsable=&estado=&verificacion=`),
asi que son compartibles y las exportaciones solo reenvian el query string:
`filtrosDesdeUrl()` en `src/lib/exportar.ts` los reconstruye. **Agregar un filtro obliga a
tocar tres lugares**: `FiltrosActivos` + `consultaActivos()` en `consultas.ts`,
`filtrosDesdeUrl()` en `exportar.ts`, y el objeto `filtros` de cada pagina que lo use. Si
uno se olvida, la pantalla y el archivo exportado dejan de coincidir.

Las cuatro descargas (Excel, acta PDF, acta con fotos, etiquetas) viven **solo** en
`/reportes`; el inventario ya no las repite, solo enlaza ahi arrastrando sus filtros. La
pagina muestra la vista previa con `datosExport()` + `resumen()`, las mismas funciones que
alimentan los archivos, asi que lo que se ve es literalmente lo que se descarga. `ENCABEZADOS` en ese mismo archivo define el orden unico de columnas
que comparten Excel y PDF; agregar una columna se hace ahi, no en cada ruta.

### Forma de las Server Actions

Las acciones con validacion siguen todas el mismo contrato de `useActionState`:
`(estadoPrevio, FormData) => Promise<{ error?: string }>`. Devuelven `{ error }` para
que el formulario lo muestre, y cuando salen bien terminan en `revalidatePath()` mas un
`redirect()` con una bandera en el query string (`?alta=1`, `?guardado=1`,
`?verificado=1`, `?eliminado=1`) que la pagina destino lee para mostrar el aviso.

Las comprobaciones de rol dentro de las acciones (`perfil.rol !== "admin"` →
`redirect`) son de experiencia de uso; la barrera real es el RLS.

### Sesion en Server Components

`src/lib/sesion.ts` expone `perfilActual()` (redirige a `/login` sin sesion) y
`exigirAdmin()` (redirige a `/panel` si no es admin). Si el perfil aun no existe en
`perfiles`, `perfilActual()` devuelve uno minimo con rol `inventariador` en vez de fallar.

### Cosas duplicadas a proposito (cambiar en los dos lados)

- **Credenciales**: `src/lib/supabase/config.ts` las centraliza, pero `src/proxy.ts`
  vuelve a leer `process.env` por su cuenta porque corre antes. La clave se llama
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, no `ANON_KEY`.
- **Verde institucional**: `--color-siga` en `src/app/globals.css` para la pantalla y
  `VERDE_ARGB` / `VERDE_RGB` en `src/lib/exportar.ts` para exceljs y jspdf, que no leen CSS.
