-- BarberPro 007: corregir autorización de subidas en Storage.
-- La carpeta raíz del objeto debe ser el UUID del negocio:
-- <business_id>/branding/logo_url-<timestamp>.jpg

drop policy if exists barberpro_media_public_read on storage.objects;
create policy barberpro_media_public_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'barberpro-media');

drop policy if exists barberpro_media_admin_insert on storage.objects;
create policy barberpro_media_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'barberpro-media'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

drop policy if exists barberpro_media_admin_update on storage.objects;
create policy barberpro_media_admin_update
on storage.objects for update to authenticated
using (
  bucket_id = 'barberpro-media'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
)
with check (
  bucket_id = 'barberpro-media'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

drop policy if exists barberpro_media_admin_delete on storage.objects;
create policy barberpro_media_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'barberpro-media'
  and (
    public.is_platform_superadmin()
    or public.is_business_admin(
      case
        when split_part(name, '/', 1) ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
);

grant execute on function public.is_business_admin(uuid) to authenticated;
grant execute on function public.is_platform_superadmin() to authenticated;
