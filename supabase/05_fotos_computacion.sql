-- ============================================================
-- SIGA - Fotos del inventario de equipos de computacion
--
-- Requiere: 04_fotos.sql aplicado, los bienes ya migrados con
-- 03_migracion_computacion.sql, y los 122 archivos subidos al
-- bucket 'bienes' dentro de la carpeta 'computacion'.
--
-- Cada foto se registra una sola vez. Las que muestran un bien concreto
-- se asocian a ese bien (y a sus unidades gemelas, si el PDF listaba
-- varias); las que son vista general del ambiente se asocian a todos
-- los bienes de esa ficha, marcadas con alcance 'puesto'.
-- Es seguro: si se ejecuta dos veces, la segunda aborta sin insertar nada.
-- ============================================================

do $$
declare
  r          record;
  v_foto     bigint;
  v_vinculos int;
  n_fotos    int := 0;
  n_total    int := 0;
  n_huerfana int := 0;
begin
  if exists (select 1 from public.fotos where creado_por = 'MIGRACION-FOTOS-COMPUTACION') then
    raise exception 'Las fotos ya fueron cargadas. Para rehacerlo, borre primero las filas de fotos cuyo creado_por sea MIGRACION-FOTOS-COMPUTACION';
  end if;

  for r in
    select * from (values
      (   1, 'computacion/pag-002-1.jpg',    1, '*', '*', 'Vista general - EPJ-GP'),
      (   2, 'computacion/pag-002-2.jpg',    1, 'Impresora', 'Epson', 'Impresora Epson - EPJ-GP'),
      (   3, 'computacion/pag-003-1.jpg',    1, 'Radio', 'Sony', 'Radio Sony - EPJ-GP'),
      (   4, 'computacion/pag-003-2.jpg',    1, 'Celular corporativo', 'Samsung', 'Celular corporativo Samsung - EPJ-GP'),
      (   5, 'computacion/pag-004-1.jpg',    1, 'Parlante', 'DJV', 'Parlante DJV - EPJ-GP'),
      (   6, 'computacion/pag-004-2.jpg',    1, 'Parlante', 'DJV', 'Parlante DJV - EPJ-GP'),
      (   7, 'computacion/pag-006-1.jpg',    5, 'Laptop', 'HP', 'Laptop HP - SECRETARIA DE EPJ-GP'),
      (   8, 'computacion/pag-006-2.jpg',    5, 'Telefono', 'Panasonic', 'Telefono Panasonic - SECRETARIA DE EPJ-GP'),
      (   9, 'computacion/pag-007-1.jpg',    5, '*', '*', 'Vista general - SECRETARIA DE EPJ-GP'),
      (  10, 'computacion/pag-007-2.jpg',    5, 'CPU de escritorio', '', 'CPU de escritorio - SECRETARIA DE EPJ-GP'),
      (  11, 'computacion/pag-008-1.jpg',    5, 'Proyector', 'Epson', 'Proyector Epson - SECRETARIA DE EPJ-GP'),
      (  12, 'computacion/pag-008-2.jpg',    5, 'Cable HDMI', '', 'Cable HDMI - SECRETARIA DE EPJ-GP'),
      (  13, 'computacion/pag-009-1.jpg',    5, 'Camara', 'Hikvision', 'Camara Hikvision - SECRETARIA DE EPJ-GP'),
      (  14, 'computacion/pag-009-2.jpg',    5, 'Tripode', '', 'Tripode - SECRETARIA DE EPJ-GP'),
      (  15, 'computacion/pag-011-1.jpg',   10, 'Laptop', 'HP', 'Laptop HP - BIBLIOTECA'),
      (  16, 'computacion/pag-011-2.jpg',   10, 'Impresora de adhesivos', '', 'Impresora de adhesivos - BIBLIOTECA'),
      (  17, 'computacion/pag-013-1.jpg',   12, '*', '*', 'Vista general - RECEPCION'),
      (  18, 'computacion/pag-015-1.jpg',   14, 'Laptop', 'HP', 'Laptop HP - GERENCIA'),
      (  19, 'computacion/pag-015-2.jpg',   14, 'Impresora', 'HP', 'Impresora HP - GERENCIA'),
      (  20, 'computacion/pag-016-1.jpg',   14, 'Telefono', 'Panasonic', 'Telefono Panasonic - GERENCIA'),
      (  21, 'computacion/pag-016-2.jpg',   14, 'Estabilizador', 'Forza', 'Estabilizador Forza - GERENCIA'),
      (  22, 'computacion/pag-018-1.jpg',   17, '*', '*', 'Vista general - SECRETARIA DE GERENCIA'),
      (  23, 'computacion/pag-018-2.jpg',   17, 'Impresora', 'Epson', 'Impresora Epson - SECRETARIA DE GERENCIA'),
      (  24, 'computacion/pag-019-1.jpg',   17, 'Telefono', 'Panasonic', 'Telefono Panasonic - SECRETARIA DE GERENCIA'),
      (  25, 'computacion/pag-019-2.jpg',   17, 'Celular corporativo', 'Samsung', 'Celular corporativo Samsung - SECRETARIA DE GERENCIA'),
      (  26, 'computacion/pag-021-1.jpg',   20, '*', '*', 'Vista general - MARKETING'),
      (  27, 'computacion/pag-021-2.jpg',   20, 'CPU de escritorio', '', 'CPU de escritorio - MARKETING'),
      (  28, 'computacion/pag-022-1.jpg',   20, 'Impresora', 'Epson', 'Impresora Epson - MARKETING'),
      (  29, 'computacion/pag-022-2.jpg',   20, 'Router', 'TP-Link', 'Router TP-Link - MARKETING'),
      (  30, 'computacion/pag-024-1.jpg',   23, '*', '*', 'Vista general - MARKETING'),
      (  31, 'computacion/pag-025-1.jpg',   23, 'Tripode', '', 'Tripode - MARKETING'),
      (  32, 'computacion/pag-025-2.jpg',   23, 'Tripode', '', 'Tripode - MARKETING'),
      (  33, 'computacion/pag-026-1.jpg',   23, 'Aro de luz', '', 'Aro de luz - MARKETING'),
      (  34, 'computacion/pag-026-2.jpg',   23, 'Luz LED', 'Huavi', 'Luz LED Huavi - MARKETING'),
      (  35, 'computacion/pag-027-1.jpg',   23, 'Camara fotografica', 'Nikon', 'Camara fotografica Nikon - MARKETING'),
      (  36, 'computacion/pag-027-2.jpg',   23, 'Luz LED portatil', '', 'Luz LED portatil - MARKETING'),
      (  37, 'computacion/pag-028-1.jpg',   23, 'Microfono inalambrico', 'Eletro', 'Microfono inalambrico Eletro - MARKETING'),
      (  38, 'computacion/pag-028-2.jpg',   23, 'Microfono inalambrico', 'Eletro', 'Microfono inalambrico Eletro - MARKETING'),
      (  39, 'computacion/pag-030-1.jpg',   29, '*', '*', 'Vista general - CAJA AFILIACION'),
      (  40, 'computacion/pag-030-2.jpg',   29, 'Impresora', 'HP', 'Impresora HP - CAJA AFILIACION'),
      (  41, 'computacion/pag-031-1.jpg',   29, 'Impresora de credenciales', 'Epson', 'Impresora de credenciales Epson - CAJA AFILIACION'),
      (  42, 'computacion/pag-031-2.jpg',   29, 'Celular corporativo', 'Samsung', 'Celular corporativo Samsung - CAJA AFILIACION'),
      (  43, 'computacion/pag-033-1.jpg',   32, '*', '*', 'Vista general - APOYO AL ICACRUZ'),
      (  44, 'computacion/pag-033-2.jpg',   32, 'Impresora', 'HP', 'Impresora HP - APOYO AL ICACRUZ'),
      (  45, 'computacion/pag-034-1.jpg',   32, 'Switch', 'TP-Link', 'Switch TP-Link - APOYO AL ICACRUZ'),
      (  46, 'computacion/pag-034-2.jpg',   32, 'Regleta', 'Forza', 'Regleta Forza - APOYO AL ICACRUZ'),
      (  47, 'computacion/pag-036-1.jpg',   35, '*', '*', 'Vista general - GERENTE ADMINISTRATIVO'),
      (  48, 'computacion/pag-036-2.jpg',   35, 'CPU de escritorio', '', 'CPU de escritorio - GERENTE ADMINISTRATIVO'),
      (  49, 'computacion/pag-037-1.jpg',   35, 'Impresora', 'Canon', 'Impresora Canon - GERENTE ADMINISTRATIVO'),
      (  50, 'computacion/pag-037-2.jpg',   35, 'Telefono', 'Panasonic', 'Telefono Panasonic - GERENTE ADMINISTRATIVO'),
      (  51, 'computacion/pag-038-1.jpg',   35, 'Estabilizador', 'Forza', 'Estabilizador Forza - GERENTE ADMINISTRATIVO'),
      (  52, 'computacion/pag-038-2.jpg',   35, 'Impresora', 'Brother', 'Impresora Brother - GERENTE ADMINISTRATIVO'),
      (  53, 'computacion/pag-039-1.jpg',   35, 'Parlante', 'Bose', 'Parlante Bose - GERENTE ADMINISTRATIVO'),
      (  54, 'computacion/pag-039-2.jpg',   35, '*', '*', 'Vista general - GERENTE ADMINISTRATIVO'),
      (  55, 'computacion/pag-041-1.jpg',   40, '*', '*', 'Vista general - AUXILIAR CONTABLE-1'),
      (  56, 'computacion/pag-042-1.jpg',   40, 'Impresora', 'HP', 'Impresora HP - AUXILIAR CONTABLE-1'),
      (  57, 'computacion/pag-042-2.jpg',   40, 'Switch', 'TP-Link', 'Switch TP-Link - AUXILIAR CONTABLE-1'),
      (  58, 'computacion/pag-044-1.jpg',   43, '*', '*', 'Vista general - AUXILIAR CONTABLE-2'),
      (  59, 'computacion/pag-044-2.jpg',   43, 'Regleta', 'Forza', 'Regleta Forza - AUXILIAR CONTABLE-2'),
      (  60, 'computacion/pag-045-1.jpg',   45, 'Servidor', '', 'Servidor - CONTABILIDAD - SERVIDOR'),
      (  61, 'computacion/pag-048-1.jpg',   46, 'Rack', '', 'Rack - CENTRAL DE REDES - SERVIDOR'),
      (  62, 'computacion/pag-049-1.jpg',   46, '*', '*', 'Vista general - CENTRAL DE REDES - SERVIDOR'),
      (  63, 'computacion/pag-049-2.jpg',   46, 'UPS', 'Forza', 'UPS Forza - CENTRAL DE REDES - SERVIDOR'),
      (  64, 'computacion/pag-050-1.jpg',   46, 'Patch panel', 'Next', 'Patch panel Next - CENTRAL DE REDES - SERVIDOR'),
      (  65, 'computacion/pag-050-2.jpg',   46, 'Switch', 'TP-Link', 'Switch TP-Link - CENTRAL DE REDES - SERVIDOR'),
      (  66, 'computacion/pag-052-1.jpg',   51, 'Laptop', 'HP', 'Laptop HP - ARCHIVO'),
      (  67, 'computacion/pag-052-2.jpg',   51, 'Escaner', 'Brother', 'Escaner Brother - ARCHIVO'),
      (  68, 'computacion/pag-053-1.jpg',   53, 'Regleta', 'Forza', 'Regleta Forza - ARCHIVO'),
      (  69, 'computacion/pag-054-1.jpg',   53, '*', '*', 'Vista general - ARCHIVO'),
      (  70, 'computacion/pag-054-2.jpg',   53, 'CPU de escritorio', '', 'CPU de escritorio - ARCHIVO'),
      (  71, 'computacion/pag-056-1.jpg',   55, '*', '*', 'Vista general - COBRANZAS-1'),
      (  72, 'computacion/pag-056-2.jpg',   55, 'Telefono', 'Panasonic', 'Telefono Panasonic - COBRANZAS-1'),
      (  73, 'computacion/pag-058-1.jpg',   57, '*', '*', 'Vista general - COBRANZAS-2'),
      (  74, 'computacion/pag-058-2.jpg',   57, 'Telefono', 'Panasonic', 'Telefono Panasonic - COBRANZAS-2'),
      (  75, 'computacion/pag-059-1.jpg',   57, 'Impresora', 'HP', 'Impresora HP - COBRANZAS-2'),
      (  76, 'computacion/pag-059-2.jpg',   57, 'Switch', 'TP-Link', 'Switch TP-Link - COBRANZAS-2'),
      (  77, 'computacion/pag-060-1.jpg',   57, 'Router', 'TP-Link', 'Router TP-Link - COBRANZAS-2'),
      (  78, 'computacion/pag-062-1.jpg',   61, 'Laptop', 'HP', 'Laptop HP - COBRANZAS-3'),
      (  79, 'computacion/pag-062-2.jpg',   61, 'Impresora', 'Canon', 'Impresora Canon - COBRANZAS-3'),
      (  80, 'computacion/pag-063-1.jpg',   61, 'Telefono', 'Panasonic', 'Telefono Panasonic - COBRANZAS-3'),
      (  81, 'computacion/pag-065-1.jpg',   64, 'Laptop', 'HP', 'Laptop HP - COBRANZAS-4'),
      (  82, 'computacion/pag-065-2.jpg',   64, 'Impresora', 'HP', 'Impresora HP - COBRANZAS-4'),
      (  83, 'computacion/pag-067-1.jpg',   66, 'Laptop', 'HP', 'Laptop HP - COBRANZAS-5'),
      (  84, 'computacion/pag-069-1.jpg',   68, '*', '*', 'Vista general - TRIBUNAL DE HONOR'),
      (  85, 'computacion/pag-069-2.jpg',   68, 'CPU de escritorio', '', 'CPU de escritorio - TRIBUNAL DE HONOR'),
      (  86, 'computacion/pag-070-1.jpg',   68, 'Impresora', 'HP', 'Impresora HP - TRIBUNAL DE HONOR'),
      (  87, 'computacion/pag-070-2.jpg',   68, 'Telefono', 'Panasonic', 'Telefono Panasonic - TRIBUNAL DE HONOR'),
      (  88, 'computacion/pag-071-1.jpg',   68, 'Router', 'TP-Link', 'Router TP-Link - TRIBUNAL DE HONOR'),
      (  89, 'computacion/pag-073-1.jpg',   72, '*', '*', 'Vista general - TRIBUNAL DE HONOR-2'),
      (  90, 'computacion/pag-073-2.jpg',   72, 'CPU de escritorio', '', 'CPU de escritorio - TRIBUNAL DE HONOR-2'),
      (  91, 'computacion/pag-074-1.jpg',   74, 'Telefono', 'Panasonic', 'Telefono Panasonic - COCINA'),
      (  92, 'computacion/pag-076-1.jpg',   75, '*', '*', 'Vista general - SECRETARIA DE PRESIDENCIA'),
      (  93, 'computacion/pag-076-2.jpg',   75, 'CPU de escritorio', '', 'CPU de escritorio - SECRETARIA DE PRESIDENCIA'),
      (  94, 'computacion/pag-077-1.jpg',   75, 'Impresora', 'HP', 'Impresora HP - SECRETARIA DE PRESIDENCIA'),
      (  95, 'computacion/pag-077-2.jpg',   75, 'Telefono', 'Panasonic', 'Telefono Panasonic - SECRETARIA DE PRESIDENCIA'),
      (  96, 'computacion/pag-078-1.jpg',   75, '*', '*', 'Vista general - SECRETARIA DE PRESIDENCIA'),
      (  97, 'computacion/pag-078-2.jpg',   75, 'Router', 'TP-Link', 'Router TP-Link - SECRETARIA DE PRESIDENCIA'),
      (  98, 'computacion/pag-080-1.jpg',   79, 'Laptop', 'HP', 'Laptop HP - SECRETARIA DE PRESIDENCIA'),
      (  99, 'computacion/pag-080-2.jpg',   79, 'Regleta', 'GCR', 'Regleta GCR - SECRETARIA DE PRESIDENCIA'),
      ( 100, 'computacion/pag-081-1.jpg',   81, 'Laptop', 'HP', 'Laptop HP - SECRETARIA DE PRESIDENCIA'),
      ( 101, 'computacion/pag-083-1.jpg',   82, 'Impresora', 'Epson', 'Impresora Epson - PRESIDENCIA'),
      ( 102, 'computacion/pag-083-2.jpg',   82, '*', '*', 'Vista general - PRESIDENCIA'),
      ( 103, 'computacion/pag-084-1.jpg',   82, 'Telefono', 'Panasonic', 'Telefono Panasonic - PRESIDENCIA'),
      ( 104, 'computacion/pag-084-2.jpg',   82, 'Telefono', 'Panasonic', 'Telefono Panasonic - PRESIDENCIA'),
      ( 105, 'computacion/pag-085-1.jpg',   82, 'Switch', 'TP-Link', 'Switch TP-Link - PRESIDENCIA'),
      ( 106, 'computacion/pag-085-2.jpg',   82, 'Access point', 'Ubiquiti', 'Access point Ubiquiti - PRESIDENCIA'),
      ( 107, 'computacion/pag-087-1.jpg',   86, 'Router', 'Dahua', 'Router Dahua - SALON AUDITORIO'),
      ( 108, 'computacion/pag-087-2.jpg',   86, 'Reproductor DVD', 'LG', 'Reproductor DVD LG - SALON AUDITORIO'),
      ( 109, 'computacion/pag-087-3.jpg',   86, 'Reproductor DVD', 'LG', 'Reproductor DVD LG - SALON AUDITORIO'),
      ( 110, 'computacion/pag-088-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 111, 'computacion/pag-089-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 112, 'computacion/pag-089-2.jpg',   86, 'Estabilizador', 'Forza', 'Estabilizador Forza - SALON AUDITORIO'),
      ( 113, 'computacion/pag-090-1.jpg',   86, 'Proyector', 'Epson', 'Proyector Epson - SALON AUDITORIO'),
      ( 114, 'computacion/pag-090-2.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 115, 'computacion/pag-091-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 116, 'computacion/pag-091-2.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 117, 'computacion/pag-092-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 118, 'computacion/pag-092-2.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 119, 'computacion/pag-093-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 120, 'computacion/pag-093-2.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 121, 'computacion/pag-094-1.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO'),
      ( 122, 'computacion/pag-094-2.jpg',   86, '*', '*', 'Vista general - SALON AUDITORIO')
    ) as t(orden, ruta, ficha, denominacion, marca, titulo)
    order by orden
  loop
    insert into public.fotos (ruta, alcance, titulo, origen, creado_por)
    values (
      r.ruta,
      case when r.denominacion = '*' then 'puesto' else 'bien' end,
      r.titulo,
      'PDF inventario de equipos de computacion, pag. ' || r.ficha,
      'MIGRACION-FOTOS-COMPUTACION'
    ) returning id into v_foto;
    n_fotos := n_fotos + 1;

    if r.denominacion = '*' then
      -- Vista general: se vincula con todos los bienes de la ficha.
      insert into public.activo_fotos (activo_id, foto_id)
      select a.id, v_foto
        from public.activos a
       where a.creado_por = 'MIGRACION-COMPUTACION-2026'
         and a.observaciones ~ ('pag\. ' || r.ficha || '($|[^0-9])');
    else
      -- Foto de un bien: alcanza a todas sus unidades gemelas de la ficha.
      insert into public.activo_fotos (activo_id, foto_id)
      select a.id, v_foto
        from public.activos a
       where a.creado_por = 'MIGRACION-COMPUTACION-2026'
         and a.observaciones ~ ('pag\. ' || r.ficha || '($|[^0-9])')
         and a.denominacion = r.denominacion
         and a.marca = r.marca;
    end if;

    get diagnostics v_vinculos = row_count;
    n_total := n_total + v_vinculos;
    if v_vinculos = 0 then
      n_huerfana := n_huerfana + 1;
      raise warning 'La foto % no quedo asociada a ningun bien', r.ruta;
    end if;
  end loop;

  raise notice 'Fotos registradas: %  |  vinculos con bienes: %  |  sin asociar: %',
               n_fotos, n_total, n_huerfana;
end $$;

-- ------------------------------------------------------------
-- Comprobacion
-- ------------------------------------------------------------
select f.alcance, count(*) as fotos, sum(v.n) as vinculos
  from public.fotos f
  join lateral (select count(*) as n from public.activo_fotos af
                 where af.foto_id = f.id) v on true
 where f.creado_por = 'MIGRACION-FOTOS-COMPUTACION'
 group by f.alcance;

-- Bienes que quedaron con al menos una foto propia (no del ambiente):
--   select a.codigo, a.denominacion, a.ubicacion
--     from public.activos a
--     join public.activo_fotos af on af.activo_id = a.id
--     join public.fotos f on f.id = af.foto_id and f.alcance = 'bien'
--    group by a.codigo, a.denominacion, a.ubicacion order by a.codigo;
