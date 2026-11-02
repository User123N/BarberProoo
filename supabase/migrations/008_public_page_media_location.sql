-- BarberPro 008: medios del catálogo, galería, ubicación y fotos opcionales.
-- Ejecutar una sola vez después de 007 en Supabase SQL Editor.

alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.services
  add column if not exists image_url text;

alter table public.customers
  add column if not exists photo_url text;

alter table public.gallery_images
  add column if not exists media_url text,
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image','video'));

update public.gallery_images
set media_url = image_url
where media_url is null;

-- Se conservan los objetos actuales. El bucket admite imágenes y videos cortos.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/avif',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'barberpro-media';

create index if not exists idx_gallery_business_active_position
  on public.gallery_images(business_id, active, position);
