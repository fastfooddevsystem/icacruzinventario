-- ============================================================
-- SIGA · Diagnostico de las fotos
-- No modifica nada: solo consulta y responde por que no se ven.
-- Ejecutar en el SQL Editor y revisar cada resultado por separado.
-- ============================================================

-- 1. ¿Estan las tablas y con cuantas filas?
select 'fotos'        as tabla, count(*) as filas from public.fotos
union all
select 'activo_fotos' as tabla, count(*)          from public.activo_fotos;
-- Esperado: fotos = 122, activo_fotos = varios cientos.
-- Si da error "relation does not exist", falta ejecutar 04_fotos.sql.
-- Si fotos = 0, falta ejecutar 05_fotos_computacion.sql.


-- 2. ¿Existe el bucket y es privado?
select id, name, public from storage.buckets where id = 'bienes';
-- Esperado: una fila con public = false.


-- 3. LA COMPROBACION IMPORTANTE:
--    ¿la ruta guardada en la base coincide con el archivo real del bucket?
select
  f.ruta                                   as ruta_en_la_base,
  o.name                                   as archivo_en_el_bucket,
  case when o.name is null
       then 'NO EXISTE en el bucket'
       else 'ok' end                       as resultado
from public.fotos f
left join storage.objects o
       on o.bucket_id = 'bienes'
      and o.name = f.ruta
order by (o.name is null) desc, f.ruta
limit 25;
-- Si sale "NO EXISTE en el bucket", los archivos estan subidos con otra ruta.
-- Lo mas comun: se subieron a la raiz del bucket en vez de la carpeta
-- 'computacion', o la carpeta quedo con otro nombre.


-- 4. Que rutas hay realmente en el bucket (para comparar con lo de arriba)
select name, round((metadata->>'size')::numeric / 1024) as kb
  from storage.objects
 where bucket_id = 'bienes'
 order by name
 limit 25;


-- 5. Cuantos archivos subidos en total
select count(*) as archivos_en_el_bucket
  from storage.objects where bucket_id = 'bienes';
-- Esperado: 122.


-- 6. Las politicas de acceso, por si el problema es de permisos
select policyname, cmd, roles::text
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname like 'bienes%';
-- Esperado: bienes_leer (SELECT), bienes_subir (INSERT), bienes_borrar (DELETE).


-- ------------------------------------------------------------
-- SI EL PASO 3 DICE "NO EXISTE" Y EL PASO 4 MUESTRA LOS ARCHIVOS
-- SIN LA CARPETA 'computacion/', esta linea corrige las rutas:
--
--   update public.fotos
--      set ruta = replace(ruta, 'computacion/', '')
--    where creado_por = 'MIGRACION-FOTOS-COMPUTACION';
--
-- Y si quedaron dentro de otra carpeta, por ejemplo 'fotos/':
--
--   update public.fotos
--      set ruta = replace(ruta, 'computacion/', 'fotos/')
--    where creado_por = 'MIGRACION-FOTOS-COMPUTACION';
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 7. CAUSA FRECUENTE: la API no "ve" las tablas recien creadas
--
-- Supabase cachea el esquema que expone por API. Si 04_fotos.sql se ejecuto
-- despues de que la aplicacion ya estaba andando, las consultas fallan con
-- "Could not find the table 'public.activo_fotos' in the schema cache"
-- aunque la tabla exista. Esta linea fuerza la recarga:
notify pgrst, 'reload schema';
-- Despues, recargar la pagina del sistema.
-- ------------------------------------------------------------
