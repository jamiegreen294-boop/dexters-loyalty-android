import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

function londonDate(){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v=(t:string)=>p.find(x=>x.type===t)?.value||'';
  return v('year')+'-'+v('month')+'-'+v('day');
}
const cleanQty=(v:any)=>Math.max(1,Math.min(20,Number(v)||1));

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return J({error:'Not authenticated'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await uc.auth.getUser();
  if(!user)return J({error:'Invalid session'},401);
  const db=createClient(url,service);
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  const role=profile?.role||'customer',staff=role==='staff'||role==='admin';
  let b:any={};try{b=await req.json()}catch{return J({error:'Invalid request'},400)}
  const action=String(b.action||''),today=londonDate();

  if(action==='daily_outages'){
    const {data,error}=await db.from('collection_daily_outages').select('menu_item_id').eq('outage_date',today).is('restored_at',null);
    if(error)return J({error:error.message},500);
    return J({item_ids:(data||[]).map((x:any)=>x.menu_item_id),date:today});
  }

  if(action==='staff_order_items'){
    if(!staff)return J({error:'Staff access required'},403);
    const id=String(b.id||'');
    if(!id)return J({error:'Order required'},400);
    const {data:o,error}=await db.from('collection_orders').select('id,order_number,status,items').eq('id',id).single();
    if(error||!o)return J({error:'Order not found'},404);
    const items=(Array.isArray(o.items)?o.items:[]).map((x:any)=>({
      id:String(x.id||''),
      name:String(x.base_name||x.name||'Item'),
      category_name:String(x.category_name||''),
      qty:cleanQty(x.qty)
    })).filter((x:any)=>x.id);
    return J({order:{id:o.id,order_number:o.order_number,status:o.status},items});
  }

  if(action==='request_amendment'){
    if(!staff)return J({error:'Staff access required'},403);
    const id=String(b.id||''),ids=[...new Set((Array.isArray(b.item_ids)?b.item_ids:[]).map(String).filter(Boolean))];
    if(!id||!ids.length)return J({error:'Select at least one unavailable item.'},400);
    const {data:o}=await db.from('collection_orders').select('*').eq('id',id).single();
    if(!o)return J({error:'Order not found'},404);
    if(!['pending','amended'].includes(String(o.status)))return J({error:'Order is no longer awaiting a stock decision.'},409);
    const ordered=new Set((Array.isArray(o.items)?o.items:[]).map((x:any)=>String(x.id||'')));
    const bad=ids.filter(x=>!ordered.has(x));
    if(bad.length)return J({error:'Unavailable items must belong to this order.'},400);
    const outageRows=ids.map(menu_item_id=>({menu_item_id,outage_date:today,marked_by:user.id,restored_at:null}));
    for(const row of outageRows){
      const {data:existing}=await db.from('collection_daily_outages').select('id').eq('menu_item_id',row.menu_item_id).eq('outage_date',today).is('restored_at',null).maybeSingle();
      if(!existing){const {error}=await db.from('collection_daily_outages').insert(row);if(error)return J({error:error.message},500)}
    }
    const note=String(b.note||'Sorry, you need to amend your order. One or more items are unavailable today.').slice(0,500);
    const patch={status:'amendment_required',amendment_items:ids,amendment_note:note,amendment_requested_at:new Date().toISOString(),updated_at:new Date().toISOString(),handled_by:user.id,amendment_count:Number(o.amendment_count||0)+1};
    const {data,error}=await db.from('collection_orders').update(patch).eq('id',id).select('*').single();
    if(error)return J({error:error.message},500);
    return J({ok:true,order:data});
  }

  if(action==='restore_daily_stock'){
    if(!staff)return J({error:'Staff access required'},403);
    const menuItemId=String(b.menu_item_id||'');
    if(!menuItemId)return J({error:'Item required'},400);
    const {error}=await db.from('collection_daily_outages').update({restored_at:new Date().toISOString()}).eq('menu_item_id',menuItemId).eq('outage_date',today).is('restored_at',null);
    if(error)return J({error:error.message},500);
    return J({ok:true});
  }

  if(action==='submit_amendment'){
    const id=String(b.id||''),requested=Array.isArray(b.items)?b.items:[];
    if(!id||!requested.length)return J({error:'Your amended order needs at least one item.'},400);
    const {data:o}=await db.from('collection_orders').select('*').eq('id',id).eq('customer_id',user.id).single();
    if(!o)return J({error:'Order not found'},404);
    if(o.status!=='amendment_required')return J({error:'This order is not waiting for an amendment.'},409);
    const ids=[...new Set(requested.map((x:any)=>String(x.id||'')).filter(Boolean))];
    const {data:menu,error:me}=await db.from('loyalty_menu_items').select('id,name,category_id,price_text,active,in_stock').in('id',ids);
    if(me)return J({error:me.message},500);
    const {data:outages,error:oe}=await db.from('collection_daily_outages').select('menu_item_id').in('menu_item_id',ids).eq('outage_date',today).is('restored_at',null);
    if(oe)return J({error:oe.message},500);
    const blocked=new Set((outages||[]).map((x:any)=>String(x.menu_item_id)));
    const byId=new Map((menu||[]).map((x:any)=>[String(x.id),x]));
    const unavailable:string[]=[];
    const clean=requested.slice(0,40).map((x:any)=>{
      const m:any=byId.get(String(x.id||''));
      if(!m||!m.active||!m.in_stock||blocked.has(String(m.id))){unavailable.push(m?.name||String(x.name||'Item'));return null}
      return {id:m.id,base_name:m.name,category_id:m.category_id,category_name:String(x.category_name||''),name:String(x.name||m.name).slice(0,300),price:m.price_text,qty:cleanQty(x.qty),removed:Array.isArray(x.removed)?x.removed.slice(0,14):[],modifiers:Array.isArray(x.modifiers)?x.modifiers.slice(0,20):[],modifier_total:Number(x.modifier_total||0)};
    }).filter(Boolean);
    if(unavailable.length)return J({error:'Still unavailable: '+[...new Set(unavailable)].join(', '),out_of_stock:[...new Set(unavailable)]},409);
    const patch={items:clean,status:'amended',amended_at:new Date().toISOString(),amendment_items:null,amendment_note:null,updated_at:new Date().toISOString()};
    const {data,error}=await db.from('collection_orders').update(patch).eq('id',id).eq('customer_id',user.id).select('*').single();
    if(error)return J({error:error.message},500);
    return J({ok:true,order:data});
  }

  return J({error:'Unknown action'},400);
});
