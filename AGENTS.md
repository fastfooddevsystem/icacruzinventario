<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SIGA Web — Inventario de bienes ICACRUZ

Sistema Integrado de Gestión de Activos, versión web con base de datos en la nube.
Reemplaza al prototipo local `SISTEMA-SIGA` (FastAPI + SQLite), reutilizando su
modelo de datos y su esquema de códigos.

## Cómo ejecutarlo

```bash
npm run dev     # http://localhost:3000
npm run build   # verifica que todo compile
```

Las credenciales viven en `.env.local` (no se sube a git):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SIGA_INSTITUCION`, `NEXT_PUBLIC_SIGA_PREFIJO`.

No hay pruebas automatizadas. La verificación se hace con `npm run build`
(incluye TypeScript) y probando en el navegador.

## Base de datos

El esquema está en `supabase/01_estructura.sql` y `supabase/02_seguridad.sql`,
que se ejecutan **en ese orden** en el SQL Editor de Supabase. Contienen tablas,
el generador de códigos y las políticas de seguridad. **No hay migraciones**:
un cambio de columna se aplica con un `ALTER TABLE` escrito a mano.

Decisiones importantes que están en el SQL, no en el código TypeScript:

- **El código del bien lo genera la base de datos**, no la aplicación. El trigger
  `activos_before_write` llama a `generar_codigo()` cuando se inserta un activo sin
  código, produciendo `ICA-LPT-0001` (prefijo-categoría-correlativo de 4 dígitos por
  categoría). El prefijo está fijo dentro de esa función de PostgreSQL: cambiarlo
  requiere editar el SQL, no la variable de entorno.
- **Los permisos los aplica PostgreSQL con RLS**, no la interfaz. Cualquier usuario
  autenticado puede leer, registrar y actualizar bienes; solo el rol `admin` puede
  eliminar bienes y administrar categorías. Las comprobaciones de rol en el código
  (`exigirAdmin`) son para la experiencia de uso; la barrera real es el RLS, y por eso
  ocultar un botón no basta ni es necesario para la seguridad.
- **Los roles viven en `public.perfiles`**, creada automáticamente por el trigger
  `on_auth_user_created` cuando alguien se registra en Auth. El primer administrador
  se designa a mano con un `UPDATE` (ver el comentario al final del SQL).
- `categorias` es tabla (editable desde Administración), a diferencia del prototipo
  local donde las categorías eran constantes de Python.

## Arquitectura

Next.js App Router con Server Components; los datos se leen en el servidor y las
escrituras se hacen con Server Actions. No hay capa de API propia salvo las
exportaciones.

- `src/proxy.ts` — protege todas las rutas. Sin sesión manda a `/login`; con sesión
  saca del `/login`. En Next 16 este archivo se llama `proxy.ts` y exporta `proxy`
  (antes era `middleware.ts`); si se renombra mal, el dev server falla al arrancar.
- `src/app/(privado)/` — grupo de rutas con sesión: su `layout.tsx` resuelve el perfil
  una vez y dibuja la cabecera. Todo lo que va dentro ya asume usuario autenticado.
- `src/lib/consultas.ts` — `listarActivos()` es la **única** fuente de la lista de
  bienes: la usan la tabla de inventario y las tres exportaciones, así que los archivos
  exportados respetan siempre los filtros de pantalla. Los filtros viven en la URL
  (`?q=&categoria=…`), lo que hace que sean compartibles y que las exportaciones solo
  tengan que reenviar el query string.
- `src/lib/exportar.ts` — datos y resumen comunes a Excel y PDF.
- `src/app/api/export/{excel,pdf,etiquetas}/route.ts` — descargas generadas en el
  servidor con `exceljs` y `jspdf`. El PDF es un acta con resumen y hoja de firmas.
- **Trazabilidad**: cada alta, edición y verificación inserta una fila en `movimientos`
  (`ALTA`, `MODIFICACION`, `VERIFICACION`). La edición calcula un diff legible de los
  campos que cambiaron antes de guardar, y ese texto es lo que se ve como historial.

## Convenciones

- **Todo el proyecto está en español**: identificadores, comentarios, nombres de
  tablas y textos de interfaz (`activos`, `denominacion`, `crearActivo`, `listarActivos`).
  No introducir nombres en inglés.
- Los catálogos guardan valores **sin acentos** (`"En reparacion"`, `"Dado de baja"`)
  porque así están en la base; el código compara con esas cadenas exactas
  (`EtiquetaEstado`). Mantenerlos sin acentos en ambos lados.
- Los bienes se identifican por su **código** en texto. El prototipo local usaba
  etiquetas QR; en esta versión se decidió no usarlas: las etiquetas imprimibles llevan
  el código en grande y la verificación física se hace escribiéndolo.
- Moneda en bolivianos (Bs), formato `es-BO` en pantalla y `#,##0.00` en Excel.
- `exceljs` arrastra un aviso moderado de `npm audit` por su dependencia `uuid`, en una
  ruta de código que no usamos. Bajar de versión rompe la generación de Excel.
