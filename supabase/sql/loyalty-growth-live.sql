-- Shared live data for Loyalty catering, personalised deals and challenges.
-- Run once in the Dexter's Supabase project before deploying loyalty-growth-api.
create extension if not exists pgcrypto;

create table if not exists public.loyalty_growth_settings (
  id smallint primary key default 1 check (id = 1),
  catering_enabled boolean not null default false,
  deals_enabled boolean not null default true,
  challenges_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.loyalty_growth_settings(id,catering_enabled,deals_enabled,challenges_enabled)
values (1,false,true,true) on conflict (id) do nothing;

-- The Back Office Deals switch also owns the existing 12-month meal-deal engine.
update public.loyalty_deal_settings set auto_enabled=true where id=1;

create table if not exists public.loyalty_catering_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  event_name text not null,
  people integer not null check (people between 1 and 500),
  collection_at timestamptz not null,
  package_key text not null,
  package_name text not null,
  dietary_notes text,
  allergy_declaration text,
  request_data jsonb not null default '{}'::jsonb,
  estimated_total numeric(10,2),
  quoted_total numeric(10,2),
  status text not null default 'pending' check (status in ('pending','amendment_required','customer_confirmed','approved','rejected','cancelled','collected')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  handled_by uuid references auth.users(id)
);
create index if not exists loyalty_catering_customer_created_idx on public.loyalty_catering_requests(customer_id,created_at desc);
create index if not exists loyalty_catering_status_created_idx on public.loyalty_catering_requests(status,created_at desc);

create table if not exists public.loyalty_personal_deals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  offer_text text not null,
  reason text,
  deal_type text not null default 'staff_offer',
  discount_pence integer not null default 0 check (discount_pence between 0 and 10000),
  minimum_spend_pence integer not null default 0 check (minimum_spend_pence between 0 and 100000),
  bonus_points integer not null default 0 check (bonus_points between 0 and 10000),
  status text not null default 'draft' check (status in ('draft','approved','sent','redeemed','expired','cancelled')),
  expires_at timestamptz not null,
  approved_by uuid references auth.users(id),
  sent_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loyalty_personal_deals_customer_idx on public.loyalty_personal_deals(customer_id,status,expires_at);

create table if not exists public.loyalty_challenge_rules (
  challenge_key text primary key,
  title text not null,
  label text not null,
  target integer not null check (target between 1 and 100),
  reward_text text not null,
  reward_points integer not null default 0 check (reward_points between 0 and 10000),
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.loyalty_challenge_rules(challenge_key,title,label,target,reward_text,reward_points,sort_order) values
 ('breakfast','Breakfast Regular','Breakfast orders in the last 30 days',3,'100 bonus points',100,10),
 ('subs','Street Sub Explorer','Different Street Subs tried in the last 30 days',3,'150 bonus points',150,20),
 ('weekdays','Weekday Streak','Different weekdays ordered in the last 30 days',5,'Free 2oz Dexter''s sauce',0,30)
on conflict (challenge_key) do nothing;

create table if not exists public.loyalty_challenge_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  challenge_key text not null references public.loyalty_challenge_rules(challenge_key),
  period_key text not null,
  reward_text text not null,
  reward_points integer not null default 0,
  status text not null default 'earned' check (status in ('earned','revealed','approved','rejected','redeemed')),
  revealed_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(customer_id,challenge_key,period_key)
);
create index if not exists loyalty_challenge_rewards_customer_idx on public.loyalty_challenge_rewards(customer_id,created_at desc);

alter table public.loyalty_growth_settings enable row level security;
alter table public.loyalty_catering_requests enable row level security;
alter table public.loyalty_personal_deals enable row level security;
alter table public.loyalty_challenge_rules enable row level security;
alter table public.loyalty_challenge_rewards enable row level security;

-- The authenticated Edge Function is the only application entry point. It verifies
-- the caller and uses the service role after applying customer/staff ownership checks.
revoke all on public.loyalty_growth_settings, public.loyalty_catering_requests,
 public.loyalty_personal_deals, public.loyalty_challenge_rules,
 public.loyalty_challenge_rewards from anon, authenticated;
