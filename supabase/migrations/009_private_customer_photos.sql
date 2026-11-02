-- BarberPro 009: almacenamiento privado para fotos de clientes.
-- Las fotos de clientes sólo son visibles para personal autorizado de su barbería.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barberpro-private', 'barberpro-private', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists barberpro_private_admin_select on storage.objects;
create policy barberpro_private_admin_select on storage.objects
for select to authenticated using (
  bucket_id = 'barberpro-private'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

drop policy if exists barberpro_private_admin_insert on storage.objects;
create policy barberpro_private_admin_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'barberpro-private'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

drop policy if exists barberpro_private_admin_update on storage.objects;
create policy barberpro_private_admin_update on storage.objects
for update to authenticated using (
  bucket_id = 'barberpro-private'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
) with check (
  bucket_id = 'barberpro-private'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

drop policy if exists barberpro_private_admin_delete on storage.objects;
create policy barberpro_private_admin_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'barberpro-private'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);
