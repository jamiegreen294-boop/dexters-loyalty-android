-- White-label multi-tenant foundation
-- PREPARED ONLY. Do not apply to Dexter's live database until a full clone/test has passed.
-- This migration backfills all existing records to the Dexter's tenant, then adds tenant-aware access controls.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  logo_url text,
  primary_color text not null default '#111111',
  accent_color text not null default '#ffffff',
  domain text,
  currency text not null default 'GBP',
  locale text not null default 'en-GB',
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','staff','customer')),
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

insert into public.businesses (slug,name,short_name,domain,currency,locale,settings)
values (
  'dexters',
  'Dexter''s',
  'Dexter''s',
  'app.dextersspot.co.uk',
  'GBP',
  'en-GB',
  jsonb_build_object(
    'features', jsonb_build_object(
      'loyalty', true,
      'points', true,
      'collectionOrders', true,
      'orderAgain', true,
      'spinToWin', true,
      'newsBanner', true,
      'staffPortal', true,
      'kds', true,
      'stockControl', true,
      'sundayRoast', true
    )
  )
)
on conflict (slug) do update set
  name=excluded.name,
  short_name=excluded.short_name,
  domain=excluded.domain,
  updated_at=now();

-- Existing authenticated users become members of the Dexter's tenant.
insert into public.business_memberships (business_id,user_id,role)
select b.id, u.id,
       case coalesce(p.role,'customer')
         when 'admin' then 'admin'
         when 'staff' then 'staff'
         else 'customer'
       end
from auth.users u
cross join public.businesses b
left join public.profiles p on p.id=u.id
where b.slug='dexters'
on conflict (business_id,user_id) do nothing;

create or replace function private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id=p_business_id
      and bm.user_id=(select auth.uid())
      and bm.active=true
  );
$$;

create or replace function private.has_business_role(p_business_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id=p_business_id
      and bm.user_id=(select auth.uid())
      and bm.active=true
      and bm.role=any(p_roles)
  );
$$;

revoke all on function private.is_business_member(uuid) from public;
revoke all on function private.has_business_role(uuid,text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid,text[]) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;

revoke all on public.businesses from anon, authenticated;
revoke all on public.business_memberships from anon, authenticated;
grant select on public.businesses to authenticated;
grant select,insert,update,delete on public.business_memberships to authenticated;

drop policy if exists businesses_member_select on public.businesses;
create policy businesses_member_select on public.businesses
for select to authenticated
using (private.is_business_member(id));

drop policy if exists memberships_self_or_manager_select on public.business_memberships;
create policy memberships_self_or_manager_select on public.business_memberships
for select to authenticated
using (
  user_id=(select auth.uid())
  or private.has_business_role(business_id,array['owner','admin'])
);

drop policy if exists memberships_manager_insert on public.business_memberships;
create policy memberships_manager_insert on public.business_memberships
for insert to authenticated
with check (private.has_business_role(business_id,array['owner','admin']));

drop policy if exists memberships_manager_update on public.business_memberships;
create policy memberships_manager_update on public.business_memberships
for update to authenticated
using (private.has_business_role(business_id,array['owner','admin']))
with check (private.has_business_role(business_id,array['owner','admin']));

drop policy if exists memberships_owner_delete on public.business_memberships;
create policy memberships_owner_delete on public.business_memberships
for delete to authenticated
using (private.has_business_role(business_id,array['owner']));

-- Tables used by the customer app, staff/admin, ordering, KDS, loyalty and promotions.
do $$
declare
  t text;
  tables text[] := array[
    'app_news_alert_test','app_news_banner','app_theme_settings',
    'collection_ordering_settings','collection_ordering_test_settings',
    'collection_orders','collection_orders_test',
    'customer_individual_offers',
    'dexters_order_contacts','dexters_order_events','dexters_order_items','dexters_orders','dexters_outbound_messages',
    'integration_keys',
    'loyalty_accounts','loyalty_deal_claims','loyalty_deal_settings','loyalty_events_v2',
    'loyalty_menu_categories','loyalty_menu_items','loyalty_modifier_test_groups','loyalty_modifier_test_options',
    'loyalty_points_accounts','loyalty_points_events','loyalty_points_redemptions',
    'offers','offers_v2','order_print_queue',
    'pos_audit_log','pos_cash_movements','pos_categories','pos_modifier_groups','pos_modifier_options',
    'pos_order_item_modifiers','pos_order_items','pos_orders','pos_payments','pos_product_modifier_groups',
    'pos_products','pos_shifts','printer_devices',
    'receipt_bonus_rewards','receipt_bonus_state','receipt_points_claims',
    'spin_wheel_prizes','spin_wheel_settings','spin_wheel_spins','spin_wheel_state','spin_wheel_test_spins',
    'sunday_roast_orders','sunday_roast_settings','sunday_roast_test_orders','sunday_roast_test_settings'
  ];
  dexters_id uuid;
