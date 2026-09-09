-- TEST/DRAFT ONLY: Dexter's phone call + telephone order data model
-- Do not apply to production until phone event source is verified in shop.

create table if not exists public.phone_calls (
  id uuid primary key default gen_random_uuid(),
  external_call_id text unique,
  direction text not null check (direction in ('incoming','outgoing')),
  caller_number text,
  called_number text,
  customer_id uuid,
  staff_user_id uuid,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  status text not null default 'ringing'
    check (status in ('ringing','answered','completed','missed','failed')),
  callback_status text not null default 'none'
    check (callback_status in ('none','required','resolved')),
  transcript text,
  recording_path text,
  recording_consent_notice_played boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists phone_calls_caller_number_idx on public.phone_calls(caller_number);
create index if not exists phone_calls_started_at_idx on public.phone_calls(started_at desc);
create index if not exists phone_calls_callback_status_idx on public.phone_calls(callback_status);

create table if not exists public.telephone_orders (
  id uuid primary key default gen_random_uuid(),
  phone_call_id uuid references public.phone_calls(id) on delete set null,
  customer_id uuid,
  caller_number text,
  customer_name text,
  order_status text not null default 'draft'
    check (order_status in ('draft','confirmed','sent_to_kitchen','ready','collected','cancelled')),
  source text not null default 'telephone',
  transcript_snapshot text,
  staff_note text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.telephone_order_items (
  id uuid primary key default gen_random_uuid(),
  telephone_order_id uuid not null references public.telephone_orders(id) on delete cascade,
  menu_item_id text,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  modifiers jsonb not null default '[]'::jsonb,
  confidence numeric,
  needs_staff_review boolean not null default false,
  created_at timestamptz not null default now()
);

-- Security intent for production:
-- 1) staff/admin authenticated access only.
-- 2) no public select/insert/update on call/transcript/recording tables.
-- 3) recording/transcript retention policy applied before launch.
-- 4) all print/send-to-kitchen actions require staff confirmation.
