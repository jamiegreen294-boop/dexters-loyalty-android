import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,"Content-Type":"application/json"}
});
const pricePence=(v:any)=>{
  const n=Number(String(v??"").replace(/[^0-9.]/g,""));
  return Number.isFinite(n)?Math.round(n*100):0;
};
const refCode=()=>crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase();

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return J({error:"Method not allowed"},405);

  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) return J({error:"Not authenticated"},401);

  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user) return J({error:"Invalid session"},401);

  const db=createClient(url,service);
  const {data:profile}=await db.from("profiles")
    .select("role,full_name,loyalty_code").eq("id",user.id).single();
  const role=profile?.role||"customer";
  const isStaff=role==="staff"||role==="manager"||role==="admin";

  let body:any={};
  try{body=await req.json()}catch{return J({error:"Invalid request"},400)}
  const action=String(body.action||"me");

  async function menuRewards(points:number){
    const [{data:cats,error:ce},{data:items,error:ie}]=await Promise.all([
      db.from("loyalty_menu_categories").select("id,name,sort_order").eq("active",true),
      db.from("loyalty_menu_items").select("id,category_id,name,price_text,sort_order")
        .eq("active",true).eq("in_stock",true)
    ]);
    if(ce||ie) throw new Error(ce?.message||ie?.message||"Menu unavailable");
    const cm=new Map((cats||[]).map((c:any)=>[c.id,c.name]));
    const rewards=(items||[]).map((i:any)=>({
      id:i.id,name:i.name,category:String(cm.get(i.category_id)||"Menu"),
      price_text:i.price_text,points_required:pricePence(i.price_text)
    })).filter((x:any)=>x.points_required>0)
      .sort((a:any,b:any)=>a.points_required-b.points_required||a.name.localeCompare(b.name));
    return {
      available:rewards.filter((x:any)=>x.points_required<=points),
      next:rewards.find((x:any)=>x.points_required>points)||null
    };
  }

  if(action==="me"){
    const {data:acct}=await db.from("loyalty_points_accounts")
      .select("points,updated_at").eq("user_id",user.id).maybeSingle();
    const points=Math.max(0,Number(acct?.points||0));
    let rewardData:any={available:[],next:null};
    try{rewardData=await menuRewards(points)}catch{}
    const {data:pending}=await db.from("loyalty_points_redemptions")
      .select("id,item_id,item_name,category_name,points_cost,reference_code,status,requested_at")
      .eq("user_id",user.id).eq("status","pending").maybeSingle();
    return J({
      points,value_pence:points,value_gbp:(points/100).toFixed(2),
      updated_at:acct?.updated_at||null,rewards:rewardData.available,
      next_reward:rewardData.next,pending_redemption:pending||null
    });
  }

  if(action==="redeem_request"){
    if(isStaff) return J({error:"Use a customer account to request a reward"},400);
    const itemId=String(body.item_id||"");
    if(!itemId) return J({error:"Choose an item"},400);

    const {data:item,error:ie}=await db.from("loyalty_menu_items")
      .select("id,category_id,name,price_text,active,in_stock")
      .eq("id",itemId).single();
    if(ie||!item||!item.active||!item.in_stock) return J({error:"Reward item is not available"},400);

    const cost=pricePence(item.price_text);
    if(cost<1) return J({error:"Reward item has no valid points value"},400);

    const {data:acct}=await db.from("loyalty_points_accounts")
      .select("points").eq("user_id",user.id).maybeSingle();
    const points=Number(acct?.points||0);
    if(points<cost) return J({error:"You do not have enough points for this item"},400);

    const {data:existing}=await db.from("loyalty_points_redemptions")
      .select("id,item_name,category_name,points_cost,reference_code,status,requested_at")
      .eq("user_id",user.id).eq("status","pending").maybeSingle();
    if(existing) return J({error:"You already have a redemption waiting for staff confirmation",pending_redemption:existing},409);

    const {data:cat}=await db.from("loyalty_menu_categories")
      .select("name").eq("id",item.category_id).single();

    let created:any=null, err:any=null;
    for(let tries=0;tries<3&&!created;tries++){
      const code=refCode();
      const res=await db.from("loyalty_points_redemptions").insert({
        user_id:user.id,item_id:item.id,item_name:item.name,
        category_name:String(cat?.name||"Menu"),points_cost:cost,
        reference_code:code,status:"pending"
      }).select("id,item_name,category_name,points_cost,reference_code,status,requested_at").single();
      created=res.data; err=res.error;
      if(err && err.code!=="23505") break;
    }
    if(!created) return J({error:err?.message||"Could not create redemption"},500);
    return J({ok:true,pending_redemption:created});
  }

  if(action==="pending_redemptions"){
    if(!isStaff) return J({error:"Staff access required"},403);

    const {data:reds,error}=await db.from("loyalty_points_redemptions")
      .select("id,user_id,item_name,category_name,points_cost,reference_code,requested_at")
      .eq("status","pending").order("requested_at",{ascending:true}).limit(100);
    if(error) return J({error:error.message},500);

    const ids=[...new Set((reds||[]).map((r:any)=>r.user_id))];
    let profiles:any[]=[];
    if(ids.length){
      const pr=await db.from("profiles").select("id,full_name,loyalty_code").in("id",ids);
      if(pr.error) return J({error:pr.error.message},500);
      profiles=pr.data||[];
    }
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));
    return J({redemptions:(reds||[]).map((r:any)=>({
      ...r,
      customer_name:pm.get(r.user_id)?.full_name||"Customer",
      loyalty_code:pm.get(r.user_id)?.loyalty_code||""
    }))});
  }

  if(action==="confirm_redemption"){
    if(!isStaff) return J({error:"Staff access required"},403);
    const redemptionId=String(body.redemption_id||"");
    if(!redemptionId) return J({error:"Choose a redemption"},400);

    const {data:r,error}=await db.rpc("confirm_loyalty_points_redemption_service",{
      p_redemption_id:redemptionId,p_staff_id:user.id
    });
    if(error) return J({error:error.message},400);
    const result=Array.isArray(r)?r[0]:r;
    return J({
      ok:true,confirmed:!!result?.confirmed,balance:Number(result?.balance||0),
      item_name:result?.item_name||"",category_name:result?.category_name||""
    });
  }

  if(action==="lookup"){
    if(!isStaff) return J({error:"Staff access required"},403);
    const code=String(body.loyalty_code||"").replace(/\D/g,"").slice(0,6);
    if(code.length!==6) return J({error:"Enter a 6-digit loyalty code"},400);
    const {data:p,error}=await db.from("profiles")
      .select("id,full_name,loyalty_code").eq("loyalty_code",code).single();
    if(error||!p) return J({error:"Customer not found"},404);
    const {data:a}=await db.from("loyalty_points_accounts")
      .select("points").eq("user_id",p.id).maybeSingle();
    return J({customer:{id:p.id,full_name:p.full_name,loyalty_code:p.loyalty_code,points:Number(a?.points||0)}});
  }

  if(action==="staff_add"){
    if(!isStaff) return J({error:"Staff access required"},403);
    const customerId=String(body.customer_id||"");
    const orderValue=Number(body.order_value);
    const transactionId=String(body.transaction_id||"").trim();
    if(!customerId) return J({error:"Scan or select a customer first"},400);
    if(!Number.isFinite(orderValue)||orderValue<1||orderValue>10000) return J({error:"Enter a valid order value"},400);
    if(!/^[0-9a-f-]{20,64}$/i.test(transactionId)) return J({error:"Invalid transaction reference"},400);
    const points=Math.floor(orderValue);
    const {data:exists}=await db.from("profiles").select("id,full_name").eq("id",customerId).single();
    if(!exists) return J({error:"Customer not found"},404);
    const {data:r,error}=await db.rpc("award_loyalty_points_service",{
      p_user_id:customerId,p_points:points,p_event_type:"staff_purchase",p_source_id:transactionId,
      p_order_value:Number(orderValue.toFixed(2)),p_created_by:user.id,p_note:"Staff-awarded purchase points"
    });
    if(error) return J({error:error.message},500);
    const result=Array.isArray(r)?r[0]:r;
    return J({ok:true,added:!!result?.added,points_added:result?.added?points:0,balance:Number(result?.balance||0),customer_name:exists.full_name});
  }

  return J({error:"Unknown action"},400);
});

