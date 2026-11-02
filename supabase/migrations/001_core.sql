-- BarberPro: core multi-tenant foundation
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.platform_role as enum ('user', 'superadmin');
create type public.member_role as enum ('owner', 'admin', 'barber');
create type public.business_status as enum ('pending', 'active', 'suspended');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  platform_role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  email text,
  address text,
  city text,
  timezone text not null default 'America/Bogota',
  status public.business_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+([\-][a-z0-9]+)*$')
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id),
  unique (id, business_id)
);

create table public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  advance_payment_enabled boolean not null default false,
  advance_payment_type text not null default 'fixed' check (advance_payment_type in ('fixed','percentage')),
  advance_payment_value numeric(12,2) not null default 0 check (advance_payment_value >= 0),
  cancellation_hours integer not null default 2 check (cancellation_hours >= 0),
  booking_interval_minutes integer not null default 15 check (booking_interval_minutes > 0),
  allow_guest_booking boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.business_domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null unique,
  verified boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  bio text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  unique (id, business_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (category_id, business_id) references public.service_categories(id, business_id)
);

create table public.barber_services (
  business_id uuid not null,
  barber_id uuid not null,
  service_id uuid not null,
  primary key (barber_id, service_id),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade,
  foreign key (service_id, business_id) references public.services(id, business_id) on delete cascade
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  barber_id uuid not null,
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz,
  notes text,
  payment_method text check (payment_method in ('online','onsite') or payment_method is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (customer_id, business_id) references public.customers(id, business_id),
  foreign key (barber_id, business_id) references public.barbers(id, business_id),
  unique (id, business_id)
);

alter table public.appointments
add constraint no_overlapping_barber_appointments
exclude using gist (
  barber_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status in ('pending','confirmed'));

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  business_id uuid not null,
  service_id uuid,
  service_name text not null,
  price numeric(12,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  foreign key (appointment_id, business_id) references public.appointments(id, business_id) on delete cascade,
  foreign key (service_id, business_id) references public.services(id, business_id)
);

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  previous_status public.appointment_status,
  new_status public.appointment_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'COP',
  provider text,
  provider_reference text,
  idempotency_key text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (appointment_id, business_id) references public.appointments(id, business_id),
  unique (provider, provider_reference),
  unique (provider, idempotency_key)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'COP',
  billing_period text not null check (billing_period in ('monthly','yearly')),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('trialing','active','past_due','cancelled','expired')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'COP',
  status text not null check (status in ('draft','open','paid','void','overdue')),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade
);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  exception_date date not null,
  start_time time,
  end_time time,
  is_day_off boolean not null default false,
  reason text,
  check (
    (is_day_off and start_time is null and end_time is null)
    or
    (not is_day_off and start_time is not null and end_time > start_time)
  ),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade
);

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade
);

create table public.business_holidays (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  holiday_date date not null,
  description text,
  unique (business_id, holiday_date)
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  service_id uuid,
  preferred_barber_id uuid,
  preferred_date date,
  preferred_start time,
  preferred_end time,
  status text not null default 'waiting' check (status in ('waiting','notified','booked','cancelled','expired')),
  created_at timestamptz not null default now(),
  foreign key (customer_id, business_id) references public.customers(id, business_id) on delete cascade,
  foreign key (service_id, business_id) references public.services(id, business_id),
  foreign key (preferred_barber_id, business_id) references public.barbers(id, business_id)
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  points_balance integer not null default 0 check (points_balance >= 0),
  unique (business_id, customer_id),
  foreign key (customer_id, business_id) references public.customers(id, business_id) on delete cascade
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  points integer not null check (points <> 0),
  transaction_type text not null check (transaction_type in ('earned','redeemed','adjusted','expired')),
  description text,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  points_required integer not null check (points_required > 0),
  active boolean not null default true
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  customer_id uuid not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','redeemed')),
  created_at timestamptz not null default now(),
  foreign key (customer_id, business_id) references public.customers(id, business_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  appointment_id uuid not null unique references public.appointments(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status text not null default 'published' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now(),
  foreign key (customer_id, business_id) references public.customers(id, business_id)
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text not null,
  description text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null check (channel in ('whatsapp','email','sms','in_app')),
  template_key text,
  destination text not null,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
  provider_reference text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  template_key text not null,
  channel text not null check (channel in ('whatsapp','email','sms')),
  content text not null,
  active boolean not null default true
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','email','sms')),
  enabled boolean not null default true,
  unique (customer_id, channel)
);

create table public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null,
  transaction_type text not null check (transaction_type in ('income','refund','expense')),
  description text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_members_user on public.business_members(user_id, active);
create index idx_barbers_business on public.barbers(business_id, active);
create index idx_services_business on public.services(business_id, active);
create index idx_customers_business_phone on public.customers(business_id, phone);
create index idx_appointments_business_date on public.appointments(business_id, starts_at);
create index idx_appointments_barber_date on public.appointments(barber_id, starts_at);
create index idx_appointments_customer_date on public.appointments(customer_id, starts_at desc);
create index idx_notifications_queue on public.notifications(status, scheduled_at);
create index idx_audit_business_date on public.audit_logs(business_id, created_at desc);

-- Create profile on signup. Role is always user; clients cannot self-assign superadmin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Membership checks. Security-definer functions avoid recursive RLS evaluation.
create or replace function public.is_business_member(target_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = (select auth.uid())
      and bm.active = true
  );
$$;

create or replace function public.is_business_admin(target_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = (select auth.uid())
      and bm.active = true
      and bm.role in ('owner','admin')
  );
$$;

create or replace function public.is_platform_superadmin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.platform_role = 'superadmin'
  );
$$;

-- Enable RLS for all tenant and sensitive tables.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','businesses','business_members','business_settings','business_domains',
    'barbers','service_categories','services','barber_services','customers',
    'appointments','appointment_items','appointment_events','payments','payment_events',
    'plans','subscriptions','invoices','working_hours','schedule_exceptions',
    'blocked_times','business_holidays','waitlist','loyalty_accounts',
    'loyalty_transactions','rewards','reward_redemptions','reviews','gallery_images',
    'notifications','notification_templates','notification_preferences',
    'business_transactions','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Profiles: users can read/update only their own basic profile.
create policy profiles_select_own on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()) and platform_role = 'user');

