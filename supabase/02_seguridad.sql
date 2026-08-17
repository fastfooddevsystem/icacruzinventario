-- ============================================================
-- SIGA - PARTE 2/2: Seguridad a nivel de fila (RLS)
-- Corre esto DESPUES de la Parte 1.
-- ============================================================

-- ------------------------------------------------------------
-- 7. SEGURIDAD A NIVEL DE FILA (RLS)
-- ------------------------------------------------------------
alter table public.perfiles     enable row level security;
alter table public.categorias   enable row level security;
alter table public.ubicaciones  enable row level security;
alter table public.responsables enable row level security;
alter table public.activos      enable row level security;
alter table public.movimientos  enable row level security;

-- PERFILES: cada quien ve el suyo; el admin ve y edita todos
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated
  using ( id = auth.uid() or public.es_admin() );

drop policy if exists perfiles_update_admin on public.perfiles;
create policy perfiles_update_admin on public.perfiles
  for update to authenticated
  using ( public.es_admin() ) with check ( public.es_admin() );

-- LECTURA para todo usuario autenticado
drop policy if exists cat_select  on public.categorias;
drop policy if exists ubi_select  on public.ubicaciones;
drop policy if exists resp_select on public.responsables;
drop policy if exists act_select  on public.activos;
drop policy if exists mov_select  on public.movimientos;
create policy cat_select  on public.categorias   for select to authenticated using (true);
create policy ubi_select  on public.ubicaciones  for select to authenticated using (true);
create policy resp_select on public.responsables for select to authenticated using (true);
create policy act_select  on public.activos      for select to authenticated using (true);
create policy mov_select  on public.movimientos  for select to authenticated using (true);

-- REGISTRAR / ACTUALIZAR: cualquier usuario autenticado (inventariador o admin)
drop policy if exists act_insert  on public.activos;
drop policy if exists act_update  on public.activos;
drop policy if exists mov_insert  on public.movimientos;
drop policy if exists ubi_insert  on public.ubicaciones;
drop policy if exists resp_insert on public.responsables;
create policy act_insert  on public.activos      for insert to authenticated with check (true);
create policy act_update  on public.activos      for update to authenticated using (true) with check (true);
create policy mov_insert  on public.movimientos  for insert to authenticated with check (true);
create policy ubi_insert  on public.ubicaciones  for insert to authenticated with check (true);
create policy resp_insert on public.responsables for insert to authenticated with check (true);

-- SOLO ADMIN: eliminar bienes y gestionar categorías
drop policy if exists act_delete on public.activos;
drop policy if exists cat_admin  on public.categorias;
create policy act_delete on public.activos    for delete to authenticated using ( public.es_admin() );
create policy cat_admin  on public.categorias for all    to authenticated
  using ( public.es_admin() ) with check ( public.es_admin() );

-- ============================================================
-- LISTO. Después de crear tu PRIMER usuario (en Authentication -> Users,
-- o registrándote desde la app), conviértelo en admin con:
--
--   update public.perfiles set rol = 'admin'
--   where id = (select id from auth.users where email = 'TU-CORREO@ejemplo.com');
-- ============================================================
