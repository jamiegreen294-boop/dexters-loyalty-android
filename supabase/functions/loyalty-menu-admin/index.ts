import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const str=(v:any,max=500)=>String(v??"").trim().slice(0,max);

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 const auth=req.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer ")) return json({error:"Not authenticated"},401);
 const url=Deno.env.get("SUPABASE_URL")!;
 const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:userErr}=await userClient.auth.getUser();
 if(userErr||!user) return json({error:"Invalid session"},401);
 const admin=createClient(url,service);
 const {data:profile}=await admin.from("profiles").select("role,staff_permissions").eq("id",user.id).single();
 const canManage=profile?.role==="admin" || ((profile?.role==="staff" || profile?.role==="manager") && !!profile?.staff_permissions?.manage_menu);
 if(!canManage) return json({error:"Menu management permission required"},403);
 let body:any={}; try{body=await req.json()}catch{return json({error:"Invalid request"},400)}
 const action=str(body.action,40);
 if(action==="list"){
   const {data:cats,error:ce}=await admin.from("loyalty_menu_categories").select("id,name,sort_order,active,updated_at").order("sort_order").order("name");
   if(ce) return json({error:ce.message},500);
   const {data:items,error:ie}=await admin.from("loyalty_menu_items").select("id,category_id,name,price_text,description,sort_order,active,updated_at").order("sort_order").order("name");
   if(ie) return json({error:ie.message},500);
   return json({categories:cats||[],items:items||[]});
 }
 if(action==="bootstrap"){
   const {count}=await admin.from("loyalty_menu_categories").select("id",{count:"exact",head:true});
   if((count||0)>0) return json({ok:true,skipped:true});
   const menu=body.menu;
   if(!menu||typeof menu!=="object"||Array.isArray(menu)) return json({error:"Menu data required"},400);
   let catOrder=0;
   for(const [catName,rawItems] of Object.entries(menu)){
     catOrder++;
     const name=str(catName,120); if(!name||!Array.isArray(rawItems)) continue;
     const {data:cat,error:catErr}=await admin.from("loyalty_menu_categories").insert({name,sort_order:catOrder,active:true}).select("id").single();
     if(catErr||!cat) return json({error:catErr?.message||"Category create failed"},500);
     const rows=(rawItems as any[]).map((x:any,idx:number)=>({category_id:cat.id,name:str(x?.[0],160),price_text:str(x?.[1],40),description:str(x?.[2],1000),sort_order:idx+1,active:true})).filter((x:any)=>x.name&&x.price_text);
     if(rows.length){const {error:e}=await admin.from("loyalty_menu_items").insert(rows); if(e)return json({error:e.message},500)}
   }
   return json({ok:true});
 }
 if(action==="category_create"){
   const name=str(body.name,120); if(!name)return json({error:"Category name required"},400);
   const {data:max}=await admin.from("loyalty_menu_categories").select("sort_order").order("sort_order",{ascending:false}).limit(1).maybeSingle();
   const {data,error}=await admin.from("loyalty_menu_categories").insert({name,sort_order:(max?.sort_order||0)+1,active:true}).select().single();
   if(error)return json({error:error.message},400); return json({ok:true,category:data});
 }
 if(action==="category_update"){
   const id=str(body.id,80),name=str(body.name,120); if(!id||!name)return json({error:"Category and name required"},400);
   const {error}=await admin.from("loyalty_menu_categories").update({name,active:body.active!==false,updated_at:new Date().toISOString()}).eq("id",id);
   if(error)return json({error:error.message},400); return json({ok:true});
 }
 if(action==="category_remove"){
   const id=str(body.id,80); if(!id)return json({error:"Category required"},400);
   const {error}=await admin.from("loyalty_menu_categories").update({active:false,updated_at:new Date().toISOString()}).eq("id",id);
   if(error)return json({error:error.message},400); return json({ok:true});
 }
 if(action==="item_create"){
   const category_id=str(body.category_id,80),name=str(body.name,160),price_text=str(body.price_text,40),description=str(body.description,1000);
   if(!category_id||!name||!price_text)return json({error:"Category, item name and price are required"},400);
   const {data:max}=await admin.from("loyalty_menu_items").select("sort_order").eq("category_id",category_id).order("sort_order",{ascending:false}).limit(1).maybeSingle();
   const {data,error}=await admin.from("loyalty_menu_items").insert({category_id,name,price_text,description,sort_order:(max?.sort_order||0)+1,active:true}).select().single();
   if(error)return json({error:error.message},400); return json({ok:true,item:data});
 }
 if(action==="item_update"){
   const id=str(body.id,80),category_id=str(body.category_id,80),name=str(body.name,160),price_text=str(body.price_text,40),description=str(body.description,1000);
   if(!id||!category_id||!name||!price_text)return json({error:"Item, category, name and price are required"},400);
   const {error}=await admin.from("loyalty_menu_items").update({category_id,name,price_text,description,active:body.active!==false,updated_at:new Date().toISOString()}).eq("id",id);
   if(error)return json({error:error.message},400); return json({ok:true});
 }
 if(action==="item_remove"){
   const id=str(body.id,80); if(!id)return json({error:"Item required"},400);
   const {error}=await admin.from("loyalty_menu_items").update({active:false,updated_at:new Date().toISOString()}).eq("id",id);
   if(error)return json({error:error.message},400); return json({ok:true});
 }
 return json({error:"Unknown action"},400);
});