import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return J({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return J({error:'Not authenticated'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await uc.auth.getUser();
  if(!user)return J({error:'Invalid session'},401);
  const db=createClient(url,service);
  const {data:p}=await db.from('profiles').select('role,staff_permissions').eq('id',user.id).single();
  const admin=p?.role==='admin',staff=p?.role==='staff';
  let b:any={};try{b=await req.json()}catch{return J({error:'Invalid request'},400)}
  const a=String(b.action||'');

  if(a==='customers'){
    if(!admin)return J({error:'Admin access required'},403);
    const {data:ps,error}=await db.from('profiles').select('id,full_name,phone,loyalty_code,created_at').eq('role','customer').order('full_name');
    if(error)return J({error:error.message},500);
    const ids=(ps||[]).map((x:any)=>x.id);
    let loyalty:any[]=[],points:any[]=[];
    if(ids.length){
      const [lq,pq]=await Promise.all([
        db.from('loyalty_accounts').select('user_id,stamps,reward_ready').in('user_id',ids),
        db.from('loyalty_points_accounts').select('user_id,points').in('user_id',ids)
      ]);
      if(lq.error)return J({error:lq.error.message},500);
      if(pq.error)return J({error:pq.error.message},500);
      loyalty=lq.data||[];points=pq.data||[];
    }
    const authMap=new Map<string,any>();
    for(let page=1;page<=10;page++){
      const {data:ud,error:ue}=await db.auth.admin.listUsers({page,perPage:1000});
      if(ue)return J({error:'Could not load customer activity'},500);
      for(const u of ud.users||[])authMap.set(u.id,u);
      if((ud.users||[]).length<1000)break;
    }
    const lm=new Map(loyalty.map((x:any)=>[x.user_id,x]));
    const pm=new Map(points.map((x:any)=>[x.user_id,x]));
    return J({customers:(ps||[]).map((x:any)=>{
      const au=authMap.get(x.id);
      return {...x,stamps:lm.get(x.id)?.stamps||0,reward_ready:!!lm.get(x.id)?.reward_ready,points:pm.get(x.id)?.points||0,last_active:au?.last_sign_in_at||au?.created_at||x.created_at||null};
    })});
  }

  if(a==='delete_customer'){
    if(!admin)return J({error:'Admin access required'},403);
    if(b.confirm!==true)return J({error:'Deletion confirmation required'},400);
    const customer_id=String(b.customer_id||'');
    let minDays=Math.floor(Number(b.min_inactive_days||365));
    if(!customer_id)return J({error:'Customer is required'},400);
    if(!Number.isFinite(minDays)||minDays<90)minDays=90;
    if(minDays>3650)minDays=3650;
    const {data:cp,error:pe}=await db.from('profiles').select('id,role,full_name,loyalty_code').eq('id',customer_id).maybeSingle();
    if(pe)return J({error:pe.message},500);
    if(!cp||cp.role!=='customer')return J({error:'Customer account not found'},404);
    const {data:ud,error:ue}=await db.auth.admin.getUserById(customer_id);
    if(ue||!ud?.user)return J({error:'Customer login account not found'},404);
    const activeAt=ud.user.last_sign_in_at||ud.user.created_at;
    const activeTime=new Date(activeAt).getTime();
    if(!activeAt||!Number.isFinite(activeTime))return J({error:'Cannot verify customer inactivity; account was not deleted'},409);
    const inactiveDays=Math.max(0,Math.floor((Date.now()-activeTime)/86400000));
    if(inactiveDays<minDays)return J({error:`Customer has only been inactive for ${inactiveDays} days`,inactive_days:inactiveDays},409);
    const {error:de}=await db.auth.admin.deleteUser(customer_id);
    if(de)return J({error:'Could not delete customer account'},500);
    return J({ok:true,deleted_id:customer_id,inactive_days:inactiveDays});
  }

  if(a==='create'){
    if(!admin)return J({error:'Admin access required'},403);
    const title=String(b.title||'').trim(),customer_id=String(b.customer_id||'');
    if(!title||!customer_id)return J({error:'Customer and offer are required'},400);
    const {data,error}=await db.from('customer_individual_offers').insert({customer_id,title,offer_type:String(b.offer_type||'custom'),reward_value:String(b.reward_value||'').trim()||null,staff_instructions:String(b.staff_instructions||'').trim()||null,expires_at:b.expires_at||null,created_by:user.id}).select().single();
    if(error)return J({error:error.message},500);return J({ok:true,offer:data});
  }
  if(a==='customer_offers'){
    const cid=admin&&b.customer_id?String(b.customer_id):user.id;
    if(!admin&&cid!==user.id)return J({error:'Not allowed'},403);
    const {data,error}=await db.from('customer_individual_offers').select('*').eq('customer_id',cid).order('created_at',{ascending:false});
    if(error)return J({error:error.message},500);return J({offers:data||[]});
  }
  if(a==='offer_details'){
    if(!admin&&!staff)return J({error:'Staff access required'},403);
    const id=String(b.id||'');const {data:o,error}=await db.from('customer_individual_offers').select('*').eq('id',id).single();
    if(error||!o)return J({error:'Offer not found'},404);if(o.status!=='active')return J({error:'Offer has already been used or cancelled'},400);
    if(o.expires_at&&new Date(o.expires_at).getTime()<Date.now())return J({error:'Offer has expired'},400);
    const {data:c}=await db.from('profiles').select('id,full_name,loyalty_code').eq('id',o.customer_id).single();return J({offer:o,customer:c});
  }
  if(a==='redeem'){
    if(!admin&&!staff)return J({error:'Staff access required'},403);
    const id=String(b.id||'');const {data:o}=await db.from('customer_individual_offers').select('*').eq('id',id).single();if(!o)return J({error:'Offer not found'},404);
    if(o.status!=='active')return J({error:'Offer has already been used or cancelled'},400);if(o.expires_at&&new Date(o.expires_at).getTime()<Date.now())return J({error:'Offer has expired'},400);
    const {data,error}=await db.from('customer_individual_offers').update({status:'redeemed',redeemed_at:new Date().toISOString(),redeemed_by:user.id}).eq('id',id).eq('status','active').select('id');
    if(error)return J({error:error.message},500);if(!data?.length)return J({error:'Offer has already been redeemed'},409);return J({ok:true});
  }
  return J({error:'Unknown action'},400);
});