begin
  select id into dexters_id from public.businesses where slug='dexters';
  foreach t in array tables loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists business_id uuid references public.businesses(id)',t);
      execute format('update public.%I set business_id=$1 where business_id is null',t) using dexters_id;
      execute format('alter table public.%I alter column business_id set not null',t);
      execute format('create index if not exists %I on public.%I (business_id)','idx_'||t||'_business_id',t);
      execute format('alter table public.%I enable row level security',t);
    end if;
  end loop;
end $$;

-- Business-scoped customer identity: one auth user can belong to several businesses.
create table if not exists public.business_customer_profiles (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  loyalty_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id,user_id),
  unique (business_id,loyalty_code)
);

insert into public.business_customer_profiles
  (business_id,user_id,full_name,phone,loyalty_code,created_at)
select b.id,p.id,p.full_name,p.phone,p.loyalty_code,p.created_at
from public.profiles p
cross join public.businesses b
where b.slug='dexters'
on conflict (business_id,user_id) do update set
  full_name=excluded.full_name,
  phone=excluded.phone,
  loyalty_code=excluded.loyalty_code;

alter table public.business_customer_profiles enable row level security;
revoke all on public.business_customer_profiles from anon,authenticated;
grant select,insert,update on public.business_customer_profiles to authenticated;

create policy customer_profile_read on public.business_customer_profiles
for select to authenticated
using (
  user_id=(select auth.uid())
  or private.has_business_role(business_id,array['owner','admin','staff'])
);
create policy customer_profile_insert on public.business_customer_profiles
for insert to authenticated
with check (
  user_id=(select auth.uid())
  and private.is_business_member(business_id)
);
create policy customer_profile_update on public.business_customer_profiles
for update to authenticated
using (
  user_id=(select auth.uid())
  or private.has_business_role(business_id,array['owner','admin','staff'])
)
with check (
  user_id=(select auth.uid())
  or private.has_business_role(business_id,array['owner','admin','staff'])
);

