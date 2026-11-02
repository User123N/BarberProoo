-- Verificación manual en un proyecto de PRUEBAS (SQL Editor). Cada bloque debe terminar sin error o con el error indicado.
-- Todo se deshace al final (rollback). Requiere 001–005 y el negocio/usuario de prueba de setup_first_owner.sql.
begin;

-- Datos de prueba mínimos
do $$
declare v_biz uuid; v_barber uuid; v_service uuid; v_start timestamptz; v_r jsonb; v_cust uuid;
begin
  select id into v_biz from public.businesses where status='active' limit 1;
  if v_biz is null then raise exception 'Crea primero un negocio activo (setup_first_owner.sql)'; end if;
  insert into public.barbers(business_id, display_name) values (v_biz,'__test__') returning id into v_barber;
  insert into public.working_hours(business_id, barber_id, weekday, start_time, end_time)
    select v_biz, v_barber, d, '09:00', '18:00' from generate_series(0,6) d;
  insert into public.services(business_id, name, price, duration_minutes) values (v_biz,'__svc__',1000,30) returning id into v_service;

  -- 1) Un horario dentro de jornada, futuro y alineado, es válido
  v_start := ((((now() at time zone 'America/Bogota')::date + 3) + time '10:00') at time zone 'America/Bogota');
  assert public.is_slot_valid(v_biz, v_barber, v_start, v_start + interval '30 minutes'), 'slot válido debería aceptarse';
  -- 2) Fuera de jornada (03:00) se rechaza
  assert not public.is_slot_valid(v_biz, v_barber, v_start - interval '7 hours', v_start - interval '6 hours 30 minutes'), '03:00 debería rechazarse';
  -- 3) Reserva real y doble reserva del mismo horario
  v_r := public.create_public_booking((select slug from public.businesses where id=v_biz), v_service, v_barber, v_start, 'Prueba Uno', '3001112233');
  assert v_r ->> 'code' is not null, 'debe devolver código';
  begin
    perform public.create_public_booking((select slug from public.businesses where id=v_biz), v_service, v_barber, v_start, 'Prueba Dos', '3004445566');
    raise exception 'FALLO: permitió doble reserva';
  exception when others then
    assert sqlerrm like '%no está disponible%' or sqlerrm like '%acaba de ocuparse%', 'mensaje inesperado: ' || sqlerrm;
  end;
  -- 4) El horario reservado ya no aparece en la disponibilidad
  assert not exists (select 1 from public.get_available_slots((select slug from public.businesses where id=v_biz), v_service, v_barber, (v_start at time zone 'America/Bogota')::date) where out_slot_start = v_start), 'slot ocupado sigue disponible';
  -- 5) Mismo teléfono con otro formato = mismo cliente
  perform public.create_public_booking((select slug from public.businesses where id=v_biz), v_service, v_barber, v_start + interval '1 hour', 'Prueba Uno', '300-111 2233');
  select count(*) into v_cust from public.customers where business_id=v_biz and phone_digits='3001112233';
  assert v_cust = 1, 'teléfono duplicado: ' || v_cust;
  -- 6) Festivo bloquea el día
  insert into public.business_holidays(business_id, holiday_date) values (v_biz, (v_start at time zone 'America/Bogota')::date);
  assert not public.is_slot_valid(v_biz, v_barber, v_start + interval '2 hours', v_start + interval '2 hours 30 minutes'), 'festivo debería bloquear';
  raise notice 'OK: validaciones de disponibilidad y reserva';
end $$;

rollback;

-- Pruebas con dos usuarios (RLS): en el SQL Editor usa "set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}';"
-- 1) Un usuario del negocio A no debe ver filas del negocio B:   select count(*) from public.customers where business_id = '<id negocio B>';  -- esperado 0
-- 2) Un 'barber' no debe poder cambiar starts_at de una cita:     update public.appointments set starts_at = starts_at + interval '1 hour' where id = '<id>';  -- esperado: error
-- 3) Un 'admin' no debe poder cambiar su negocio a 'active':      update public.businesses set status='active' where id='<id>';  -- esperado: error
-- 4) anon no debe leer email de negocios:                         set local role anon; select email from public.businesses;  -- esperado: permission denied
