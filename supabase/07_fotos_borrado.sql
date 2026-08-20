-- ============================================================
-- SIGA · Gestion de bajas de fotos
-- Se ejecuta despues de 04_fotos.sql. Es idempotente: se puede repetir.
--
-- Separa dos operaciones que NO son la misma cosa:
--
--   DESVINCULAR  quitar la foto de UN bien -> borra la fila de activo_fotos.
--                La foto sigue existiendo para los demas bienes.
--                Lo puede hacer cualquier usuario autenticado.
--
--   ELIMINAR     borrar la foto del sistema -> borra la fila de fotos y el
--                archivo del bucket, y en cascada todos sus vinculos.
--                Solo el administrador.
--
-- La distincion importa porque la relacion es N a N: de las 122 fotos
-- migradas, 32 son vistas generales de un ambiente y estan compartidas
-- entre 4 y 75 bienes (promedio 9.5). Un borrado hecho desde la ficha de
-- un bien se llevaria por delante decenas de fichas ajenas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Desvincular: pasa a estar permitido para cualquier autenticado
-- ------------------------------------------------------------
drop policy if exists af_delete_admin on public.activo_fotos;
drop policy if exists af_delete on public.activo_fotos;
create policy af_delete on public.activo_fotos
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 2. Eliminar la foto y su archivo: sigue siendo solo del admin
--    (se redeclaran para dejar el estado explicito en un solo lugar)
-- ------------------------------------------------------------
drop policy if exists fotos_delete_admin on public.fotos;
create policy fotos_delete_admin on public.fotos
  for delete to authenticated using ( public.es_admin() );

drop policy if exists bienes_borrar on storage.objects;
create policy bienes_borrar on storage.objects
  for delete to authenticated using ( bucket_id = 'bienes' and public.es_admin() );

-- ------------------------------------------------------------
-- 3. Trazabilidad
--    movimientos.tipo no tiene restriccion de valores, asi que las fotos
--    suman dos tipos nuevos a los tres que ya existian.
-- ------------------------------------------------------------
comment on column public.movimientos.tipo is
  'ALTA | MODIFICACION | VERIFICACION | FOTO_ALTA | FOTO_BAJA';

-- ------------------------------------------------------------
-- Comprobacion: como quedaron las politicas de borrado
-- ------------------------------------------------------------
select tablename, policyname, cmd
  from pg_policies
 where (schemaname = 'public'  and tablename in ('fotos', 'activo_fotos')
        and cmd = 'DELETE')
    or (schemaname = 'storage' and policyname = 'bienes_borrar')
 order by tablename, policyname;
-- Esperado: activo_fotos/af_delete, fotos/fotos_delete_admin, objects/bienes_borrar.
