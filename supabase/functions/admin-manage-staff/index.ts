import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const safePerms=(p:any)=>({loyalty_lookup:!!p?.loyalty_lookup,add_stamps:!!p?.add_stamps,redeem_rewards:!!p?.redeem_rewards,manage_offers:!!p?.manage_offers,redeem_spin_prizes:!!p?.redeem_spin_prizes,manage_menu:!!p?.manage_menu});
const safeRole=(r:any)=>["admin","manager","staff","customer"].includes(String(r))?String(r):"staff";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const auth=req.headers.get("Authorization")||""; if(!auth.startsWith("Bearer "))return json({error:"Not authenticated"},401);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}}); const {data:{user},error:ue}=await uc.auth.getUser(); if(ue||!user)return json({error:"Invalid session"},401);
 const admin=createClient(url,service); const {data:caller}=await admin.from("profiles").select("role").eq("id",user.id).single(); if(!caller||caller.role!=="admin")return json({error:"Admin access required"},403);
 let body:any={};try{body=await req.json()}catch{return json({error:"Invalid request"},400)} const action=String(body.action||"");
 if(action==="list"){
   const {data,error}=await admin.from("profiles").select("id,full_name,phone,role,staff_permissions,created_at").in("role",["staff","manager","admin"]).order("full_name"); if(error)return json({error:error.message},500);
   const {data:usersData,error:usersError}=await admin.auth.admin.listUsers({page:1,perPage:1000}); if(usersError)return json({error:usersError.message},500);
   const emailById=new Map(usersData.users.map((u:any)=>[u.id,u.email||""])); return json({staff:(data||[]).map((p:any)=>({...p,email:emailById.get(p.id)||""})),current_user_id:user.id});
 }
 if(action==="create"){
   const full_name=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
   const role=safeRole(body.role); if(role==="customer")return json({error:"New accounts here must be Staff, Manager or Admin"},400);
   if(!full_name||!email||password.length<8)return json({error:"Name, email and a password of at least 8 characters are required"},400);
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name,phone}}); if(createError||!created.user)return json({error:createError?.message||"Could not create account"},400);
   const {error:profileError}=await admin.from("profiles").update({full_name,phone:phone||null,role,staff_permissions:["staff","manager"].includes(role)?safePerms(body.permissions):{}}).eq("id",created.user.id); if(profileError){await admin.auth.admin.deleteUser(created.user.id);return json({error:profileError.message},500)}
   return json({ok:true,id:created.user.id});
 }
 if(action==="update"){
   const id=String(body.id||""); if(!id||id===user.id)return json({error:"You cannot change your own admin access here"},400);
   const {data:target}=await admin.from("profiles").select("role").eq("id",id).single(); if(!target||!["staff","manager","admin"].includes(target.role))return json({error:"Admin, manager or staff account not found"},404);
   const role=safeRole(body.role); const full_name=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),email=String(body.email||"").trim().toLowerCase(); if(!full_name)return json({error:"Name is required"},400);
   if(email){const {error:emailError}=await admin.auth.admin.updateUserById(id,{email}); if(emailError)return json({error:emailError.message},400)}
   const {error}=await admin.from("profiles").update({full_name,phone:phone||null,role,staff_permissions:["staff","manager"].includes(role)?safePerms(body.permissions):{}}).eq("id",id); if(error)return json({error:error.message},500); return json({ok:true});
 }
 if(action==="remove"){
   const id=String(body.id||""); if(!id||id===user.id)return json({error:"You cannot remove your own admin access here"},400);
   const {data:target}=await admin.from("profiles").select("role").eq("id",id).single(); if(!target||!["staff","manager","admin"].includes(target.role))return json({error:"Admin, manager or staff account not found"},404);
   const {error}=await admin.from("profiles").update({role:"customer",staff_permissions:{}}).eq("id",id); if(error)return json({error:error.message},500); return json({ok:true});
 }
 return json({error:"Unknown action"},400);
});