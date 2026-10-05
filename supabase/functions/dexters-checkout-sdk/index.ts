import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { matchesRequest, finalStatus } from './validation.ts';

const U = Deno.env.get('SUPABASE_URL') || '';
const db = createClient(U, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {auth:{persistSession:false,autoRefreshToken:false}});
const APP_ID = 'sq0idp-D5GMRNfD6MorTLnfto8e8A';
const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const J = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
class HttpError extends Error { constructor(public status:number,message:string){super(message)} }
async function staff(req:Request) {
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw new HttpError(401,'Staff sign-in required');
  const {data:p,error:pe}=await db.from('profiles').select('id,role').eq('id',data.user.id).maybeSingle();
  if(pe||!p||!['staff','manager','admin'].includes(String(p.role).toLowerCase()))throw new HttpError(403,'Staff access required');
  return data.user.id;
}
async function sq(path:string,token:string,body?:unknown){
  const response=await fetch('https://connect.squareup.com'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Square-Version':'2026-09-16','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const value=await response.json();
  if(!response.ok)throw new HttpError(502,'Square verification unavailable. Payment needs review.');
  return value;
}
async function configuration(){
  // Deliberately never use the existing personal SQUARE_ACCESS_TOKEN in a mobile app.
  const token=Deno.env.get('SQUARE_MOBILE_OAUTH_TOKEN')||'';
  const location=Deno.env.get('SQUARE_MOBILE_LOCATION_ID')||'';
  if(!token||!location)throw new HttpError(503,'Square SDK merchant authorisation still needs connecting.');
  const status=await sq('/oauth2/token/status',token,{});
  if(status.client_id!==APP_ID||!status.expires_at||Date.parse(status.expires_at)<Date.now()+300000)throw new HttpError(503,'Square SDK OAuth authorisation needs updating.');
  const allowed=status.scopes||[];
  if(!allowed.includes('PAYMENTS_READ')||!allowed.includes('PAYMENTS_WRITE_IN_PERSON'))throw new HttpError(503,'Square SDK payment permissions need updating.');
  const {location:loc}=await sq('/v2/locations/'+encodeURIComponent(location),token);
  if(loc?.merchant_id!==status.merchant_id||loc?.currency!=='GBP'||loc?.status!=='ACTIVE')throw new HttpError(503,'Square SDK location is not ready for GBP payments.');
  return {token,location};
}
async function ownedRequest(id:string,user:string){
  const {data,error}=await db.from('pc_pos_square_requests').select('*').eq('id',id).eq('claimed_by',user).maybeSingle();
  if(error)throw error;if(!data)throw new HttpError(404,'Payment request is not owned by this checkout');return data;
}
async function storeResult(request:any,body:any,config:any){
  const approved=body.approved===true;
  const status=finalStatus(body);
  const paymentId=String(body.payment_id||'');
  if(approved){
    if(!paymentId)throw new HttpError(400,'Square payment ID required');
    const {payment}=await sq('/v2/payments/'+encodeURIComponent(paymentId),config.token);
    if(!matchesRequest(payment,request,config.location))throw new HttpError(409,'Square payment does not match this till request');
    const {data:duplicate,error:de}=await db.from('pc_pos_square_requests').select('id').eq('transaction_id',paymentId).neq('id',request.id).limit(1);
    if(de)throw de;if(duplicate?.length)throw new HttpError(409,'Square payment is already attached to another request');
    if(request.status==='approved'){
      if(request.transaction_id!==paymentId)throw new HttpError(409,'A different payment is already recorded');
      return request;
    }
  } else if(['approved','cancelled','failed'].includes(request.status))return request;
  const {data,error}=await db.from('pc_pos_square_requests').update({status,transaction_id:approved?paymentId:null,error_code:approved?null:String(body.error_code||'failed').slice(0,120),error_message:approved?null:String(body.error_message||'Payment not completed').slice(0,500),completed_at:new Date().toISOString()}).eq('id',request.id).eq('claimed_by',request.claimed_by).in('status',approved?['processing','expired']:['processing']).select('id,status,transaction_id').maybeSingle();
  if(error)throw error;if(!data)throw new HttpError(409,'Payment state changed; review the result');return data;
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return J({error:'POST required'},405);
  try {
    const user=await staff(req);
    const body=await req.json();
    const action=String(body.action||'');
    const config=await configuration();
    if(action==='configure')return J({ok:true,application_id:APP_ID,location_id:config.location,access_token:config.token});
    if(action==='next'){
      if(Deno.env.get('DEXTERS_CHECKOUT_SDK_ENABLED')!=='YES')return J({ok:true,request:null,enabled:false});
      const {data:rows,error}=await db.from('pc_pos_square_requests').select('id,amount_pence,reference,expires_at').eq('status','pending').gt('expires_at',new Date().toISOString()).order('created_at').limit(1);
      if(error)throw error;const row=rows?.[0];if(!row)return J({ok:true,request:null});
      const {data:claimed,error:ce}=await db.from('pc_pos_square_requests').update({status:'processing',claimed_by:user,claimed_at:new Date().toISOString()}).eq('id',row.id).eq('status','pending').select('id,amount_pence,reference,status').maybeSingle();
      if(ce)throw ce;return J({ok:true,request:claimed});
    }
    if(action==='result')return J({ok:true,request:await storeResult(await ownedRequest(String(body.id||''),user),body,config)});
    if(action==='recover'){
      const request=await ownedRequest(String(body.id||''),user);
      if(request.status==='approved'&&request.transaction_id)return J({ok:true,result:{approved:true,payment_id:request.transaction_id}});
      if(['failed','cancelled'].includes(request.status))return J({ok:true,result:{approved:false,error_code:request.error_code,error_message:request.error_message}});
      // Search a bounded payment window. Absence never authorises an automatic second charge.
      const begin=new Date(Date.parse(request.claimed_at||request.created_at)-60000).toISOString();
      let cursor='',hits:any[]=[];
      for(let page=0;page<5;page++){
        const q=new URLSearchParams({location_id:config.location,begin_time:begin,limit:'100',sort_order:'ASC'});if(cursor)q.set('cursor',cursor);
        const response=await sq('/v2/payments?'+q,config.token);
        hits.push(...(response.payments||[]).filter((p:any)=>matchesRequest(p,request,config.location)));
        cursor=response.cursor||'';if(!cursor)break;
      }
      if(hits.length!==1)return J({ok:true,result:null,review_required:true});
      return J({ok:true,result:{approved:true,payment_id:hits[0].id}});
    }
    throw new HttpError(400,'Unknown action');
  } catch(e){return J({error:e instanceof HttpError?e.message:'Checkout connection unavailable. Retry or review the payment.'},e instanceof HttpError?e.status:500)}
});
