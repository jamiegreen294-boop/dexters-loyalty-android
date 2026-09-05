-- Installed 2026-09-02 as universal_qr_scanner; frontend publication is separate.
-- Public entrypoint is invoker; private implementation checks every action's caller.
begin;
create schema if not exists dexters_private;
revoke all on schema dexters_private from public;
grant usage on schema dexters_private to authenticated;
create table if not exists dexters_private.qr_receipts (
 actor_id uuid not null, request_id uuid not null, signature jsonb not null,
 result jsonb, created_at timestamptz not null default now(), primary key(actor_id,request_id)
);
alter table dexters_private.qr_receipts enable row level security;
revoke all on dexters_private.qr_receipts from public, anon, authenticated;

create table if not exists dexters_private.qr_deal_catalog(slug text primary key,item text not null,category text not null);
alter table dexters_private.qr_deal_catalog enable row level security;
revoke all on dexters_private.qr_deal_catalog from public,anon,authenticated;
insert into dexters_private.qr_deal_catalog values
('winter-tenders','4 Chicken Tenders + Chips + Can','Chicken Tenders'),
('valentine-burger-deal','2 Dexter Smash Burgers + 2 Cans','Dexter’s Smash Burgers'),
('street-sub-meal','Chicken Mayo Melt + Chips + Can','Dexter’s Street Subs'),
('easter-chicken-deal','Classic Chicken Smash + Can + Garlic Bread','Chicken Burgers'),
('smash-rings','Dexter Smash + Can + Onion Rings','Dexter’s Smash Burgers'),
('summer-sub','Southern Fried Chicken Sub + Chips + Can','Dexter’s Street Subs'),
('summer-tenders','6 Chicken Tenders + Chips + Can','Chicken Tenders'),
('bbq-summer','BBQ Tenders + Chips + Can','Chicken Tenders'),
('back-to-routine','Chicken Mayo Melt + Chips + Can','Dexter’s Street Subs'),
('halloween-inferno','Inferno Chicken + Chips + Can','Inferno Chicken Tenders'),
('winter-warmer','Chicken Curry Rice Bowl + Can','Dexter’s Rice Bowls'),
('christmas-burger-feast','2 Dexter Smash Burgers + 2 Cans + Onion Rings','Dexter’s Smash Burgers')
on conflict(slug) do update set item=excluded.item,category=excluded.category;