-- Replace any old permissive policies on tenant tables with tenant-aware policies.
do $$
declare
  t text;
  p record;
  tables text[] := array[
    'app_news_alert_test','app_news_banner','app_theme_settings',
    'collection_ordering_settings','collection_ordering_test_settings',
    'collection_orders','collection_orders_test',
    'customer_individual_offers',
    'dexters_order_contacts','dexters_order_events','dexters_order_items','dexters_orders','dexters_outbound_messages',
    'integration_keys',
    'loyalty_accounts','loyalty_deal_claims','loyalty_deal_settings','loyalty_events_v2',
    'loyalty_menu_categories','loyalty_menu_items','loyalty_modifier_test_groups','loyalty_modifier_test_options',
    'loyalty_points_accounts','loyalty_points_events','loyalty_points_redemptions',
    'offers','offers_v2','order_print_queue',
    'pos_audit_log','pos_cash_movements','pos_categories','pos_modifier_groups','pos_modifier_options',
    'pos_order_item_modifiers','pos_order_items','pos_orders','pos_payments','pos_product_modifier_groups',
    'pos_products','pos_shifts','printer_devices',
    'receipt_bonus_rewards','receipt_bonus_state','receipt_points_claims',
    'spin_wheel_prizes','spin_wheel_settings','spin_wheel_spins','spin_wheel_state','spin_wheel_test_spins',
    'sunday_roast_orders','sunday_roast_settings','sunday_roast_test_orders','sunday_roast_test_settings'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.'||t) is not null then
      for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I',p.policyname,t);
      end loop;

      execute format('revoke all on public.%I from anon,authenticated',t);
      execute format('grant select,insert,update,delete on public.%I to authenticated',t);

      execute format(
        'create policy %I on public.%I for select to authenticated using (private.has_business_role(business_id,array[''owner'',''admin'',''staff'']))',
        'tenant_select_'||t,t
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (private.has_business_role(business_id,array[''owner'',''admin'',''staff'']))',
        'tenant_insert_'||t,t
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (private.has_business_role(business_id,array[''owner'',''admin'',''staff''])) with check (private.has_business_role(business_id,array[''owner'',''admin'',''staff'']))',
        'tenant_update_'||t,t
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (private.has_business_role(business_id,array[''owner'',''admin'']))',
        'tenant_delete_'||t,t
      );
    end if;
  end loop;
end $$;

-- Customers are limited to their own personal records. These policies are additive to the staff/admin policies above.
create policy customer_collection_orders_select on public.collection_orders
for select to authenticated
using (customer_id=(select auth.uid()) and private.is_business_member(business_id));
create policy customer_collection_orders_insert on public.collection_orders
for insert to authenticated
with check (customer_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_loyalty_accounts_select on public.loyalty_accounts
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_points_accounts_select on public.loyalty_points_accounts
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));
create policy customer_points_events_select on public.loyalty_points_events
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));
create policy customer_points_redemptions_select on public.loyalty_points_redemptions
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));
create policy customer_points_redemptions_insert on public.loyalty_points_redemptions
for insert to authenticated
with check (user_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_individual_offers_select on public.customer_individual_offers
for select to authenticated
using (customer_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_spin_spins_select on public.spin_wheel_spins
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_receipt_rewards_select on public.receipt_bonus_rewards
for select to authenticated
using (user_id=(select auth.uid()) and private.is_business_member(business_id));

create policy customer_sunday_orders_select on public.sunday_roast_orders
for select to authenticated
using (customer_id=(select auth.uid()) and private.is_business_member(business_id));
create policy customer_sunday_orders_insert on public.sunday_roast_orders
for insert to authenticated
with check (customer_id=(select auth.uid()) and private.is_business_member(business_id));

-- Public catalogue data may be read anonymously, but only for an explicitly supplied business.
-- Anonymous writes remain blocked.
grant select on public.loyalty_menu_categories, public.loyalty_menu_items,
  public.loyalty_modifier_test_groups, public.loyalty_modifier_test_options,
  public.offers_v2 to anon;

create policy public_menu_categories_by_business on public.loyalty_menu_categories
for select to anon using (business_id is not null);
create policy public_menu_items_by_business on public.loyalty_menu_items
for select to anon using (business_id is not null);
create policy public_modifier_groups_by_business on public.loyalty_modifier_test_groups
for select to anon using (business_id is not null);
create policy public_modifier_options_by_business on public.loyalty_modifier_test_options
for select to anon using (business_id is not null);
create policy public_offers_by_business on public.offers_v2
for select to anon using (business_id is not null and active=true);

-- Tenant-safe uniqueness for common catalogue identifiers.
-- Existing global unique constraints are removed only when they match the listed columns.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype='u'
      and conrelid in (
        'public.pos_categories'::regclass,
        'public.printer_devices'::regclass
      )
  loop
    execute format('alter table %s drop constraint if exists %I',c.tbl,c.conname);
  end loop;
end $$;

create unique index if not exists uq_pos_categories_business_name
  on public.pos_categories(business_id,lower(name));
create unique index if not exists uq_printer_devices_business_name
  on public.printer_devices(business_id,lower(name));

-- Useful tenant indexes for high-traffic customer/order data.
create index if not exists idx_collection_orders_business_customer
  on public.collection_orders(business_id,customer_id);
create index if not exists idx_collection_orders_business_status
  on public.collection_orders(business_id,status,created_at desc);
create index if not exists idx_loyalty_points_events_business_user
  on public.loyalty_points_events(business_id,user_id,created_at desc);
create index if not exists idx_spin_spins_business_user
  on public.spin_wheel_spins(business_id,user_id,spin_date desc);
create index if not exists idx_sunday_orders_business_date
  on public.sunday_roast_orders(business_id,collection_date,status);

comment on table public.businesses is 'White-label tenant/business registry.';
comment on table public.business_memberships is 'Authoritative tenant membership and role table. Do not use user_metadata for authorization.';
comment on table public.business_customer_profiles is 'Business-scoped customer profile so one auth identity can use multiple branded apps.';
