import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const enc=new TextEncoder();
async function hash(value:string){
  const bytes=await crypto.subtle.digest('SHA-256',enc.encode(value));
  return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function randomDigits(){
  const a=new Uint32Array(1);crypto.getRandomValues(a);
  return String(100000+(a[0]%900000));
}
function randomToken(){
  const a=new Uint8Array(32);crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
async function staff(req:Request){
  const auth=req.headers.get('authorization')||'';
  const token=auth.replace(/^Bearer\s+/i,'');
  if(!token)throw new Error('AUTH_REQUIRED');
  const {data,error}=await service.auth.getUser(token);
  if(error||!data.user)throw new Error('AUTH_REQUIRED');
  const {data:profile}=await service.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
  if(!profile||!['staff','manager','admin'].includes(String(profile.role||'')))throw new Error('STAFF_REQUIRED');
  return data.user;
}
async function createPair(req:Request){
  const user=await staff(req);
  await service.from('pc_pos_scanner_pairs_test').update({enabled:false}).eq('pos_user_id',user.id).eq('enabled',true);
  for(let n=0;n<5;n++){
    const code=randomDigits(),pair_code_hash=await hash(code);
    const {data,error}=await service.from('pc_pos_scanner_pairs_test').insert({pair_code_hash,pos_user_id:user.id,expires_at:new Date(Date.now()+10*60*1000).toISOString()}).select('id,expires_at').single();
    if(!error)return reply({ok:true,pair_id:data.id,pair_code:code,expires_at:data.expires_at});
  }
  throw new Error('Could not create pairing code');
}
async function claimPair(body:any){
  const code=String(body.pair_code||'').replace(/\D/g,'');
  if(code.length!==6)return reply({error:'Enter the 6-digit pairing code'},400);
  const codeHash=await hash(code);
  const {data:pair}=await service.from('pc_pos_scanner_pairs_test').select('id,expires_at,enabled,paired_at').eq('pair_code_hash',codeHash).maybeSingle();
  if(!pair||!pair.enabled||pair.paired_at||new Date(pair.expires_at).getTime()<Date.now())return reply({error:'Pairing code is invalid or expired'},403);
  const token=randomToken();
  const {data:claimed,error}=await service.from('pc_pos_scanner_pairs_test').update({scanner_token_hash:await hash(token),paired_at:new Date().toISOString(),last_seen_at:new Date().toISOString()}).eq('id',pair.id).is('paired_at',null).select('id').maybeSingle();
  if(error||!claimed)return reply({error:'Pairing code has already been used'},409);
  return reply({ok:true,scanner_token:token,pair_id:pair.id,device_label:'Foodhub 1008'});
}
async function sendScan(body:any){
  const token=String(body.scanner_token||'');
  const value=String(body.value||'').trim().slice(0,500);
  const type=['product','loyalty'].includes(String(body.type))?String(body.type):'auto';
  if(token.length<20||!value)return reply({error:'Scanner pairing or scan value missing'},400);
  const {data:pair}=await service.from('pc_pos_scanner_pairs_test').select('id,enabled').eq('scanner_token_hash',await hash(token)).maybeSingle();
  if(!pair?.enabled)return reply({error:'Scanner is not paired'},403);
  const {data,error}=await service.from('pc_pos_scan_events_test').insert({pair_id:pair.id,scan_type:type,scan_value:value}).select('id,created_at').single();
  if(error)throw error;
  await service.from('pc_pos_scanner_pairs_test').update({last_seen_at:new Date().toISOString()}).eq('id',pair.id);
  return reply({ok:true,id:data.id,created_at:data.created_at});
}
async function nextScans(req:Request,body:any){
  const user=await staff(req);
  const pairId=String(body.pair_id||'');
  const after=Math.max(0,Number(body.after)||0);
  const {data:pair}=await service.from('pc_pos_scanner_pairs_test').select('id,enabled,paired_at,last_seen_at').eq('id',pairId).eq('pos_user_id',user.id).maybeSingle();
  if(!pair?.enabled)return reply({error:'Scanner pairing not found'},404);
  const {data,error}=await service.from('pc_pos_scan_events_test').select('id,scan_type,scan_value,created_at').eq('pair_id',pair.id).gt('id',after).order('id').limit(25);
  if(error)throw error;
  return reply({ok:true,paired:!!pair.paired_at,last_seen_at:pair.last_seen_at,items:(data||[]).map(x=>({id:x.id,type:x.scan_type,value:x.scan_value,created_at:x.created_at}))});
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  try{
    const body=await req.json().catch(()=>({}));
    if(body.action==='create_pair')return await createPair(req);
    if(body.action==='claim_pair')return await claimPair(body);
    if(body.action==='send_scan')return await sendScan(body);
    if(body.action==='next_scans')return await nextScans(req,body);
    return reply({error:'Unknown scanner action'},400);
  }catch(e){
    const message=String((e as Error)?.message||e);
    if(message==='AUTH_REQUIRED')return reply({error:'POS sign-in required'},401);
    if(message==='STAFF_REQUIRED')return reply({error:'Staff access required'},403);
    return reply({error:message},500);
  }
});
