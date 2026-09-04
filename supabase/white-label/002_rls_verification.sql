-- Read-only verification queries for a cloned/test database after 001 is applied.
-- Expected result: every tenant table has RLS enabled and business_id populated.

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'businesses','business_memberships','business_customer_profiles',
    'collection_orders','loyalty_menu_categories','loyalty_menu_items',
    'loyalty_points_accounts','loyalty_points_events','spin_wheel_spins',
    'sunday_roast_orders','order_print_queue','printer_devices'
  )
order by c.relname;

select 'collection_orders' as table_name,count(*) filter(where business_id is null) as missing_business from public.collection_orders
union all select 'loyalty_menu_categories',count(*) filter(where business_id is null) from public.loyalty_menu_categories
union all select 'loyalty_menu_items',count(*) filter(where business_id is null) from public.loyalty_menu_items
union all select 'loyalty_points_events',count(*) filter(where business_id is null) from public.loyalty_points_events
union all select 'spin_wheel_spins',count(*) filter(where business_id is null) from public.spin_wheel_spins
union all select 'sunday_roast_orders',count(*) filter(where business_id is null) from public.sunday_roast_orders;

select b.slug,b.name,count(bm.user_id) as members
from public.businesses b
left join public.business_memberships bm on bm.business_id=b.id
group by b.id,b.slug,b.name
order by b.slug;

select schemaname,tablename,policyname,roles,cmd
from pg_policies
where schemaname='public'
  and (tablename like 'business%' or policyname like 'tenant_%')
order by tablename,policyname;
