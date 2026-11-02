-- Convierte a un usuario existente en superadmin de la plataforma.
-- Sólo desde el SQL Editor (la API bloquea cambios de platform_role). Reemplaza el UUID.
update public.profiles set platform_role = 'superadmin' where id = 'REEMPLAZA-CON-UUID-DEL-USUARIO'::uuid;
-- Verifica: select id, platform_role from public.profiles where platform_role = 'superadmin';
