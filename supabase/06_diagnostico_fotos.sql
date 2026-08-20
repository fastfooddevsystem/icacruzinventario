-- ============================================================
-- SIGA · Diagnostico de las fotos
-- No modifica nada: solo consulta y responde por que no se ven.
-- Ejecutar en el SQL Editor y revisar cada resultado por separado.
-- ============================================================

-- ------------------------------------------------------------
-- 0. VEREDICTO EN UNA SOLA CONSULTA
--    Ejecutar SOLO esto primero: dice en que eslabon se corta la cadena.
--    Si no alcanza, seguir con los pasos 1 a 7 de abajo.
-- ------------------------------------------------------------
with
  nfo    as (select count(*) n from public.fotos),
  af     as (select count(*) n from public.activo_fotos),
  bien   as (select count(distinct activo_id) n from public.activo_fotos),
  buck   as (select count(*) n from storage.buckets where id = 'bienes'),
  obj    as (select count(*) n from storage.objects where bucket_id = 'bienes'),
  calzan as (select count(*) n
               from public.fotos f
               join storage.objects o
                 on o.bucket_id = 'bienes' and o.name = f.ruta)
select
  nfo.n    as fotos_registradas,
  af.n     as vinculos_bien_foto,
  bien.n   as bienes_con_al_menos_una_foto,
  obj.n    as archivos_en_el_bucket,
  calzan.n as rutas_que_calzan_con_un_archivo,
  case
    when buck.n = 0 then
      'FALTA EL BUCKET: crear ''bienes'' en Storage, con Public DESACTIVADO.'
    when nfo.n = 0 then
      'FALTA EJECUTAR 05_fotos_computacion.sql: no hay ninguna foto registrada.'
    when af.n = 0 then
      'FOTOS SIN VINCULAR: 05 corrio pero no encontro los bienes de 03. Revisar que los activos tengan creado_por = MIGRACION-COMPUTACION-2026.'
    when obj.n = 0 then
      'BUCKET VACIO: faltan subir los archivos .jpg al bucket ''bienes''.'
    when calzan.n = 0 then
      'RUTAS QUE NO CALZAN: los archivos estan subidos con otra ruta. Ver el paso 3 y la correccion de mas abajo.'
    when calzan.n < nfo.n then
      'PARCIAL: ' || (nfo.n - calzan.n) || ' foto(s) registradas no tienen archivo. Ver el paso 3.'
    else
      'DATOS OK: si aun asi no se ven, es cache de esquema o sesion. Correr el paso 7 (notify pgrst) y recargar.'
  end as diagnostico
from nfo, af, bien, buck, obj, calzan;


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


-- 3b. LA CONSULTA QUE DECIDE QUE HACER: en que carpeta esta cada cosa.
select coalesce(nullif(split_part(name, '/', 1), name), '(raiz)') as carpeta,
       count(*) as archivos
  from storage.objects
 where bucket_id = 'bienes'
 group by 1
 order by 1;
-- Sin filas          -> el bucket esta vacio: hay que subir los 122 .jpg.
-- '(raiz)' con 122   -> se subieron sueltos: usar el UPDATE de mas abajo.
-- 'computacion' 122  -> las rutas ya calzan; el problema es otro.


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
