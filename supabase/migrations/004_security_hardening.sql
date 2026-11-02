-- BarberPro 004: endurecimiento de seguridad (Fase 1). Idempotente.
-- NO ejecutada contra un Postgres real: probar primero en un proyecto Supabase de pruebas.
-- Nota: auth.uid() es NULL en el SQL Editor y con service_role; esas rutas (administrativas) quedan permitidas.

-- 1) Funciones auxiliares: sólo usuarios autenticados pueden invocarlas por RPC.
revoke all on function public.is_business_member(uuid) from public, anon;
revoke all on function public.is_business_admin(uuid) from public, anon;
revoke all on function public.is_platform_superadmin() from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_admin(uuid) to authenticated;
grant execute on function public.is_platform_superadmin() to authenticated;

-- 2) updated_at automático (antes lo enviaba el navegador).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated before update on public.appointments
for each row execute function public.set_updated_at();
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.business_settings;
create trigger trg_settings_updated before update on public.business_settings
for each row execute function public.set_updated_at();

-- 3) Un propietario/admin NO puede reactivar su negocio suspendido ni cambiar su slug.
create or replace function public.guard_business_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_platform_superadmin() then
    if new.status is distinct from old.status then
      raise exception 'Sólo la plataforma puede cambiar el estado del negocio.';
    end if;
    if new.slug is distinct from old.slug then
      raise exception 'Sólo la plataforma puede cambiar la dirección pública (slug).';
    end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists trg_guard_business_update on public.businesses;
create trigger trg_guard_business_update before update on public.businesses
for each row execute function public.guard_business_update();

-- 4) Anti-escalada en membresías: sólo un owner puede crear/modificar/quitar owners.
create or replace function public.guard_member_change()
returns trigger language plpgsql set search_path = '' as $$
declare v_actor public.member_role;
begin
  if (select auth.uid()) is null or public.is_platform_superadmin() then
    return coalesce(new, old);
  end if;
  select bm.role into v_actor from public.business_members bm
   where bm.business_id = coalesce(new.business_id, old.business_id)
     and bm.user_id = (select auth.uid()) and bm.active = true;
  if tg_op in ('INSERT','UPDATE') and new.role = 'owner' and v_actor is distinct from 'owner' then
    raise exception 'Sólo un propietario puede asignar el rol de propietario.';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' and v_actor is distinct from 'owner' then
    raise exception 'Sólo un propietario puede modificar a otro propietario.';
  end if;
  if tg_op = 'UPDATE' and (new.business_id <> old.business_id or new.user_id <> old.user_id) then
    raise exception 'No se puede reasignar una membresía a otro negocio o usuario.';
  end if;
  return coalesce(new, old);
end; $$;
drop trigger if exists trg_guard_member_change on public.business_members;
create trigger trg_guard_member_change before insert or update or delete on public.business_members
for each row execute function public.guard_member_change();

-- 5) platform_role inmodificable desde la API (antes bloqueaba también a los superadmin).
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.platform_role is distinct from old.platform_role and (select auth.uid()) is not null then
    raise exception 'platform_role sólo se cambia desde SQL administrativo.';
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profile_update on public.profiles;
create trigger trg_guard_profile_update before update on public.profiles
for each row execute function public.guard_profile_update();
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 6) Ítems de cita: lectura para miembros, escritura sólo admin. Eventos: sólo lectura (los escribe un trigger).
drop policy if exists appointment_items_tenant on public.appointment_items;
drop policy if exists appointment_items_member_select on public.appointment_items;
drop policy if exists appointment_items_admin_write on public.appointment_items;
create policy appointment_items_member_select on public.appointment_items
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy appointment_items_admin_write on public.appointment_items
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

drop policy if exists appointment_events_tenant on public.appointment_events;
drop policy if exists appointment_events_select on public.appointment_events;
create policy appointment_events_select on public.appointment_events
for select to authenticated using (exists (
  select 1 from public.appointments a
  where a.id = appointment_id and (public.is_business_member(a.business_id) or public.is_platform_superadmin())
));

-- 7) Historial automático de cambios de estado (quién y cuándo).
create or replace function public.log_appointment_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.appointment_events(appointment_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end; $$;
drop trigger if exists trg_log_appointment_status on public.appointments;
create trigger trg_log_appointment_status after update of status on public.appointments
for each row execute function public.log_appointment_status();

-- 8) Auditoría de altas/cambios en tablas sensibles (los DELETE se auditan en una fase posterior).
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb := to_jsonb(new); v_id uuid := (to_jsonb(new) ->> 'id')::uuid; v_business uuid;
begin
  v_business := case when tg_table_name = 'businesses' then v_id else (v_row ->> 'business_id')::uuid end;
  insert into public.audit_logs(business_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_business, (select auth.uid()), lower(tg_op), tg_table_name, v_id, '{}'::jsonb);
  return new;
end; $$;
do $$
declare t text;
begin
  foreach t in array array['businesses','business_members','services','barbers'] loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$I', t);
    execute format('create trigger trg_audit_%1$s after insert or update on public.%1$I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- 9) Fidelización: las cuentas y movimientos de puntos pasan a sólo lectura desde el navegador.
drop policy if exists loyalty_admin_all on public.loyalty_accounts;
drop policy if exists loyalty_admin_select on public.loyalty_accounts;
create policy loyalty_admin_select on public.loyalty_accounts
for select to authenticated using (public.is_business_admin(business_id) or public.is_platform_superadmin());
drop policy if exists loyalty_transactions_admin_all on public.loyalty_transactions;
drop policy if exists loyalty_transactions_admin_select on public.loyalty_transactions;
create policy loyalty_transactions_admin_select on public.loyalty_transactions
for select to authenticated using (exists (
  select 1 from public.loyalty_accounts la
  where la.id = account_id and (public.is_business_admin(la.business_id) or public.is_platform_superadmin())
));

-- 10) Lectura pública mínima: el rol anon sólo ve columnas del catálogo público (sin email, profile_id, etc.).
revoke select on public.businesses from anon;
grant select (id, name, slug, description, logo_url, cover_url, phone, address, city, timezone, status) on public.businesses to anon;
revoke select on public.barbers from anon;
grant select (id, business_id, display_name, bio, photo_url, active) on public.barbers to anon;
revoke select on public.services from anon;
grant select (id, business_id, category_id, name, description, price, duration_minutes, active) on public.services to anon;

-- La galería pública sólo de negocios activos.
drop policy if exists gallery_public_read on public.gallery_images;
create policy gallery_public_read on public.gallery_images
for select to anon, authenticated using (active = true and exists (
  select 1 from public.businesses b where b.id = business_id and b.status = 'active'
));

-- 11) Slugs reservados (NOT VALID: no rompe filas existentes, sí valida altas/ediciones nuevas).
alter table public.businesses drop constraint if exists businesses_slug_not_reserved;
alter table public.businesses add constraint businesses_slug_not_reserved check (slug not in (
  'login','dashboard','setup','superadmin','admin','client','api','app','auth','_next',
  'registro','signup','precios','pricing','ayuda','help','soporte','support','terminos','privacidad','www'
)) not valid;
