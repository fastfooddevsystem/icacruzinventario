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
