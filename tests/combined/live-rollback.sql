-- Integration checks against the installed schema. All fixtures are rolled back.
-- No email, real customer mutation, or persistent test account is created.
begin;
do $$
declare
 customer uuid:=gen_random_uuid(); staff uuid:=gen_random_uuid(); other_customer uuid:=gen_random_uuid();
 item_id uuid; item_name text; category_name text; code text; reward uuid:=gen_random_uuid();
 offer uuid:=gen_random_uuid(); deal uuid:=gen_random_uuid(); spin uuid:=gen_random_uuid();
 request uuid:=gen_random_uuid(); stamp_request uuid:=gen_random_uuid(); coffee text; r jsonb; n int;
begin
 insert into auth.users(id,raw_user_meta_data) values
 (customer,'{"full_name":"QR rollback test customer"}'),
 (staff,'{"full_name":"QR rollback test staff"}'),
 (other_customer,'{"full_name":"QR rollback other customer"}');
 update public.profiles set role='staff',staff_permissions='{"loyalty_lookup":true,"add_stamps":true,"redeem_rewards":true,"redeem_spin_prizes":true}' where id=staff;
 select loyalty_code into code from public.profiles where id=customer;
 select i.id,i.name,c.name into item_id,item_name,category_name from public.loyalty_menu_items i join public.loyalty_menu_categories c on c.id=i.category_id where i.active limit 1;
 if item_id is null then raise exception 'No menu item available for integration fixture'; end if;
 insert into public.loyalty_points_accounts(user_id,points) values(customer,1000);
 insert into public.loyalty_points_redemptions(id,user_id,item_id,item_name,category_name,points_cost,reference_code,status)
 values(reward,customer,item_id,item_name,category_name,650,'QA-'||reward,'pending');
 insert into public.customer_individual_offers(id,customer_id,title,offer_type,reward_value,status)
 values(offer,customer,'Rollback test','custom',item_name,'active');
 insert into public.loyalty_deal_claims(id,customer_id,deal_key,expires_at)
 values(deal,customer,'yearly-2026-09-back-to-routine',now()+interval '1 day');
 insert into public.spin_wheel_spins(id,user_id,spin_date,spin_number,is_win,prize_name)
 values(spin,customer,current_date,-abs(('x'||substr(replace(spin::text,'-',''),1,12))::bit(48)::bigint),true,item_name);
 perform set_config('request.jwt.claim.sub',staff::text,true);
 execute 'set local role authenticated';
 r:=public.universal_qr_action('lookup',code);
 if (r->>'points')::int<>1000 then raise exception 'Lookup failed'; end if;
 r:=public.universal_qr_action('points',code,request,12.80);
 if (r->>'points')::int<>1012 then raise exception 'Points award failed'; end if;
 r:=public.universal_qr_action('points',code,request,12.80);
 if (r->>'points')::int<>1012 then raise exception 'Points retry duplicated'; end if;
 r:=public.universal_qr_action('lookup','DEXTERS_POINTS:'||reward);
 if r->>'category'<>category_name then raise exception 'Category lookup failed'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_POINTS:'||reward,gen_random_uuid());
 if not (r->>'ok')::boolean or (r->>'points')::int<>362 then raise exception 'Points redemption failed'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_POINTS:'||reward,gen_random_uuid());
 if (r->>'ok')::boolean then raise exception 'Points reward reused'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_OFFER:'||offer,gen_random_uuid());
 if not (r->>'ok')::boolean then raise exception 'Offer redemption failed'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_OFFER:'||offer,gen_random_uuid());
 if (r->>'ok')::boolean then raise exception 'Offer reused'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_DEAL:'||deal,gen_random_uuid());
 if not (r->>'ok')::boolean then raise exception 'Deal redemption failed'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_DEAL:'||deal,gen_random_uuid());
 if (r->>'ok')::boolean then raise exception 'Deal reused'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_SPIN:'||spin,gen_random_uuid());
 if not (r->>'ok')::boolean then raise exception 'Spin redemption failed'; end if;
 r:=public.universal_qr_action('redeem','DEXTERS_SPIN:'||spin,gen_random_uuid());
 if (r->>'ok')::boolean then raise exception 'Spin reused'; end if;
 r:=public.universal_qr_action('stamp',code,stamp_request);
 r:=public.universal_qr_action('stamp',code,stamp_request);
 if (r->>'stamps')::int<>1 then raise exception 'Stamp retry duplicated'; end if;
 for n in 2..9 loop
   r:=public.universal_qr_action('stamp',code,gen_random_uuid());
 end loop;
 -- A transaction shares now(); make the ninth fixture event unambiguously latest.
 execute 'reset role';
 update public.loyalty_events_v2 set created_at=clock_timestamp() where customer_id=customer and stamp_after=9;
 perform set_config('request.jwt.claim.sub',customer::text,true);
 execute 'set local role authenticated';
 r:=public.universal_qr_action('wallet');
 select value->>'raw' into coffee from jsonb_array_elements(r->'rewards') where value->>'kind'='coffee';
 if coffee is null then raise exception 'Coffee wallet missing'; end if;
 begin
   perform public.universal_qr_action('lookup',code);
   raise exception 'Customer could access staff action';
 exception when others then
   if sqlerrm<>'Staff access required' then raise; end if;
 end;
 perform set_config('request.jwt.claim.sub',other_customer::text,true);
 r:=public.universal_qr_action('wallet');
 if jsonb_array_length(r->'rewards')<>0 then raise exception 'Wallet ownership failed'; end if;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 r:=public.universal_qr_action('redeem',coffee,gen_random_uuid());
 if not (r->>'ok')::boolean then raise exception 'Coffee redemption failed'; end if;
 r:=public.universal_qr_action('redeem',coffee,gen_random_uuid());
 if (r->>'ok')::boolean then raise exception 'Coffee reused'; end if;
 r:=public.universal_qr_action('lookup',code);
 if (r->>'stamps')::int<>0 then raise exception 'Coffee did not reset'; end if;
 execute 'reset role';
 update public.profiles set staff_permissions='{}' where id=staff;
 execute 'set local role authenticated';
 begin
   perform public.universal_qr_action('stamp',code,gen_random_uuid());
   raise exception 'Restricted staff could add stamp';
 exception when others then
   if sqlerrm not in ('Permission denied','Not authorised') then raise; end if;
 end;
 execute 'reset role';
 execute 'set local role anon';
 begin
   perform public.universal_qr_action('wallet');
   raise exception 'Anonymous wallet access permitted';
 exception when insufficient_privilege then null;
 end;
 execute 'reset role';
end $$;
rollback;
select 'PASS: 21 installed-database assertions; all test fixtures rolled back' as result;
