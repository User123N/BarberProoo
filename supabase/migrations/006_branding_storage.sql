-- BarberPro 006: assets de marca y almacenamiento público seguro.
-- Ejecutar una sola vez después de 005 en el proyecto Supabase de pruebas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barberpro-media', 'barberpro-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists barberpro_media_public_read on storage.objects;
create policy barberpro_media_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'barberpro-media');

drop policy if exists barberpro_media_admin_insert on storage.objects;
create policy barberpro_media_admin_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'barberpro-media'
  and exists (select 1 from public.businesses b where b.id::text = split_part(name, '/', 1)
    and (public.is_business_admin(b.id) or public.is_platform_superadmin()))
);

drop policy if exists barberpro_media_admin_update on storage.objects;
create policy barberpro_media_admin_update on storage.objects
for update to authenticated using (
  bucket_id = 'barberpro-media'
  and exists (select 1 from public.businesses b where b.id::text = split_part(name, '/', 1)
    and (public.is_business_admin(b.id) or public.is_platform_superadmin()))
) with check (
  bucket_id = 'barberpro-media'
  and exists (select 1 from public.businesses b where b.id::text = split_part(name, '/', 1)
    and (public.is_business_admin(b.id) or public.is_platform_superadmin()))
);

drop policy if exists barberpro_media_admin_delete on storage.objects;
create policy barberpro_media_admin_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'barberpro-media'
  and exists (select 1 from public.businesses b where b.id::text = split_part(name, '/', 1)
    and (public.is_business_admin(b.id) or public.is_platform_superadmin()))
);
