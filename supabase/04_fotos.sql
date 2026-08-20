-- ============================================================
-- SIGA · Fotos de los bienes
-- Se ejecuta despues de 01_estructura.sql y 02_seguridad.sql.
--
-- Los archivos viven en Supabase Storage, en el bucket privado 'bienes';
-- la base solo guarda la ruta. Una foto puede documentar varios bienes
-- (la foto de un escritorio muestra monitor, CPU, teclado y regleta a la
-- vez), y un bien puede tener varias fotos: por eso la relacion es N a N
-- y no una columna 'foto_url' en la tabla de activos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLAS
-- ------------------------------------------------------------
create table if not exists public.fotos (
  id        bigint generated always as identity primary key,
  ruta      text unique not null,        -- ruta dentro del bucket, ej. computacion/pag-002-1.jpg
  alcance   text not null default 'bien'
            check (alcance in ('bien','puesto')),
  titulo    text default '',
  origen    text default '',             -- de donde salio la foto
  creado_en timestamptz not null default now(),
  creado_por text default ''
);

comment on column public.fotos.alcance is
  'bien = la foto muestra ese bien en particular; puesto = muestra el ambiente completo';

create table if not exists public.activo_fotos (
  activo_id bigint not null references public.activos(id) on delete cascade,
  foto_id   bigint not null references public.fotos(id)   on delete cascade,
  primary key (activo_id, foto_id)
);
create index if not exists idx_activo_fotos_foto on public.activo_fotos(foto_id);

-- ------------------------------------------------------------
-- 2. SEGURIDAD (misma regla que el resto: leer y registrar todos,
--    borrar solo el administrador)
-- ------------------------------------------------------------
alter table public.fotos        enable row level security;
alter table public.activo_fotos enable row level security;

drop policy if exists fotos_select on public.fotos;
create policy fotos_select on public.fotos
  for select to authenticated using (true);

drop policy if exists fotos_insert on public.fotos;
create policy fotos_insert on public.fotos
  for insert to authenticated with check (true);

drop policy if exists fotos_delete_admin on public.fotos;
create policy fotos_delete_admin on public.fotos
  for delete to authenticated using ( public.es_admin() );

drop policy if exists af_select on public.activo_fotos;
create policy af_select on public.activo_fotos
  for select to authenticated using (true);

drop policy if exists af_insert on public.activo_fotos;
create policy af_insert on public.activo_fotos
  for insert to authenticated with check (true);

drop policy if exists af_delete_admin on public.activo_fotos;
create policy af_delete_admin on public.activo_fotos
  for delete to authenticated using ( public.es_admin() );

-- ------------------------------------------------------------
-- 3. BUCKET PRIVADO
--    Si el editor no deja crear el bucket por SQL, se crea igual desde
--    Storage -> New bucket -> nombre 'bienes', con "Public" DESACTIVADO.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bienes', 'bienes', false)
on conflict (id) do nothing;

-- Al ser privado, nadie ve los archivos por URL directa: la aplicacion
-- genera enlaces firmados temporales para cada usuario con sesion.
drop policy if exists bienes_leer on storage.objects;
create policy bienes_leer on storage.objects
  for select to authenticated using ( bucket_id = 'bienes' );

drop policy if exists bienes_subir on storage.objects;
create policy bienes_subir on storage.objects
  for insert to authenticated with check ( bucket_id = 'bienes' );

drop policy if exists bienes_borrar on storage.objects;
create policy bienes_borrar on storage.objects
  for delete to authenticated using ( bucket_id = 'bienes' and public.es_admin() );
