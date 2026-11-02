-- BarberPro 005: disponibilidad real, reservas seguras, roles con permisos y horarios.
-- Requisitos: 001–004 ejecutadas y 003 confirmada (valores nuevos del enum).
-- NO ejecutada contra un Postgres real: probar en un proyecto de pruebas.
-- Convención: working_hours.weekday = extract(dow): 0=domingo … 6=sábado.

-- ───────────────────────── Ajustes nuevos del negocio ─────────────────────────
alter table public.business_settings
  add column if not exists min_notice_minutes integer not null default 30 check (min_notice_minutes >= 0),
  add column if not exists pending_hold_hours integer not null default 12 check (pending_hold_hours between 1 and 168),
  add column if not exists auto_confirm boolean not null default false;

-- Negocios existentes sin fila de ajustes la reciben ahora.
insert into public.business_settings(business_id)
select b.id from public.businesses b
where not exists (select 1 from public.business_settings s where s.business_id = b.id);

-- Horario por defecto EDITABLE (lun–sáb 09:00–19:00) para barberos que no tengan ninguno,
-- de lo contrario nadie podría reservar al activar la validación de horarios.
insert into public.working_hours(business_id, barber_id, weekday, start_time, end_time)
select b.business_id, b.id, d, time '09:00', time '19:00'
from public.barbers b, generate_series(1, 6) d
where not exists (select 1 from public.working_hours w where w.barber_id = b.id);

-- ───────────────────────── Clientes, citas y códigos ─────────────────────────
alter table public.customers
  add column if not exists phone_digits text generated always as (regexp_replace(phone, '[^0-9]', '', 'g')) stored;
create index if not exists idx_customers_business_digits on public.customers(business_id, phone_digits);

alter table public.appointments add column if not exists public_code text;
create unique index if not exists appointments_public_code_unique on public.appointments(public_code) where public_code is not null;

