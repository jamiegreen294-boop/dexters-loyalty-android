create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
create table profiles(id uuid primary key,full_name text,loyalty_code text unique,role text);
create table loyalty_accounts(user_id uuid primary key,stamps int not null default 0,reward_ready boolean generated always as(stamps>=9) stored,updated_at timestamptz default now());
create table loyalty_events_v2(id uuid primary key default gen_random_uuid(),customer_id uuid,actor_id uuid,event_type text,stamp_after int,note text,created_at timestamptz default now());
create table loyalty_points_accounts(user_id uuid primary key,points int not null check(points>=0),updated_at timestamptz default now());
create table loyalty_points_events(id uuid primary key default gen_random_uuid(),user_id uuid,points_delta int,event_type text,source_id text,order_value numeric,created_by uuid,note text,unique(event_type,source_id));
create table loyalty_points_redemptions(id uuid primary key,user_id uuid,item_id uuid,item_name text,category_name text,points_cost int,reference_code text,status text,requested_at timestamptz default now(),confirmed_at timestamptz,confirmed_by uuid);
create table spin_wheel_spins(id uuid primary key,user_id uuid,prize_name text,is_win boolean,redeemed boolean default false,redeemed_at timestamptz,redeemed_by uuid);
create table loyalty_deal_claims(id uuid primary key,customer_id uuid,deal_key text,expires_at timestamptz,redeemed_at timestamptz,redeemed_by uuid);
create table customer_individual_offers(id uuid primary key,customer_id uuid,title text,offer_type text,reward_value text,staff_instructions text,expires_at timestamptz,status text,redeemed_at timestamptz,redeemed_by uuid);
create table loyalty_menu_categories(id uuid primary key,name text);
create table loyalty_menu_items(id uuid primary key,category_id uuid,name text);
-- Fixture equivalent of permission checks: admin allowed; fixture staff can be restricted.
create function app_has_permission(p text) returns boolean language sql as $$select exists(select 1 from public.profiles where id=auth.uid() and (role='admin' or (role='staff' and current_setting('test.denied',true) is distinct from p)))$$;
