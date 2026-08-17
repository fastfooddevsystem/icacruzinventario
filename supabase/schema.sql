-- ============================================================
-- SIGA · Esquema de base de datos (Supabase / PostgreSQL)
-- Inventario de bienes institucionales - ICACRUZ
-- Cómo ejecutar:  Supabase -> SQL Editor -> New query -> pegar todo -> Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFILES Y ROLES  (se apoya en auth.users de Supabase)
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text not null default '',
  cargo     text default '',
  rol       text not null default 'inventariador'
            check (rol in ('admin','inventariador')),
  creado_en timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: ¿el usuario actual es administrador?  (security definer = evita recursión de RLS)
create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 2. CATÁLOGOS
-- ------------------------------------------------------------
create table if not exists public.categorias (
  codigo text primary key,          -- 3 letras, ej. LPT
  nombre text not null,
  grupo  text not null default ''
);

create table if not exists public.ubicaciones (
  id     bigint generated always as identity primary key,
  nombre text unique not null
);

create table if not exists public.responsables (
  id     bigint generated always as identity primary key,
  nombre text unique not null,
  cargo  text default ''
);

-- ------------------------------------------------------------
-- 3. ACTIVOS (bienes)
-- ------------------------------------------------------------
create table if not exists public.activos (
  id              bigint generated always as identity primary key,
  codigo          text unique not null,
  categoria       text not null references public.categorias(codigo),
  denominacion    text not null,
  marca           text default '',
  modelo          text default '',
  serie           text default '',
  caracteristicas text default '',
  ubicacion       text default '',
  responsable     text default '',
  estado          text default 'Bueno',
  procedencia     text default 'Sin dato',
  fecha_adq       date,
  valor           numeric(14,2) default 0,
  observaciones   text default '',
  verificacion    text default 'Pendiente',
  fecha_verif     timestamptz,
  creado_en       timestamptz not null default now(),
  creado_por      text default '',
  actualizado_en  timestamptz not null default now()
);
create index if not exists idx_activos_categoria on public.activos(categoria);
create index if not exists idx_activos_ubicacion on public.activos(ubicacion);
create index if not exists idx_activos_estado    on public.activos(estado);

-- ------------------------------------------------------------
-- 4. MOVIMIENTOS (trazabilidad: alta, modificación, verificación)
-- ------------------------------------------------------------
create table if not exists public.movimientos (
  id        bigint generated always as identity primary key,
  activo_id bigint not null references public.activos(id) on delete cascade,
  fecha     timestamptz not null default now(),
  tipo      text not null,                 -- ALTA | MODIFICACION | VERIFICACION
  detalle   text default '',
  usuario   text default ''
);
create index if not exists idx_mov_activo on public.movimientos(activo_id);

-- ------------------------------------------------------------
-- 5. CÓDIGO AUTOMÁTICO  ->  ICA-CAT-0001
-- ------------------------------------------------------------
create or replace function public.generar_codigo(p_categoria text)
returns text
language plpgsql
as $$
declare
  v_prefijo text := 'ICA';   -- << cambie aquí el prefijo de la institución
  v_max int;
begin
  select coalesce(max((regexp_replace(codigo, '^.*-', ''))::int), 0)
    into v_max
  from public.activos
  where codigo like v_prefijo || '-' || p_categoria || '-%';
  return v_prefijo || '-' || p_categoria || '-' || lpad((v_max + 1)::text, 4, '0');
end;
$$;

-- Al insertar un bien sin código, se genera solo; también refresca actualizado_en
create or replace function public.activos_before_write()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') and (new.codigo is null or new.codigo = '') then
    new.codigo := public.generar_codigo(new.categoria);
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_activos_before_write on public.activos;
create trigger trg_activos_before_write
  before insert or update on public.activos
  for each row execute function public.activos_before_write();

-- ------------------------------------------------------------
-- 6. SEMILLA: 21 categorías + ubicaciones sugeridas
-- ------------------------------------------------------------
insert into public.categorias (codigo, nombre, grupo) values
  ('LPT','Laptop / Notebook','Equipo de computo'),
  ('CPU','CPU / Torre de escritorio','Equipo de computo'),
  ('MON','Monitor / Pantalla','Equipo de computo'),
  ('TEC','Teclado / Mouse / Periferico','Equipo de computo'),
  ('IMP','Impresora / Escaner / Fotocopiadora','Equipo de computo'),
  ('SRV','Servidor / NAS','Equipo de computo'),
  ('RED','Router / Switch / Access Point','Redes y comunicaciones'),
  ('CAB','Cableado / Rack / Patch panel','Redes y comunicaciones'),
  ('TEL','Telefono / Central telefonica','Redes y comunicaciones'),
  ('UPS','UPS / Estabilizador / Bateria','Energia'),
  ('PRY','Proyector / Ecran / Audiovisual','Audiovisual'),
  ('CAM','Camara / CCTV / DVR','Seguridad'),
  ('AIR','Aire acondicionado / Ventilacion','Infraestructura'),
  ('ESC','Escritorio / Mesa','Mobiliario'),
  ('SIL','Silla / Sillon / Banca','Mobiliario'),
  ('EST','Estante / Repisa / Libreria','Mobiliario'),
  ('ARM','Armario / Archivador / Gaveta','Mobiliario'),
  ('ELE','Electrodomestico (frigobar, microondas)','Otros bienes'),
  ('HER','Herramienta / Equipo de taller','Otros bienes'),
  ('VEH','Vehiculo / Motocicleta','Otros bienes'),
  ('OTR','Otro bien no clasificado','Otros bienes')
on conflict (codigo) do nothing;

insert into public.ubicaciones (nombre) values
  ('Direccion'),('Secretaria'),('Contabilidad'),('Sistemas'),
  ('Sala de reuniones'),('Almacen'),('Recepcion'),('Aula 1')
on conflict (nombre) do nothing;

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
