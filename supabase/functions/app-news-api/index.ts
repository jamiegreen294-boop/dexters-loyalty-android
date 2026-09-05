import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  let body:any={};
  try{ body=await req.json(); }catch{ return J({error:'Invalid request'},400); }
  const action=String(body.action||'current');
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db=createClient(url,service);

  if(action==='current'){
    const {data,error}=await db.from('app_news_banner').select('message,active,updated_at').eq('id',1).single();
    if(error) return J({error:'News unavailable'},500);
    return J({message:data?.message||'',active:!!data?.active,updated_at:data?.updated_at||null});
  }

  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer ')) return J({error:'Not authenticated'},401);
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await uc.auth.getUser();
  if(!user) return J({error:'Invalid session'},401);
  const {data:p}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(!p||!['admin','manager','staff'].includes(String(p.role||''))) return J({error:'Staff access required'},403);

  if(action==='save'){
    const message=String(body.message||'').trim().slice(0,500);
    const active=body.active===true;
    if(active&&!message) return J({error:'Enter a news message before publishing'},400);
    const {data,error}=await db.from('app_news_banner').update({message,active,updated_by:user.id}).eq('id',1).select('message,active,updated_at').single();
    if(error) return J({error:'Could not save news banner'},500);
    return J({ok:true,...data});
  }

  if(action==='unpublish'){
    const {data,error}=await db.from('app_news_banner').update({active:false,updated_by:user.id}).eq('id',1).select('message,active,updated_at').single();
    if(error) return J({error:'Could not hide news banner'},500);
    return J({ok:true,...data});
  }

  return J({error:'Unknown action'},400);
});
