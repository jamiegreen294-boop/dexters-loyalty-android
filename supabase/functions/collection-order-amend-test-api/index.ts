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
    const {data,error}=await db.from('collection_daily_outages').select('menu_item_id,created_at').eq('outage_date',today).is('restored_at',null);
    if(error)return J({error:error.message},500);
    const rows=data||[],itemIds=rows.map((x:any)=>String(x.menu_item_id));
    if(!staff)return J({item_ids:itemIds,date:today});
    let menu:any[]=[];
    if(itemIds.length){
      const {data:m,error:me}=await db.from('loyalty_menu_items').select('id,name,category_id').in('id',itemIds);
      if(me)return J({error:me.message},500);
      menu=m||[];
    }
    const categoryIds=[...new Set(menu.map((x:any)=>x.category_id).filter(Boolean))];
    let categories:any[]=[];
    if(categoryIds.length){
      const {data:cc,error:ce}=await db.from('loyalty_menu_categories').select('id,name').in('id',categoryIds);
      if(ce)return J({error:ce.message},500);
      categories=cc||[];
    }
    const categoryById=new Map(categories.map((x:any)=>[String(x.id),String(x.name)]));
    const createdById=new Map(rows.map((x:any)=>[String(x.menu_item_id),x.created_at]));
    const items=menu.map((x:any)=>({id:String(x.id),name:String(x.name),category_name:categoryById.get(String(x.category_id))||'',created_at:createdById.get(String(x.id))||null}));
    return J({item_ids:itemIds,items,date:today});
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
    const {data:groups,error:ge}=await db.from('loyalty_modifier_test_groups').select('id,menu_item_id,name,selection_type,required,min_select,max_select,sort_order,active').in('menu_item_id',ids).eq('active',true);
    if(ge)return J({error:'Could not validate menu choices.'},500);
    const groupIds=(groups||[]).map((g:any)=>g.id);
    let opts:any[]=[];
    if(groupIds.length){
      const {data,error}=await db.from('loyalty_modifier_test_options').select('id,group_id,name,price_delta,sort_order,active').in('group_id',groupIds).eq('active',true);
      if(error)return J({error:'Could not validate menu choices.'},500);
      opts=data||[];
    }
    const groupsByItem=new Map<string,any[]>();
    for(const g of(groups||[])){const arr=groupsByItem.get(String(g.menu_item_id))||[];arr.push(g);groupsByItem.set(String(g.menu_item_id),arr)}
    const optsByGroup=new Map<string,any[]>();
    for(const op of opts){const arr=optsByGroup.get(String(op.group_id))||[];arr.push(op);optsByGroup.set(String(op.group_id),arr)}
    const blocked=new Set((outages||[]).map((x:any)=>String(x.menu_item_id)));
    const byId=new Map((menu||[]).map((x:any)=>[String(x.id),x]));
    const unavailable:string[]=[];
    const clean:any[]=[];
    for(const x of requested.slice(0,40)){
      const m:any=byId.get(String(x.id||''));
      if(!m||!m.active||!m.in_stock||blocked.has(String(m.id))){unavailable.push(m?.name||String(x.name||'Item'));continue}
      const selectedByGroup=new Map<string,string[]>();
      for(const rm of (Array.isArray(x.modifiers)?x.modifiers:[])){
        const gid=String(rm?.group_id||''), optionIds=Array.isArray(rm?.option_ids)?rm.option_ids.map((z:any)=>String(z)):[];
        if(gid)selectedByGroup.set(gid,optionIds);
      }
      const modifierSummary:string[]=[];
      let modifierTotal=0;
      for(const g of (groupsByItem.get(String(m.id))||[]).sort((p:any,q:any)=>Number(p.sort_order)-Number(q.sort_order))){
        const allowed=(optsByGroup.get(String(g.id))||[]).sort((p:any,q:any)=>Number(p.sort_order)-Number(q.sort_order));
        const allowedMap=new Map(allowed.map((op:any)=>[String(op.id),op]));
        const chosenRaw=selectedByGroup.get(String(g.id))||[];
        const chosen=[...new Set(chosenRaw)].map((oid:any)=>allowedMap.get(String(oid))).filter(Boolean) as any[];
        const min=Math.max(0,Number(g.min_select)||0),max=g.max_select==null?999:Math.max(0,Number(g.max_select)||0);
        if((g.required||min>0)&&chosen.length<Math.max(1,min))return J({error:'Please choose '+g.name+' for '+m.name+'.'},400);
        if(chosen.length>max)return J({error:'Too many choices selected for '+g.name+'.'},400);
        if(g.selection_type==='single'&&chosen.length>1)return J({error:'Choose only one option for '+g.name+'.'},400);
        if(chosen.length){
          modifierSummary.push(g.name+': '+chosen.map((op:any)=>op.name).join(', '));
          modifierTotal+=chosen.reduce((n:number,op:any)=>n+Number(op.price_delta||0),0);
        }
      }
      clean.push({id:m.id,base_name:m.name,category_id:m.category_id,category_name:String(x.category_name||''),name:m.name,price:m.price_text,qty:cleanQty(x.qty),removed:Array.isArray(x.removed)?x.removed.slice(0,14):[],modifiers:modifierSummary,modifier_total:Number(modifierTotal.toFixed(2))});
    }
    if(unavailable.length)return J({error:'Still unavailable: '+[...new Set(unavailable)].join(', '),out_of_stock:[...new Set(unavailable)]},409);
    const patch={items:clean,status:'amended',amended_at:new Date().toISOString(),amendment_items:null,amendment_note:null,updated_at:new Date().toISOString()};
    const {data,error}=await db.from('collection_orders').update(patch).eq('id',id).eq('customer_id',user.id).select('*').single();
    if(error)return J({error:error.message},500);
    return J({ok:true,order:data});
  }

  return J({error:'Unknown action'},400);
});
