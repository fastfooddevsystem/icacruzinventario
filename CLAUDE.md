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

## Detalles que complementan a AGENTS.md

- **Catalogos en base de datos**: ademas de `categorias`, tambien `ubicaciones` y
  `responsables` son tablas. `cargarCatalogos()` en `src/lib/consultas.ts` las trae
  juntas para armar los desplegables. Cualquier usuario autenticado puede insertar en
  `ubicaciones` y `responsables`; solo `admin` administra `categorias`.
- **Sesion en Server Components**: `src/lib/sesion.ts` expone `perfilActual()` (redirige
  a `/login` sin sesion) y `exigirAdmin()` (redirige a `/panel` si no es admin). Si el
  perfil aun no existe en `perfiles`, `perfilActual()` devuelve uno minimo con rol
  `inventariador` en vez de fallar.
- **Las exportaciones no repiten logica de filtrado**: `filtrosDesdeUrl()` en
  `src/lib/exportar.ts` reconstruye los filtros desde el query string y se los pasa a
  `listarActivos()`. `ENCABEZADOS` en ese mismo archivo define el orden unico de columnas
  que comparten Excel y PDF; agregar una columna se hace ahi, no en cada ruta.
- **Variables de entorno duplicadas a proposito**: `src/lib/supabase/config.ts` centraliza
  las credenciales, pero `src/proxy.ts` vuelve a leer `process.env` por su cuenta. Un
  cambio de nombre de variable hay que aplicarlo en ambos. La clave se llama
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, no `ANON_KEY`.
- **`supabase/schema.sql` esta obsoleto**: es la version monolitica anterior, reemplazada
  por `01_estructura.sql` + `02_seguridad.sql`. Editar siempre los archivos numerados.
