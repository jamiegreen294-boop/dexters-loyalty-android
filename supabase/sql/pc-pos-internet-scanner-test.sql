create table if not exists public.pc_pos_scanner_pairs_test (
  id uuid primary key default gen_random_uuid(),
  pair_code_hash text not null unique,
  scanner_token_hash text unique,
  pos_user_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null default 'Foodhub 1008',
  enabled boolean not null default true,
  expires_at timestamptz not null,
  paired_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pc_pos_scan_events_test (
  id bigint generated always as identity primary key,
  pair_id uuid not null references public.pc_pos_scanner_pairs_test(id) on delete cascade,
  scan_type text not null default 'auto' check (scan_type in ('auto','product','loyalty')),
  scan_value text not null check (char_length(scan_value) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists pc_pos_scan_events_test_pair_id_id_idx
  on public.pc_pos_scan_events_test(pair_id,id);
create index if not exists pc_pos_scanner_pairs_test_pos_user_id_idx
  on public.pc_pos_scanner_pairs_test(pos_user_id);

alter table public.pc_pos_scanner_pairs_test enable row level security;
alter table public.pc_pos_scan_events_test enable row level security;
revoke all on public.pc_pos_scanner_pairs_test from anon, authenticated;
revoke all on public.pc_pos_scan_events_test from anon, authenticated;
