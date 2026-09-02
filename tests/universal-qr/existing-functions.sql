CREATE OR REPLACE FUNCTION public.staff_add_stamp(p_loyalty_code text)
 RETURNS TABLE(customer_id uuid, full_name text, stamps integer, reward_ready boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cid uuid; current_stamps int;
begin
  if not public.app_has_permission('add_stamps') then raise exception 'Not authorised'; end if;
  select id into cid from public.profiles where loyalty_code=p_loyalty_code and role='customer';
  if cid is null then raise exception 'Customer not found'; end if;
  select la.stamps into current_stamps from public.loyalty_accounts la where la.user_id=cid for update;
  if current_stamps >= 9 then raise exception 'Reward ready - redeem first'; end if;
  update public.loyalty_accounts set stamps=current_stamps+1, updated_at=now() where user_id=cid;
  insert into public.loyalty_events_v2(customer_id,actor_id,event_type,stamp_after,note)
  values(cid,auth.uid(),'stamp',current_stamps+1,'Stamp added by staff');
  return query select p.id,p.full_name,la.stamps,la.reward_ready from public.profiles p join public.loyalty_accounts la on la.user_id=p.id where p.id=cid;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.staff_redeem_reward(p_loyalty_code text)
 RETURNS TABLE(customer_id uuid, full_name text, stamps integer, reward_ready boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cid uuid; current_stamps int;
begin
  if not public.app_has_permission('redeem_rewards') then raise exception 'Not authorised'; end if;
  select id into cid from public.profiles where loyalty_code=p_loyalty_code and role='customer';
  if cid is null then raise exception 'Customer not found'; end if;
  select la.stamps into current_stamps from public.loyalty_accounts la where la.user_id=cid for update;
  if current_stamps < 9 then raise exception 'Customer has not reached 9 stamps'; end if;
  update public.loyalty_accounts set stamps=0, updated_at=now() where user_id=cid;
  insert into public.loyalty_events_v2(customer_id,actor_id,event_type,stamp_after,note)
  values(cid,auth.uid(),'redeem',0,'Free coffee redeemed');
  return query select p.id,p.full_name,la.stamps,la.reward_ready from public.profiles p join public.loyalty_accounts la on la.user_id=p.id where p.id=cid;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.staff_redeem_spin_prize(p_loyalty_code text, p_spin_id uuid)
 RETURNS TABLE(customer_name text, prize_name text, redeemed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_row public.spin_wheel_spins%rowtype;
  v_name text;
begin
  if not public.app_has_permission('redeem_spin_prizes') then raise exception 'Permission denied'; end if;
  select s.* into v_row
  from public.spin_wheel_spins s
  join public.profiles p on p.id=s.user_id
  where s.id=p_spin_id and p.loyalty_code=p_loyalty_code and s.is_win=true
  for update;
  if not found then raise exception 'Winning prize not found'; end if;
  if v_row.redeemed then raise exception 'Prize already redeemed'; end if;
  update public.spin_wheel_spins set redeemed=true,redeemed_at=now(),redeemed_by=v_uid where id=v_row.id;
  select coalesce(full_name,'Customer') into v_name from public.profiles where id=v_row.user_id;
  return query select v_name,v_row.prize_name,now();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.loyalty_redeem_deal(p_claim_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_row public.loyalty_deal_claims%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id=v_uid;
  if coalesce(v_role,'') not in ('admin','staff') then raise exception 'Staff access required'; end if;

  update public.loyalty_deal_claims
  set redeemed_at=now(), redeemed_by=v_uid
  where id=p_claim_id
    and redeemed_at is null
    and (expires_at is null or expires_at>=now())
  returning * into v_row;

  if found then
    select full_name into v_name from public.profiles where id=v_row.customer_id;
    return jsonb_build_object('ok',true,'status','redeemed','claim_id',v_row.id,'customer_id',v_row.customer_id,'customer_name',v_name,'deal_key',v_row.deal_key,'redeemed_at',v_row.redeemed_at);
  end if;

  select * into v_row from public.loyalty_deal_claims where id=p_claim_id;
  if not found then return jsonb_build_object('ok',false,'status','invalid'); end if;
  if v_row.redeemed_at is not null then return jsonb_build_object('ok',false,'status','already_redeemed','redeemed_at',v_row.redeemed_at); end if;
  return jsonb_build_object('ok',false,'status','expired');
end;$function$
;
CREATE OR REPLACE FUNCTION public.award_loyalty_points_service(p_user_id uuid, p_points integer, p_event_type text, p_source_id text, p_order_value numeric, p_created_by uuid, p_note text DEFAULT NULL::text)
 RETURNS TABLE(added boolean, balance integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  inserted_id uuid;
  new_balance integer;
begin
  if p_points <= 0 then
    raise exception 'Points must be positive';
  end if;
  if p_event_type not in ('staff_purchase','collection_order','adjustment') then
    raise exception 'Invalid event type';
  end if;

  insert into public.loyalty_points_events(user_id, points_delta, event_type, source_id, order_value, created_by, note)
  values (p_user_id, p_points, p_event_type, p_source_id, p_order_value, p_created_by, p_note)
  on conflict (event_type, source_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    select coalesce(a.points,0) into new_balance from public.loyalty_points_accounts a where a.user_id=p_user_id;
    return query select false, coalesce(new_balance,0);
    return;
  end if;

  insert into public.loyalty_points_accounts(user_id, points, updated_at)
  values (p_user_id, p_points, now())
  on conflict (user_id) do update
    set points = public.loyalty_points_accounts.points + excluded.points,
        updated_at = now()
  returning points into new_balance;

  return query select true, new_balance;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.confirm_loyalty_points_redemption_service(p_redemption_id uuid, p_staff_id uuid)
 RETURNS TABLE(confirmed boolean, balance integer, item_name text, category_name text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  r public.loyalty_points_redemptions%rowtype;
  current_balance integer;
  new_balance integer;
begin
  select * into r
  from public.loyalty_points_redemptions
  where id=p_redemption_id
  for update;

  if r.id is null then
    raise exception 'Redemption not found';
  end if;

  if r.status <> 'pending' then
    select coalesce(points,0) into current_balance
    from public.loyalty_points_accounts
    where user_id=r.user_id;
    return query select false, coalesce(current_balance,0), r.item_name, r.category_name;
    return;
  end if;

  select points into current_balance
  from public.loyalty_points_accounts
  where user_id=r.user_id
  for update;

  current_balance := coalesce(current_balance,0);

  if current_balance < r.points_cost then
    raise exception 'Customer no longer has enough points';
  end if;

  update public.loyalty_points_accounts
  set points=points-r.points_cost, updated_at=now()
  where user_id=r.user_id
  returning points into new_balance;

  insert into public.loyalty_points_events(
    user_id, points_delta, event_type, source_id, created_by, note
  )
  values(
    r.user_id, -r.points_cost, 'redemption', r.id::text, p_staff_id,
    'Redeemed '||r.item_name||' ('||r.category_name||')'
  )
  on conflict (event_type, source_id) do nothing;

  update public.loyalty_points_redemptions
  set status='confirmed', confirmed_at=now(), confirmed_by=p_staff_id
  where id=r.id and status='pending';

  return query select true, new_balance, r.item_name, r.category_name;
end;
$function$
;
