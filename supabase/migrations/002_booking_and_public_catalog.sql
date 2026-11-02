-- BarberPro Hito 2: catálogo público y reservas seguras.
-- Ejecutar DESPUÉS de 001_core.sql. No expone datos privados de clientes.
create unique index if not exists customers_business_phone_unique on public.customers(business_id, phone);

create policy businesses_public_active on public.businesses
for select to anon, authenticated using (status = 'active');
create policy barbers_public_active on public.barbers
for select to anon, authenticated using (active = true and exists (
  select 1 from public.businesses b where b.id = business_id and b.status = 'active'
));
create policy services_public_active on public.services
for select to anon, authenticated using (active = true and exists (
  select 1 from public.businesses b where b.id = business_id and b.status = 'active'
));
create policy settings_public_read on public.business_settings
for select to anon, authenticated using (exists (
  select 1 from public.businesses b where b.id = business_id and b.status = 'active'
));

create or replace function public.create_public_booking(
  p_slug text, p_service uuid, p_barber uuid, p_starts_at timestamptz,
  p_customer_name text, p_customer_phone text, p_customer_email text default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_business public.businesses%rowtype;
  v_service public.services%rowtype;
  v_barber public.barbers%rowtype;
  v_customer uuid;
  v_appointment uuid;
  v_end timestamptz;
  v_duration integer;
begin
  if length(trim(coalesce(p_customer_name,''))) < 2 or length(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g')) < 7 then
    raise exception 'Revisa el nombre y el teléfono.';
  end if;
  if p_starts_at < now() or p_starts_at > now() + interval '90 days' then
    raise exception 'La fecha de reserva no es válida.';
  end if;
  select * into v_business from public.businesses where slug = lower(p_slug) and status = 'active';
  if not found then raise exception 'Barbería no disponible.'; end if;
  select * into v_service from public.services where id=p_service and business_id=v_business.id and active=true;
  if not found then raise exception 'Servicio no disponible.'; end if;
  select * into v_barber from public.barbers where id=p_barber and business_id=v_business.id and active=true;
  if not found then raise exception 'Barbero no disponible.'; end if;
  v_duration := v_service.duration_minutes;
  v_end := p_starts_at + make_interval(mins => v_duration);
  insert into public.customers(business_id,full_name,phone,email)
  values(v_business.id,trim(p_customer_name),trim(p_customer_phone),nullif(trim(coalesce(p_customer_email,'')),''))
  on conflict do nothing returning id into v_customer;
  if v_customer is null then
    select id into v_customer from public.customers where business_id=v_business.id and phone=trim(p_customer_phone) order by created_at limit 1;
    if v_customer is null then
      insert into public.customers(business_id,full_name,phone,email) values(v_business.id,trim(p_customer_name),trim(p_customer_phone),nullif(trim(coalesce(p_customer_email,'')),'')) returning id into v_customer;
    end if;
  end if;
  insert into public.appointments(business_id,customer_id,barber_id,status,starts_at,ends_at,notes,payment_method)
  values(v_business.id,v_customer,v_barber.id,'pending',p_starts_at,v_end,left(coalesce(p_notes,''),500),'onsite') returning id into v_appointment;
  insert into public.appointment_items(appointment_id,business_id,service_id,service_name,price,duration_minutes)
  values(v_appointment,v_business.id,v_service.id,v_service.name,v_service.price,v_duration);
  insert into public.appointment_events(appointment_id,new_status,note)
  values(v_appointment,'pending','Reserva creada desde la página pública');
  return v_appointment;
exception when exclusion_violation then
  raise exception 'Ese horario acaba de ocuparse. Elige otra hora.';
end;
$$;
revoke all on function public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text) from public;
grant execute on function public.create_public_booking(text,uuid,uuid,timestamptz,text,text,text,text) to anon, authenticated;