create table if not exists public.booking_attempts (
  id bigserial primary key,
  actor text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_booking_attempts on public.booking_attempts(actor, action, created_at desc);
alter table public.booking_attempts enable row level security;  -- sin políticas: sólo funciones SECURITY DEFINER

-- ───────────────────────── Roles y permisos ─────────────────────────
create or replace function public.member_role_of(target_business uuid)
returns public.member_role language sql stable security definer set search_path = '' as $$
  select bm.role from public.business_members bm
  where bm.business_id = target_business and bm.user_id = (select auth.uid()) and bm.active = true
  limit 1;
$$;
-- Gestión: owner, admin, manager.  Personal de recepción: además receptionist.
create or replace function public.is_business_manager(target_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role_of(target_business) in ('owner','admin','manager'), false);
$$;
create or replace function public.is_business_staff(target_business uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role_of(target_business) in ('owner','admin','manager','receptionist'), false);
$$;
create or replace function public.is_own_barber(target_business uuid, target_barber uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.barbers b
    where b.id = target_barber and b.business_id = target_business and b.profile_id = (select auth.uid()))
    and coalesce(public.member_role_of(target_business) = 'barber', false);
$$;
do $$
declare f text;
begin
  foreach f in array array['member_role_of(uuid)','is_business_manager(uuid)','is_business_staff(uuid)','is_own_barber(uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Escritura operativa: gerencia (catálogo, horarios) y recepción (citas, clientes, lista de espera).
do $$
declare r record;
begin
  for r in select * from (values
    ('services','services_admin_write'),('barbers','barbers_admin_write'),
    ('working_hours','working_hours_admin_write'),('schedule_exceptions','schedule_exceptions_admin_write'),
    ('blocked_times','blocked_times_admin_write'),('business_holidays','holidays_admin_write'),
    ('barber_services','barber_services_admin_write'),('service_categories','categories_admin_write')
  ) as t(tbl, pol) loop
    execute format('drop policy if exists %I on public.%I', r.pol, r.tbl);
    execute format('drop policy if exists %I on public.%I', r.tbl || '_manager_write', r.tbl);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_business_manager(business_id) or public.is_platform_superadmin()) with check (public.is_business_manager(business_id) or public.is_platform_superadmin())', r.tbl || '_manager_write', r.tbl);
  end loop;
end $$;

drop policy if exists waitlist_admin_write on public.waitlist;
drop policy if exists waitlist_staff_write on public.waitlist;
create policy waitlist_staff_write on public.waitlist for all to authenticated
using (public.is_business_staff(business_id) or public.is_platform_superadmin())
with check (public.is_business_staff(business_id) or public.is_platform_superadmin());

-- Clientes: recepción y gerencia ven todos; el barbero sólo los de sus citas.
drop policy if exists customers_tenant_select on public.customers;
drop policy if exists customers_admin_write on public.customers;
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated using (
  public.is_business_staff(business_id) or public.is_platform_superadmin()
  or exists (select 1 from public.appointments a
             where a.customer_id = customers.id and a.business_id = customers.business_id
               and public.is_own_barber(a.business_id, a.barber_id))
);
drop policy if exists customers_staff_write on public.customers;
create policy customers_staff_write on public.customers for all to authenticated
using (public.is_business_staff(business_id) or public.is_platform_superadmin())
with check (public.is_business_staff(business_id) or public.is_platform_superadmin());

-- Citas.
drop policy if exists appointments_tenant_select on public.appointments;
drop policy if exists appointments_admin_write on public.appointments;
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated using (
  public.is_business_staff(business_id) or public.is_platform_superadmin()
  or public.is_own_barber(business_id, barber_id)
);
drop policy if exists appointments_staff_insert on public.appointments;
create policy appointments_staff_insert on public.appointments for insert to authenticated
with check (public.is_business_staff(business_id) or public.is_platform_superadmin());
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
using (public.is_business_staff(business_id) or public.is_platform_superadmin() or public.is_own_barber(business_id, barber_id))
with check (public.is_business_staff(business_id) or public.is_platform_superadmin() or public.is_own_barber(business_id, barber_id));
drop policy if exists appointments_manager_delete on public.appointments;
create policy appointments_manager_delete on public.appointments for delete to authenticated
using (public.is_business_manager(business_id) or public.is_platform_superadmin());

-- El barbero sólo puede cambiar el estado de SUS citas a completada / no asistió.
create or replace function public.guard_appointment_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_platform_superadmin()
     and public.member_role_of(new.business_id) = 'barber' then
    if new.business_id is distinct from old.business_id or new.customer_id is distinct from old.customer_id
       or new.barber_id is distinct from old.barber_id or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at or new.notes is distinct from old.notes
       or new.payment_method is distinct from old.payment_method or new.public_code is distinct from old.public_code then
      raise exception 'Un barbero sólo puede cambiar el estado de la cita.';
    end if;
    if new.status not in ('completed','no_show') then
      raise exception 'Un barbero sólo puede marcar citas como completadas o ausentes.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_appointment_update on public.appointments;
create trigger trg_guard_appointment_update before update on public.appointments
for each row execute function public.guard_appointment_update();

-- ───────────────────────── Disponibilidad ─────────────────────────
-- Caduca (lazy) las reservas pendientes vencidas de un negocio.
create or replace function public.expire_stale_pending(p_business uuid)
returns void language sql security definer set search_path = '' as $$
  update public.appointments set status = 'cancelled'
  where business_id = p_business and status = 'pending' and expires_at is not null and expires_at < now();
$$;
revoke all on function public.expire_stale_pending(uuid) from public, anon, authenticated;

-- Fuente única de verdad: ¿puede este barbero atender en [p_start, p_end)?
create or replace function public.is_slot_valid(
  p_business uuid, p_barber uuid, p_start timestamptz, p_end timestamptz, p_exclude uuid default null
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz text; v_iv integer; ls timestamp; le timestamp; d date; ok boolean;
begin
  select timezone into v_tz from public.businesses where id = p_business;
  if v_tz is null then return false; end if;
  select coalesce(booking_interval_minutes, 15) into v_iv from public.business_settings where business_id = p_business;
  v_iv := coalesce(v_iv, 15);
  ls := p_start at time zone v_tz; le := p_end at time zone v_tz; d := ls::date;
  if le::date <> d or p_end <= p_start then return false; end if;
  if (extract(epoch from ls::time)::int / 60) % v_iv <> 0 then return false; end if;
  if exists (select 1 from public.business_holidays h where h.business_id = p_business and h.holiday_date = d) then return false; end if;
  if exists (select 1 from public.schedule_exceptions x where x.barber_id = p_barber and x.exception_date = d and x.is_day_off) then return false; end if;
  if exists (select 1 from public.schedule_exceptions x where x.barber_id = p_barber and x.exception_date = d) then
    ok := exists (select 1 from public.schedule_exceptions x where x.barber_id = p_barber and x.exception_date = d
                  and not x.is_day_off and x.start_time <= ls::time and x.end_time >= le::time);
  else
    ok := exists (select 1 from public.working_hours w where w.barber_id = p_barber
                  and w.weekday = extract(dow from d)::int and w.start_time <= ls::time and w.end_time >= le::time);
  end if;
  if not ok then return false; end if;
  if exists (select 1 from public.blocked_times bt where bt.barber_id = p_barber and bt.starts_at < p_end and bt.ends_at > p_start) then return false; end if;
  if exists (select 1 from public.appointments a where a.barber_id = p_barber and a.status in ('pending','confirmed')
             and a.starts_at < p_end and a.ends_at > p_start and (p_exclude is null or a.id <> p_exclude)
             and not (a.status = 'pending' and a.expires_at is not null and a.expires_at < now())) then return false; end if;
  return true;
end; $$;
revoke all on function public.is_slot_valid(uuid, uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;

-- ¿El barbero realiza el servicio? Sin asignaciones explícitas = realiza todos.
create or replace function public.barber_offers_service(p_barber uuid, p_service uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.barber_services bs where bs.barber_id = p_barber and bs.service_id = p_service)
      or not exists (select 1 from public.barber_services bs2 where bs2.barber_id = p_barber);
$$;
revoke all on function public.barber_offers_service(uuid, uuid) from public, anon, authenticated;

-- Límite de solicitudes por IP (cabecera de PostgREST) o por clave dada.
create or replace function public.check_rate(p_action text, p_max integer, p_minutes integer, p_extra text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor text; v_n integer;
begin
  begin
    v_actor := coalesce(split_part((current_setting('request.headers', true))::json ->> 'x-forwarded-for', ',', 1), 'unknown');
  exception when others then v_actor := 'unknown';
  end;
  v_actor := trim(v_actor) || '|' || p_extra;
  delete from public.booking_attempts where created_at < now() - interval '1 day';
  select count(*) into v_n from public.booking_attempts
   where actor = v_actor and action = p_action and created_at > now() - make_interval(mins => p_minutes);
  if v_n >= p_max then raise exception 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'; end if;
  insert into public.booking_attempts(actor, action) values (v_actor, p_action);
end; $$;
revoke all on function public.check_rate(text, integer, integer, text) from public, anon, authenticated;

-- Horarios disponibles de un día (barbero opcional = cualquiera).
create or replace function public.get_available_slots(p_slug text, p_service uuid, p_barber uuid, p_date date)
returns table(out_barber_id uuid, out_barber_name text, out_slot_start timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz public.businesses%rowtype; v_svc public.services%rowtype;
  v_iv integer; v_notice integer; v_today date;
begin
  select * into v_biz from public.businesses where slug = lower(p_slug) and status = 'active';
  if not found then return; end if;
  select * into v_svc from public.services where id = p_service and business_id = v_biz.id and active = true;
  if not found then return; end if;
  select coalesce(s.booking_interval_minutes, 15), coalesce(s.min_notice_minutes, 30) into v_iv, v_notice
    from public.business_settings s where s.business_id = v_biz.id;
  v_iv := coalesce(v_iv, 15); v_notice := coalesce(v_notice, 30);
  v_today := (now() at time zone v_biz.timezone)::date;
  if p_date is null or p_date < v_today or p_date > v_today + 90 then return; end if;

  return query
  with eligible as (
    select b.id as bid, b.display_name as bname from public.barbers b
    where b.business_id = v_biz.id and b.active = true and (p_barber is null or b.id = p_barber)
      and public.barber_offers_service(b.id, v_svc.id)
  ), windows as (
    select e.bid, e.bname, w.start_time as st, w.end_time as et
      from eligible e join public.working_hours w on w.barber_id = e.bid and w.weekday = extract(dow from p_date)::int
     where not exists (select 1 from public.schedule_exceptions x where x.barber_id = e.bid and x.exception_date = p_date)
    union all
    select e.bid, e.bname, x.start_time, x.end_time
      from eligible e join public.schedule_exceptions x on x.barber_id = e.bid and x.exception_date = p_date and not x.is_day_off
  ), cand as (
    select wi.bid, wi.bname,
           ((p_date + make_interval(mins => m.minute_of_day)) at time zone v_biz.timezone) as s
      from windows wi
      cross join lateral generate_series(
        (ceil((extract(epoch from wi.st) / 60)::numeric / v_iv) * v_iv)::int,
        (extract(epoch from wi.et) / 60)::int - v_svc.duration_minutes, v_iv) as m(minute_of_day)
  )
  select distinct c.bid, c.bname, c.s
    from cand c
   where c.s >= now() + make_interval(mins => v_notice)
     and public.is_slot_valid(v_biz.id, c.bid, c.s, c.s + make_interval(mins => v_svc.duration_minutes))
   order by c.s, c.bname;
end; $$;
revoke all on function public.get_available_slots(text, uuid, uuid, date) from public;
grant execute on function public.get_available_slots(text, uuid, uuid, date) to anon, authenticated;

-- ───────────────────────── Reserva pública ─────────────────────────
drop function if exists public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text);
create or replace function public.create_public_booking(
  p_slug text, p_service uuid, p_barber uuid, p_starts_at timestamptz,
  p_customer_name text, p_customer_phone text, p_customer_email text default null, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_biz public.businesses%rowtype; v_svc public.services%rowtype; v_set public.business_settings%rowtype;
  v_barber uuid; v_customer uuid; v_appt uuid; v_end timestamptz; v_digits text; v_code text; v_status public.appointment_status;
  v_alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; tries integer := 0;
begin
  v_digits := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  if length(trim(coalesce(p_customer_name, ''))) < 2 or length(p_customer_name) > 120
     or length(v_digits) < 7 or length(v_digits) > 15 then
    raise exception 'Revisa el nombre y el teléfono.';
  end if;
  if p_customer_email is not null and length(trim(p_customer_email)) > 0
     and p_customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El correo no es válido.';
  end if;
  perform public.check_rate('booking', 8, 10);

  select * into v_biz from public.businesses where slug = lower(p_slug) and status = 'active';
  if not found then raise exception 'Barbería no disponible.'; end if;
  select * into v_svc from public.services where id = p_service and business_id = v_biz.id and active = true;
  if not found then raise exception 'Servicio no disponible.'; end if;
  select * into v_set from public.business_settings where business_id = v_biz.id;
  if not found then v_set.min_notice_minutes := 30; v_set.pending_hold_hours := 12; v_set.auto_confirm := false; end if;
  perform public.expire_stale_pending(v_biz.id);

  if p_starts_at < now() + make_interval(mins => v_set.min_notice_minutes) or p_starts_at > now() + interval '90 days' then
    raise exception 'Esa fecha u hora no es válida para reservar.';
  end if;
  v_end := p_starts_at + make_interval(mins => v_svc.duration_minutes);

  if p_barber is null then
    select b.id into v_barber from public.barbers b
     where b.business_id = v_biz.id and b.active = true and public.barber_offers_service(b.id, v_svc.id)
       and public.is_slot_valid(v_biz.id, b.id, p_starts_at, v_end)
     order by random() limit 1;
  else
    select b.id into v_barber from public.barbers b
     where b.id = p_barber and b.business_id = v_biz.id and b.active = true
       and public.barber_offers_service(b.id, v_svc.id)
       and public.is_slot_valid(v_biz.id, b.id, p_starts_at, v_end);
  end if;
  if v_barber is null then raise exception 'Ese horario no está disponible. Elige otro.'; end if;

  select id into v_customer from public.customers where business_id = v_biz.id and phone_digits = v_digits order by created_at limit 1;
  if v_customer is null then
    insert into public.customers(business_id, full_name, phone, email)
    values (v_biz.id, trim(p_customer_name), v_digits, nullif(trim(coalesce(p_customer_email, '')), ''))
    on conflict do nothing returning id into v_customer;
    if v_customer is null then
      select id into v_customer from public.customers where business_id = v_biz.id and phone_digits = v_digits order by created_at limit 1;
    end if;
  end if;
  if (select count(*) from public.appointments a where a.customer_id = v_customer and a.status in ('pending','confirmed') and a.starts_at > now()) >= 3 then
    raise exception 'Ya tienes 3 reservas activas. Cancela o espera a que se completen.';
  end if;

  v_status := case when v_set.auto_confirm then 'confirmed'::public.appointment_status else 'pending'::public.appointment_status end;
  loop
    tries := tries + 1;
    v_code := '';
    for i in 1..8 loop v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1); end loop;
    begin
      insert into public.appointments(business_id, customer_id, barber_id, status, starts_at, ends_at, expires_at, notes, payment_method, public_code)
      values (v_biz.id, v_customer, v_barber, v_status, p_starts_at, v_end,
              case when v_status = 'pending' then now() + make_interval(hours => v_set.pending_hold_hours) end,
              left(coalesce(p_notes, ''), 500), 'onsite', v_code)
      returning id into v_appt;
      exit;
    exception when unique_violation then
      if tries >= 5 then raise exception 'No fue posible generar el código. Inténtalo de nuevo.'; end if;
    end;
  end loop;
  insert into public.appointment_items(appointment_id, business_id, service_id, service_name, price, duration_minutes)
  values (v_appt, v_biz.id, v_svc.id, v_svc.name, v_svc.price, v_svc.duration_minutes);
  insert into public.appointment_events(appointment_id, new_status, note)
  values (v_appt, v_status, 'Reserva creada desde la página pública');
  return jsonb_build_object('code', v_code, 'status', v_status, 'starts_at', p_starts_at);
exception when exclusion_violation then
  raise exception 'Ese horario acaba de ocuparse. Elige otro.';
end; $$;
revoke all on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- ───────────────────────── Consultar / cancelar / reprogramar con código + teléfono ─────────────────────────
create or replace function public.get_booking(p_code text, p_phone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  perform public.check_rate('lookup', 15, 10);
  select a.id, a.status, a.starts_at, a.ends_at, a.barber_id, b.display_name as barber_name,
         bz.name as business_name, bz.slug, bz.timezone, bs.cancellation_hours,
         ai.service_id, ai.service_name, ai.price
    into r
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    join public.businesses bz on bz.id = a.business_id
    join public.barbers b on b.id = a.barber_id
    left join public.business_settings bs on bs.business_id = a.business_id
    left join lateral (select * from public.appointment_items i where i.appointment_id = a.id limit 1) ai on true
   where a.public_code = upper(trim(p_code)) and c.phone_digits = v_digits;
  if not found then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'status', r.status, 'starts_at', r.starts_at, 'ends_at', r.ends_at,
    'barber_id', r.barber_id, 'barber_name', r.barber_name, 'business_name', r.business_name, 'slug', r.slug,
    'timezone', r.timezone, 'service_id', r.service_id, 'service_name', r.service_name, 'price', r.price,
    'can_change', r.status in ('pending','confirmed')
                  and r.starts_at > now() + make_interval(hours => coalesce(r.cancellation_hours, 2)),
    'cancellation_hours', coalesce(r.cancellation_hours, 2));
end; $$;
revoke all on function public.get_booking(text, text) from public;
grant execute on function public.get_booking(text, text) to anon, authenticated;

create or replace function public.cancel_booking(p_code text, p_phone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  perform public.check_rate('cancel', 10, 10);
  select a.id, a.status, a.starts_at, coalesce(bs.cancellation_hours, 2) as hrs into r
    from public.appointments a join public.customers c on c.id = a.customer_id
    left join public.business_settings bs on bs.business_id = a.business_id
   where a.public_code = upper(trim(p_code)) and c.phone_digits = v_digits for update of a;
  if not found then return jsonb_build_object('ok', false, 'message', 'No encontramos una reserva con esos datos.'); end if;
  if r.status not in ('pending','confirmed') then raise exception 'Esta reserva ya no se puede cancelar.'; end if;
  if r.starts_at <= now() + make_interval(hours => r.hrs) then
    raise exception 'Sólo puedes cancelar con al menos % hora(s) de anticipación. Contacta a la barbería.', r.hrs;
  end if;
  update public.appointments set status = 'cancelled' where id = r.id;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.cancel_booking(text, text) from public;
grant execute on function public.cancel_booking(text, text) to anon, authenticated;

create or replace function public.reschedule_booking(p_code text, p_phone text, p_new_start timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
        v_dur integer; v_end timestamptz; v_notice integer;
begin
  perform public.check_rate('reschedule', 10, 10);
  select a.id, a.status, a.starts_at, a.barber_id, a.business_id, coalesce(bs.cancellation_hours, 2) as hrs,
         coalesce(bs.min_notice_minutes, 30) as notice into r
    from public.appointments a join public.customers c on c.id = a.customer_id
    left join public.business_settings bs on bs.business_id = a.business_id
   where a.public_code = upper(trim(p_code)) and c.phone_digits = v_digits for update of a;
  if not found then return jsonb_build_object('ok', false, 'message', 'No encontramos una reserva con esos datos.'); end if;
  if r.status not in ('pending','confirmed') then raise exception 'Esta reserva ya no se puede reprogramar.'; end if;
  perform public.expire_stale_pending(r.business_id);
  if r.starts_at <= now() + make_interval(hours => r.hrs) then
    raise exception 'Sólo puedes reprogramar con al menos % hora(s) de anticipación.', r.hrs;
  end if;
  select coalesce(sum(duration_minutes), 0) into v_dur from public.appointment_items where appointment_id = r.id;
  if v_dur <= 0 then raise exception 'La reserva no tiene servicios asociados.'; end if;
  v_end := p_new_start + make_interval(mins => v_dur);
  if p_new_start < now() + make_interval(mins => r.notice) or p_new_start > now() + interval '90 days'
     or not public.is_slot_valid(r.business_id, r.barber_id, p_new_start, v_end, r.id) then
    raise exception 'Ese horario no está disponible. Elige otro.';
  end if;
  update public.appointments set starts_at = p_new_start, ends_at = v_end where id = r.id;
  insert into public.appointment_events(appointment_id, previous_status, new_status, note)
  values (r.id, r.status, r.status, 'Reprogramada por el cliente');
  return jsonb_build_object('ok', true);
exception when exclusion_violation then
  raise exception 'Ese horario acaba de ocuparse. Elige otro.';
end; $$;
revoke all on function public.reschedule_booking(text, text, timestamptz) from public;
grant execute on function public.reschedule_booking(text, text, timestamptz) to anon, authenticated;

-- ───────────────────────── Gestión atómica de horarios y servicios por barbero ─────────────────────────
-- p_hours: [{"weekday":1,"start":"09:00","end":"13:00"}, ...]
create or replace function public.set_barber_hours(p_barber uuid, p_hours jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_biz uuid; h jsonb;
begin
  select business_id into v_biz from public.barbers where id = p_barber;
  if v_biz is null or not (public.is_business_manager(v_biz) or public.is_platform_superadmin()) then
    raise exception 'No autorizado.';
  end if;
  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 28 then raise exception 'Horario inválido.'; end if;
  delete from public.working_hours where barber_id = p_barber;
  for h in select * from jsonb_array_elements(p_hours) loop
    insert into public.working_hours(business_id, barber_id, weekday, start_time, end_time)
    values (v_biz, p_barber, (h ->> 'weekday')::smallint, (h ->> 'start')::time, (h ->> 'end')::time);
  end loop;
end; $$;
revoke all on function public.set_barber_hours(uuid, jsonb) from public, anon;
grant execute on function public.set_barber_hours(uuid, jsonb) to authenticated;

create or replace function public.set_barber_services(p_barber uuid, p_services uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_biz uuid;
begin
  select business_id into v_biz from public.barbers where id = p_barber;
  if v_biz is null or not (public.is_business_manager(v_biz) or public.is_platform_superadmin()) then
    raise exception 'No autorizado.';
  end if;
  delete from public.barber_services where barber_id = p_barber;
  insert into public.barber_services(business_id, barber_id, service_id)
  select v_biz, p_barber, s.id from public.services s where s.business_id = v_biz and s.id = any(coalesce(p_services, '{}'));
end; $$;
revoke all on function public.set_barber_services(uuid, uuid[]) from public, anon;
grant execute on function public.set_barber_services(uuid, uuid[]) to authenticated;

-- Ajustes del negocio: lectura para gerencia/recepción; escritura sólo owner/admin (política existente).
