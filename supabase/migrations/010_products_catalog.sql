-- BarberPro 010: catálogo de productos por barbería.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text,
  category text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  image_url text,
  stock integer check (stock is null or stock >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_business_active_position
  on public.products(business_id, active, position, created_at desc);
alter table public.products enable row level security;
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active = true);
drop policy if exists products_members_read on public.products;
create policy products_members_read on public.products
  for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all to authenticated
  using (public.is_business_admin(business_id) or public.is_platform_superadmin())
  with check (public.is_business_admin(business_id) or public.is_platform_superadmin());