-- Memberships: members can see their own membership; admins can manage memberships.
create policy memberships_select on public.business_members
for select to authenticated
using (user_id = (select auth.uid()) or public.is_business_admin(business_id) or public.is_platform_superadmin());
create policy memberships_admin_manage on public.business_members
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

-- Business data: members see their tenant; admins update it.
create policy businesses_select on public.businesses
for select to authenticated
using (public.is_business_member(id) or public.is_platform_superadmin());
create policy businesses_update on public.businesses
for update to authenticated
using (public.is_business_admin(id) or public.is_platform_superadmin())
with check (public.is_business_admin(id) or public.is_platform_superadmin());

-- Settings and domains: admins only.
create policy settings_admin_all on public.business_settings
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());
create policy domains_admin_all on public.business_domains
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

-- Catalog: members can read; admins can write.
create policy barbers_select on public.barbers
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy barbers_admin_write on public.barbers
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy categories_select on public.service_categories
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy categories_admin_write on public.service_categories
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy services_select on public.services
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy services_admin_write on public.services
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy barber_services_select on public.barber_services
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy barber_services_admin_write on public.barber_services
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

-- Customer and appointment records are private to their tenant.
create policy customers_tenant_select on public.customers
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy customers_admin_write on public.customers
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy appointments_tenant_select on public.appointments
for select to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy appointments_admin_write on public.appointments
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy appointment_items_tenant on public.appointment_items
for all to authenticated
using (public.is_business_member(business_id) or public.is_platform_superadmin())
with check (public.is_business_member(business_id) or public.is_platform_superadmin());

create policy appointment_events_tenant on public.appointment_events
for all to authenticated
using (exists (
  select 1 from public.appointments a
  where a.id = appointment_id and public.is_business_member(a.business_id)
))
with check (exists (
  select 1 from public.appointments a
  where a.id = appointment_id and public.is_business_member(a.business_id)
));

create policy payments_admin_select on public.payments
for select to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin());
create policy payment_events_admin_select on public.payment_events
for select to authenticated
using (exists (
  select 1 from public.payments p
  where p.id = payment_id and (public.is_business_admin(p.business_id) or public.is_platform_superadmin())
));

-- Operational tables: members read, admins manage.
create policy working_hours_member_read on public.working_hours
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy working_hours_admin_write on public.working_hours
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy schedule_exceptions_member_read on public.schedule_exceptions
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy schedule_exceptions_admin_write on public.schedule_exceptions
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy blocked_times_member_read on public.blocked_times
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy blocked_times_admin_write on public.blocked_times
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy holidays_member_read on public.business_holidays
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy holidays_admin_write on public.business_holidays
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy waitlist_member_read on public.waitlist
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy waitlist_admin_write on public.waitlist
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy loyalty_admin_all on public.loyalty_accounts
for all to authenticated using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy loyalty_transactions_admin_all on public.loyalty_transactions
for all to authenticated
using (exists (
  select 1 from public.loyalty_accounts la
  where la.id = account_id and (public.is_business_admin(la.business_id) or public.is_platform_superadmin())
))
with check (exists (
  select 1 from public.loyalty_accounts la
  where la.id = account_id and (public.is_business_admin(la.business_id) or public.is_platform_superadmin())
));

create policy rewards_member_read on public.rewards
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy rewards_admin_write on public.rewards
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy redemptions_admin_all on public.reward_redemptions
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy reviews_member_read on public.reviews
for select to authenticated using (public.is_business_member(business_id) or public.is_platform_superadmin());
create policy reviews_admin_write on public.reviews
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy gallery_public_read on public.gallery_images
for select to anon, authenticated using (active = true);
create policy gallery_admin_write on public.gallery_images
for all to authenticated
using (public.is_business_admin(business_id) or public.is_platform_superadmin())
with check (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy notifications_admin_read on public.notifications
for select to authenticated
using (business_id is not null and (public.is_business_admin(business_id) or public.is_platform_superadmin()));
create policy notification_templates_admin on public.notification_templates
for all to authenticated
using (business_id is not null and (public.is_business_admin(business_id) or public.is_platform_superadmin()))
with check (business_id is not null and (public.is_business_admin(business_id) or public.is_platform_superadmin()));

create policy notification_preferences_customer on public.notification_preferences
for all to authenticated
using (exists (
  select 1 from public.customers c
  where c.id = customer_id and c.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.customers c
  where c.id = customer_id and c.user_id = (select auth.uid())
));

create policy plans_public_read on public.plans
for select to anon, authenticated using (active = true);
create policy subscriptions_admin_read on public.subscriptions
for select to authenticated using (public.is_business_admin(business_id) or public.is_platform_superadmin());
create policy invoices_admin_read on public.invoices
for select to authenticated using (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy transactions_admin_read on public.business_transactions
for select to authenticated using (public.is_business_admin(business_id) or public.is_platform_superadmin());

create policy audit_admin_read on public.audit_logs
for select to authenticated
using (business_id is not null and (public.is_business_admin(business_id) or public.is_platform_superadmin()));

-- Public-facing business page can expose only active business records through a
-- dedicated safe view/RPC added in the public-booking migration. No broad anon
-- SELECT policy is granted on the base businesses/customers/appointments tables.
