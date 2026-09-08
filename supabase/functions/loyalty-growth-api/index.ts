import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const txt=(v:any,n=500)=>String(v||'').trim().slice(0,n);
const phone=(v:any)=>txt(v,40).replace(/[^0-9+()\-\s]/g,'');
const staffRank=(r:any)=>({'staff':1,'team leader':2,'manager':3,'admin':4,'super user':4}[String(r||'').toLowerCase()]||0);
const periodKey=()=>new Date().toISOString().slice(0,7);

function validOrders(rows:any[]){
 const cutoff=Date.now()-30*86400000;
 return (rows||[]).filter(o=>o.status==='collected'&&o.collected_at&&new Date(o.collected_at).getTime()>=cutoff&&!(o.items||[]).some((i:any)=>/SYSTEM TEST|DO NOT PREPARE|TEST ITEM/i.test(String(i?.name||''))));
}
function counts(rows:any[]){
 const breakfast=new Set<string>(),subs=new Set<string>(),weekdays=new Set<number>();
 for(const o of validOrders(rows)){
  const items=Array.isArray(o.items)?o.items:[];
  if(items.some((i:any)=>/breakfast/i.test(String(i.category_name||''))))breakfast.add(o.id);
  for(const i of items)if(/street subs/i.test(String(i.category_name||'')))subs.add(String(i.base_name||i.name||'').toLowerCase());
  weekdays.add(new Date(o.collected_at).getDay());
 }
 return {breakfast:breakfast.size,subs:subs.size,weekdays:weekdays.size};
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return J({error:'Method not allowed'},405);
 const auth=req.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))return J({error:'Not authenticated'},401);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user)return J({error:'Invalid session'},401);
 const db=createClient(url,service);
 const [{data:profile},{data:bo}]=await Promise.all([
  db.from('profiles').select('role,full_name,phone').eq('id',user.id).maybeSingle(),
  db.from('backoffice_staff_accounts').select('role,active,must_change_password').eq('auth_user_id',user.id).maybeSingle()
 ]);
 const role=bo?.active&&!bo?.must_change_password?bo.role:(profile?.role||'customer');
 const rank=staffRank(role),isStaff=rank>=1,isManager=rank>=3;
 let b:any={};try{b=await req.json()}catch{return J({error:'Invalid request'},400)}
 const action=txt(b.action,60);
 const {data:settings}=await db.from('loyalty_growth_settings').select('*').eq('id',1).maybeSingle();
 const safeSettings={catering_enabled:!!settings?.catering_enabled,deals_enabled:!!settings?.deals_enabled,challenges_enabled:!!settings?.challenges_enabled,updated_at:settings?.updated_at||null};

 if(action==='status')return J({settings:safeSettings,role});
 if(action==='set_features'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const patch:any={updated_at:new Date().toISOString(),updated_by:user.id};
  for(const k of ['catering_enabled','deals_enabled','challenges_enabled'])if(typeof b[k]==='boolean')patch[k]=b[k];
  const {data,error}=await db.from('loyalty_growth_settings').update(patch).eq('id',1).select('*').single();
  if(error)return J({error:error.message},500);
  if(typeof b.deals_enabled==='boolean'){const {error:dealError}=await db.from('loyalty_deal_settings').update({auto_enabled:b.deals_enabled}).eq('id',1);if(dealError)return J({error:'Growth setting saved, but the monthly meal-deal switch failed: '+dealError.message},500)}
  return J({ok:true,settings:data});
 }
 if(action==='staff_growth_data'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const [{data:catering,error:ce},{data:rules,error:re},{data:rewards,error:rwe},{data:deals,error:de}]=await Promise.all([
   db.from('loyalty_catering_requests').select('*').order('created_at',{ascending:false}).limit(100),
   db.from('loyalty_challenge_rules').select('*').order('sort_order'),
   db.from('loyalty_challenge_rewards').select('*').in('status',['revealed','approved']).order('created_at',{ascending:false}).limit(100),
   db.from('loyalty_personal_deals').select('*').order('created_at',{ascending:false}).limit(100)
  ]);
  if(ce||re||rwe||de)return J({error:(ce||re||rwe||de)?.message},500);
  return J({settings:safeSettings,catering:catering||[],rules:rules||[],challenge_rewards:rewards||[],deals:deals||[]});
 }
 if(action==='customer_lookup'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const q=txt(b.query,160);if(!q)return J({error:'Enter a customer email or 6-digit loyalty code'},400);
  if(/^\d{6}$/.test(q)){const {data,error}=await db.from('profiles').select('id,full_name,loyalty_code').eq('loyalty_code',q).limit(10);if(error)return J({error:error.message},500);return J({customers:data||[]})}
  const wanted=q.toLowerCase(),matched:any[]=[];
  for(let page=1;page<=5&&!matched.length;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:200});if(error)return J({error:error.message},500);const found=(data?.users||[]).filter((x:any)=>String(x.email||'').toLowerCase()===wanted);if(found.length){const ids=found.map((x:any)=>x.id),{data:profiles,error:pe}=await db.from('profiles').select('id,full_name,loyalty_code').in('id',ids);if(pe)return J({error:pe.message},500);const byId=new Map((profiles||[]).map((x:any)=>[x.id,x]));for(const x of found){const p:any=byId.get(x.id);if(p)matched.push({...p,email:x.email})}}if((data?.users||[]).length<200)break}
  return J({customers:matched});
 }
 if(action==='create_catering'){
  if(!safeSettings.catering_enabled)return J({error:'Catering ordering is currently closed.'},409);
  const when=new Date(b.collection_at),people=Math.floor(Number(b.people||0));
  if(!Number.isFinite(when.getTime())||when.getTime()<Date.now()+48*3600000)return J({error:'Catering requires at least 48 hours notice.'},400);
  if(people<1||people>500)return J({error:'Enter between 1 and 500 people.'},400);
  const customerName=txt(b.customer_name||profile?.full_name,120),customerPhone=phone(b.customer_phone||profile?.phone);
  if(!customerName||customerPhone.replace(/\D/g,'').length<7)return J({error:'A customer name and valid phone number are required.'},400);
  const row={customer_id:user.id,customer_name:customerName,customer_phone:customerPhone,event_name:txt(b.event_name,160),people,collection_at:when.toISOString(),package_key:txt(b.package_key,80),package_name:txt(b.package_name,160),dietary_notes:txt(b.dietary_notes,1000)||null,allergy_declaration:txt(b.allergy_declaration,1000)||null,request_data:b.request_data&&typeof b.request_data==='object'?b.request_data:{},estimated_total:Number.isFinite(Number(b.estimated_total))?Number(b.estimated_total):null};
  if(!row.event_name||!row.package_name)return J({error:'Event name and catering package are required.'},400);
  const {data,error}=await db.from('loyalty_catering_requests').insert(row).select('*').single();
  if(error)return J({error:error.message},500);return J({ok:true,request:data});
 }
 if(action==='my_catering'){
  const {data,error}=await db.from('loyalty_catering_requests').select('*').eq('customer_id',user.id).order('created_at',{ascending:false}).limit(20);
  if(error)return J({error:error.message},500);return J({requests:data||[]});
 }
 if(action==='catering_queue'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const {data,error}=await db.from('loyalty_catering_requests').select('*').order('created_at',{ascending:false}).limit(100);
  if(error)return J({error:error.message},500);return J({requests:data||[]});
 }
 if(action==='catering_decide'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const status=txt(b.status,40);if(!['amendment_required','approved','rejected','collected'].includes(status))return J({error:'Invalid catering decision'},400);
  const patch:any={status,staff_note:txt(b.staff_note,1000)||null,handled_by:user.id,updated_at:new Date().toISOString()};
  if(b.quoted_total!==undefined)patch.quoted_total=Math.max(0,Number(b.quoted_total)||0);
  const {data,error}=await db.from('loyalty_catering_requests').update(patch).eq('id',txt(b.id,80)).select('*').maybeSingle();
  if(error)return J({error:error.message},500);if(!data)return J({error:'Catering request not found'},404);return J({ok:true,request:data});
 }
 if(action==='my_challenges'){
  if(!safeSettings.challenges_enabled)return J({enabled:false,rules:[],rewards:[]});
  const [{data:rules,error:re},{data:orders,error:oe},{data:rewards,error:rwe}]=await Promise.all([
   db.from('loyalty_challenge_rules').select('*').eq('active',true).order('sort_order'),
   db.from('collection_orders').select('id,status,collected_at,items').eq('customer_id',user.id).eq('status','collected').gte('collected_at',new Date(Date.now()-30*86400000).toISOString()),
   db.from('loyalty_challenge_rewards').select('*').eq('customer_id',user.id).eq('period_key',periodKey())
  ]);
  if(re||oe||rwe)return J({error:(re||oe||rwe)?.message},500);
  const c=counts(orders||[]),existing=new Map((rewards||[]).map((x:any)=>[x.challenge_key,x]));
  for(const rule of rules||[])if((c as any)[rule.challenge_key]>=rule.target&&!existing.has(rule.challenge_key)){
   const {data}=await db.from('loyalty_challenge_rewards').upsert({customer_id:user.id,challenge_key:rule.challenge_key,period_key:periodKey(),reward_text:rule.reward_text,reward_points:rule.reward_points},{onConflict:'customer_id,challenge_key,period_key'}).select('*').single();if(data)existing.set(rule.challenge_key,data);
  }
  return J({enabled:true,rules:(rules||[]).map((r:any)=>({...r,progress:(c as any)[r.challenge_key]||0,reward:existing.get(r.challenge_key)||null}))});
 }
 if(action==='reveal_challenge'){
  if(!safeSettings.challenges_enabled)return J({error:'Challenges are currently closed.'},409);
  const {data,error}=await db.from('loyalty_challenge_rewards').update({status:'revealed',revealed_at:new Date().toISOString()}).eq('id',txt(b.id,80)).eq('customer_id',user.id).eq('status','earned').select('*').maybeSingle();
  if(error)return J({error:error.message},500);if(!data)return J({error:'No earned challenge reward found'},409);return J({ok:true,reward:data});
 }
 if(action==='challenge_queue'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const {data,error}=await db.from('loyalty_challenge_rewards').select('*').in('status',['revealed','approved']).order('created_at',{ascending:false}).limit(100);
  if(error)return J({error:error.message},500);return J({rewards:data||[]});
 }
 if(action==='challenge_decide'){
  if(!isStaff)return J({error:'Staff access required'},403);
  const status=b.approve?'approved':'rejected';
  const id=txt(b.id,80),{data:pending,error:readError}=await db.from('loyalty_challenge_rewards').select('*').eq('id',id).eq('status','revealed').maybeSingle();
  if(readError)return J({error:readError.message},500);if(!pending)return J({error:'Reward is no longer awaiting approval'},409);
  if(status==='approved'&&pending.reward_points>0){const {error:pe}=await db.rpc('award_loyalty_points_service',{p_user_id:pending.customer_id,p_points:pending.reward_points,p_event_type:'challenge_reward',p_source_id:pending.id,p_order_value:null,p_created_by:user.id,p_note:'Challenge: '+pending.challenge_key});if(pe)return J({error:'Points could not be added: '+pe.message},500)}
  const {data,error}=await db.from('loyalty_challenge_rewards').update({status,decided_at:new Date().toISOString(),decided_by:user.id}).eq('id',id).eq('status','revealed').select('*').maybeSingle();
  if(error)return J({error:error.message},500);if(!data)return J({error:'Reward was handled by another staff member'},409);
  return J({ok:true,reward:data});
 }
 if(action==='save_challenge_rule'){
  if(!isManager)return J({error:'Manager access required'},403);
  const patch={target:Math.max(1,Math.min(100,Number(b.target)||1)),reward_text:txt(b.reward_text,160),reward_points:Math.max(0,Math.min(10000,Number(b.reward_points)||0)),active:b.active!==false,updated_at:new Date().toISOString(),updated_by:user.id};
  const {data,error}=await db.from('loyalty_challenge_rules').update(patch).eq('challenge_key',txt(b.challenge_key,60)).select('*').maybeSingle();
  if(error)return J({error:error.message},500);if(!data)return J({error:'Challenge not found'},404);return J({ok:true,rule:data});
 }
 if(action==='create_personal_deal'){
  if(!isStaff)return J({error:'Staff access required'},403);if(!safeSettings.deals_enabled)return J({error:'Deals are currently closed.'},409);
  const customerId=txt(b.customer_id,80),expires=new Date(b.expires_at);if(!customerId||!Number.isFinite(expires.getTime())||expires.getTime()<=Date.now())return J({error:'Customer and future expiry are required.'},400);
  const row={customer_id:customerId,title:txt(b.title,160),offer_text:txt(b.offer_text,500),reason:txt(b.reason,500)||null,deal_type:txt(b.deal_type,60)||'staff_offer',discount_pence:Math.max(0,Number(b.discount_pence)||0),minimum_spend_pence:Math.max(0,Number(b.minimum_spend_pence)||0),bonus_points:Math.max(0,Number(b.bonus_points)||0),status:'sent',expires_at:expires.toISOString(),approved_by:user.id,sent_at:new Date().toISOString()};
  if(!row.title||!row.offer_text)return J({error:'Deal title and offer are required.'},400);
  const {data,error}=await db.from('loyalty_personal_deals').insert(row).select('*').single();if(error)return J({error:error.message},500);return J({ok:true,deal:data});
 }
 if(action==='my_personal_deals'){
  if(!safeSettings.deals_enabled)return J({enabled:false,deals:[]});
  const {data,error}=await db.from('loyalty_personal_deals').select('*').eq('customer_id',user.id).eq('status','sent').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});
  if(error)return J({error:error.message},500);return J({enabled:true,deals:data||[]});
 }
 return J({error:'Unknown action'},400);
});
