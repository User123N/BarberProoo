-- Ejecutar una sola vez desde el SQL Editor de Supabase (como administrador del proyecto).
-- Sustituye los tres valores. user_id se obtiene en Authentication > Users.
-- Requiere 001–005 aplicadas (business_settings se crea aquí; los horarios se configuran desde el panel).
do $$
declare
  v_user uuid := 'REEMPLAZA-CON-UUID-DEL-USUARIO'::uuid;
  v_name text := 'Mi Barbería';
  v_slug text := 'mi-barberia';
  v_business uuid;
begin
  if not exists (select 1 from auth.users where id = v_user) then raise exception 'No existe ese usuario'; end if;
  insert into public.profiles(id) values (v_user) on conflict (id) do nothing;  -- no sobrescribe el nombre de la persona
  insert into public.businesses(name, slug, status) values (v_name, v_slug, 'active') returning id into v_business;
  insert into public.business_members(business_id, user_id, role, active) values (v_business, v_user, 'owner', true);
  insert into public.business_settings(business_id) values (v_business);
end $$;
