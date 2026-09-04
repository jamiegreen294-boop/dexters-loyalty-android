-- TEST BRANCH ONLY. Do not apply until the collection amend flow is approved.
-- Daily outages automatically stop applying after the Europe/London calendar date changes.

alter table public.collection_orders
  drop constraint if exists collection_orders_status_check;

alter table public.collection_orders
  add constraint collection_orders_status_check
  check (status in ('pending','amendment_required','amended','accepted','preparing','ready','rejected','collected'));

alter table public.collection_orders
  add column if not exists amendment_items jsonb,
  add column if not exists amendment_note text,
  add column if not exists amendment_requested_at timestamptz,
  add column if not exists amended_at timestamptz,
  add column if not exists amendment_count integer not null default 0;

create table if not exists public.collection_daily_outages (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.loyalty_menu_items(id) on delete cascade,
  outage_date date not null,
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  restored_at timestamptz
);

create unique index if not exists collection_daily_outages_active_unique
  on public.collection_daily_outages(menu_item_id,outage_date)
  where restored_at is null;

alter table public.collection_daily_outages enable row level security;

-- No client-facing policies are intentionally created.
-- Access is through the authenticated collection-orders-api, which checks staff/admin role.