create or replace function dexters_private.qr_action(p_action text, p_raw text default '', p_request_id uuid default null, p_amount numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
<<qr>>
declare
 actor uuid:=auth.uid(); actor_role text; kind text; code text; rid uuid; cid uuid;
 item text; category text; customer_name text; state text; redeemed_time timestamptz;
 r record; a record; evt record; result jsonb; signature jsonb; cached record;
 latest_event uuid; perms jsonb; rows jsonb; matching int; cost int; balance int;
begin
 if actor is null then raise exception 'Sign in required'; end if;
 select role into actor_role from public.profiles where id=actor;
 if actor_role is null then raise exception 'Account unavailable'; end if;
 if p_action='wallet' then
   if actor_role<>'customer' then return jsonb_build_object('rewards','[]'::jsonb); end if;
   rows:='[]'::jsonb;
   for r in select id,item_name,category_name,points_cost from public.loyalty_points_redemptions where user_id=actor and status='pending' loop
     rows:=rows||jsonb_build_array(jsonb_build_object('raw','DEXTERS_POINTS:'||r.id,'kind','points','item',r.item_name,'category',r.category_name,'points_cost',r.points_cost));
   end loop;
   -- Spin to Win prizes are app-only and are intentionally not exposed as staff-scannable QR rewards.
   if exists(select 1 from public.loyalty_accounts where user_id=actor and stamps>=9) then
     select id into latest_event from public.loyalty_events_v2 where customer_id=actor order by created_at desc,id desc limit 1;
     if latest_event is not null then rows:=rows||jsonb_build_array(jsonb_build_object('raw','DEXTERS_COFFEE:'||latest_event,'kind','coffee','item','Free coffee','category','Coffee')); end if;
   end if;
   return jsonb_build_object('rewards',rows);
 end if;
 if actor_role not in ('admin','staff') then raise exception 'Staff access required'; end if;
 if p_action not in ('lookup','stamp','points','redeem') then raise exception 'Unknown action'; end if;
 p_raw:=btrim(p_raw);
 if p_raw ~ '^(DEXTERS:)?[0-9]{6}$' then kind:='customer'; code:=right(p_raw,6);
 elsif p_raw ~* '^DEXTERS[_-](DEAL|SPIN|POINTS|OFFER|COFFEE):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   kind:=lower(split_part(replace(p_raw,'-','_'),':',1)); kind:=substring(kind from 9); rid:=split_part(p_raw,':',2)::uuid;
 else raise exception 'Invalid Dexter’s QR'; end if;
 if kind='customer' then
   if not (public.app_has_permission('loyalty_lookup') or public.app_has_permission('add_stamps') or public.app_has_permission('redeem_rewards') or public.app_has_permission('redeem_spin_prizes')) then raise exception 'Permission denied'; end if;
   select id,full_name into cid,customer_name from public.profiles where loyalty_code=code and role='customer';
   if cid is null then raise exception 'Customer not found'; end if;
 elsif kind='spin' then
   raise exception 'Spin to Win prizes can only be claimed through the Dexter’s customer app';
   if not public.app_has_permission('redeem_spin_prizes') then raise exception 'Permission denied'; end if;
   select * into r from public.spin_wheel_spins where id=rid and is_win;
   if not found then raise exception 'Winning reward not found'; end if;
   cid:=r.user_id; item:=r.prize_name; state:=case when r.redeemed then 'used' else 'valid' end; redeemed_time:=r.redeemed_at;
   select count(*),min(c.name) into matching,category from public.loyalty_menu_items i join public.loyalty_menu_categories c on c.id=i.category_id where lower(i.name)=lower(item);
   if matching<>1 then category:='Check prize details with staff'; end if;
 elsif kind='points' then
   select * into r from public.loyalty_points_redemptions where id=rid;
   if not found then raise exception 'Reward not found'; end if;
   cid:=r.user_id; item:=r.item_name; category:=r.category_name; cost:=r.points_cost;
   state:=case when r.status='pending' then 'valid' when r.status='confirmed' then 'used' else 'unavailable' end; redeemed_time:=r.confirmed_at;
 elsif kind='deal' then
   select * into r from public.loyalty_deal_claims where id=rid;
   if not found then raise exception 'Deal not found'; end if;
   cid:=r.customer_id; state:=case when r.redeemed_at is not null then 'used' when r.expires_at is not null and r.expires_at<now() then 'expired' else 'valid' end; redeemed_time:=r.redeemed_at;
   -- Exact deal-key catalog is generated from the existing approved deal definitions below.
   select d.item,d.category into item,category from dexters_private.qr_deal_catalog d where r.deal_key ~ ('^yearly-[0-9]{4}-[0-9]{2}-'||d.slug||'$');
   if item is null then raise exception 'Deal details unavailable — use the existing manual deal controls'; end if;
 elsif kind='offer' then
   select * into r from public.customer_individual_offers where id=rid;
   if not found then raise exception 'Offer not found'; end if;
   cid:=r.customer_id; item:=coalesce(nullif(r.reward_value,''),r.title);
   state:=case when r.redeemed_at is not null or r.status='redeemed' then 'used' when r.status<>'active' then 'unavailable' when r.expires_at is not null and r.expires_at<now() then 'expired' else 'valid' end; redeemed_time:=r.redeemed_at;
   select count(*),min(c.name) into matching,category from public.loyalty_menu_items i join public.loyalty_menu_categories c on c.id=i.category_id where lower(i.name)=lower(item);
   if matching<>1 then category:='Customer offer — see staff instructions'; end if;
 elsif kind='coffee' then
   if not public.app_has_permission('redeem_rewards') then raise exception 'Permission denied'; end if;
   select * into evt from public.loyalty_events_v2 where id=rid and event_type='stamp' and stamp_after>=9;
   if not found then raise exception 'Coffee reward not found'; end if;
   cid:=evt.customer_id; item:='Free coffee'; category:='Coffee';
   select * into a from public.loyalty_accounts where user_id=cid for update;
   select id into latest_event from public.loyalty_events_v2 where customer_id=cid order by created_at desc,id desc limit 1;
   state:=case when latest_event=rid and a.stamps>=9 then 'valid' else 'used' end;
 end if;
 if cid is null then raise exception 'Invalid reward owner'; end if;
 select full_name,loyalty_code into customer_name,code from public.profiles where id=cid and role='customer';
 if not found then raise exception 'Customer unavailable'; end if;
 if p_action='lookup' then
   select coalesce(points,0) into balance from public.loyalty_points_accounts where user_id=cid;
   if kind='customer' then
     select * into a from public.loyalty_accounts where user_id=cid;
     return jsonb_build_object('kind',kind,'customer',customer_name,'stamps',coalesce(a.stamps,0),'points',coalesce(balance,0),'can_stamp',public.app_has_permission('add_stamps'),'can_points',true);
   end if;
   result:=jsonb_build_object('kind',kind,'customer',customer_name,'item',item,'category',category,'status',state,'redeemed_at',redeemed_time,'points_cost',cost);
   if kind='offer' then result:=result||jsonb_build_object('instructions',r.staff_instructions,'title',r.title); end if;
   return result;
 end if;
 if p_request_id is null then raise exception 'Request reference required'; end if;
 signature:=jsonb_build_object('action',p_action,'raw',p_raw,'amount',p_amount);
 insert into dexters_private.qr_receipts(actor_id,request_id,signature) values(actor,p_request_id,signature) on conflict do nothing;
 select * into cached from dexters_private.qr_receipts where actor_id=actor and request_id=p_request_id for update;
 if cached.signature<>signature then raise exception 'Request reference already belongs to another action'; end if;
 if cached.result is not null then return cached.result; end if;
 if p_action='stamp' then
   if kind<>'customer' then raise exception 'Customer QR required'; end if;
   select * into a from public.staff_add_stamp(code);
   result:=jsonb_build_object('ok',true,'message','Coffee stamp added','stamps',a.stamps);
 elsif p_action='points' then
   raise exception 'Points are awarded automatically through the Dexter’s app';
 else
   if kind='customer' then raise exception 'Choose a reward QR to redeem'; end if;
   if state<>'valid' then return jsonb_build_object('ok',false,'message','Reward already used or unavailable','status',state); end if;
   if kind='points' then
     select * into a from public.confirm_loyalty_points_redemption_service(rid,actor);
     result:=jsonb_build_object('ok',a.confirmed,'message',case when a.confirmed then 'Reward redeemed — points deducted' else 'Already redeemed' end,'points',a.balance);
   elsif kind='spin' then
     perform public.staff_redeem_spin_prize(code,rid);
     result:=jsonb_build_object('ok',true,'message','Spin to Win prize redeemed');
   elsif kind='deal' then
     result:=public.loyalty_redeem_deal(rid);
     result:=result||jsonb_build_object('message',case when (result->>'ok')::boolean then 'Deal redeemed' else 'Deal already used or unavailable' end);
   elsif kind='coffee' then
     perform public.staff_redeem_reward(code);
     result:=jsonb_build_object('ok',true,'message','Coffee redeemed — stamps reset');
   elsif kind='offer' then
     update public.customer_individual_offers set status='redeemed',redeemed_at=now(),redeemed_by=actor where id=rid and status='active' and redeemed_at is null and (expires_at is null or expires_at>=now());
     result:=jsonb_build_object('ok',found,'message',case when found then 'Offer redeemed' else 'Offer already used or unavailable' end);
   end if;
 end if;
 update dexters_private.qr_receipts set result=qr.result where actor_id=actor and request_id=p_request_id;
 return result;
end $$;
revoke all on function dexters_private.qr_action(text,text,uuid,numeric) from public,anon;
grant execute on function dexters_private.qr_action(text,text,uuid,numeric) to authenticated;
create or replace function public.universal_qr_action(p_action text,p_raw text default '',p_request_id uuid default null,p_amount numeric default null)
returns jsonb language sql security invoker set search_path='' as $$select dexters_private.qr_action(p_action,p_raw,p_request_id,p_amount)$$;
revoke all on function public.universal_qr_action(text,text,uuid,numeric) from public,anon;
grant execute on function public.universal_qr_action(text,text,uuid,numeric) to authenticated;
commit;
