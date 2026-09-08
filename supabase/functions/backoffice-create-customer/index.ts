import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
function tempPassword(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";const a=new Uint32Array(12);crypto.getRandomValues(a);let s="Dx!";for(const n of a)s+=chars[n%chars.length];return s}
function code6(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000))}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return json({error:"Secure sign-in required"},401);
 const authClient=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:userData,error:userErr}=await authClient.auth.getUser();
 if(userErr||!userData.user)return json({error:"Invalid session"},401);
 const admin=createClient(url,service);
 const {data:account,error:accountErr}=await admin.from("backoffice_staff_accounts").select("staff_record_id,role,active").eq("auth_user_id",userData.user.id).maybeSingle();
 if(accountErr||!account||account.active===false)return json({error:"Back Office account required"},403);
 const rank:Record<string,number>={Staff:1,"Team Leader":2,Manager:3,"Super User":4};
 if((rank[account.role]||0)<2)return json({error:"Team Leader or above required"},403);
 let body:any={};try{body=await req.json()}catch{}
 const fullName=String(body.full_name||"").trim(),email=String(body.email||"").trim().toLowerCase(),phone=String(body.phone||"").trim();
 if(!fullName||!/^\S+@\S+\.\S+$/.test(email))return json({error:"A valid customer name and email are required"},400);
 let duplicate=false;
 for(let page=1;page<=20&&!duplicate;page++){
  const {data:existing,error:listErr}=await admin.auth.admin.listUsers({page,perPage:1000});
  if(listErr)return json({error:"Could not safely check for an existing customer: "+listErr.message},500);
  duplicate=!!existing?.users?.some(u=>String(u.email||"").toLowerCase()===email);
  if((existing?.users?.length||0)<1000)break;
 }
 if(duplicate)return json({error:"An account already exists for this email. Use password reset instead of creating a duplicate."},409);
 const password=tempPassword();
 const {data:created,error:createErr}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,phone,created_via:"dexters_backoffice",must_change_password:true,temporary_password_issued_at:new Date().toISOString()}});
 if(createErr||!created.user)return json({error:createErr?.message||"Customer account could not be created"},400);
 const uid=created.user.id;let loyaltyCode="";
 for(let i=0;i<10;i++){const candidate=code6();const {data:used}=await admin.from("profiles").select("id").eq("loyalty_code",candidate).maybeSingle();if(!used){loyaltyCode=candidate;break}}
 if(!loyaltyCode)loyaltyCode=code6();
 const {error:profileErr}=await admin.from("profiles").upsert({id:uid,full_name:fullName,phone:phone||null,role:"customer",loyalty_code:loyaltyCode},{onConflict:"id"});
 if(profileErr){await admin.auth.admin.deleteUser(uid);return json({error:"Could not create customer profile: "+profileErr.message},500)}
 await admin.from("loyalty_accounts").upsert({user_id:uid,stamps:0,reward_ready:false},{onConflict:"user_id"});
 await admin.from("loyalty_points_accounts").upsert({user_id:uid,points:0},{onConflict:"user_id"});
 const appUrl="https://apps.dextersspot.co.uk/";
 const mailClient=createClient(url,anon);
 const {error:emailError}=await mailClient.auth.resetPasswordForEmail(email,{redirectTo:appUrl});
 const {data:actorProfile}=await admin.from("backoffice_staff_profiles").select("full_name").eq("staff_record_id",account.staff_record_id).maybeSingle();
 const actor=actorProfile?.full_name||userData.user.email||"Back Office";
 await admin.from("backoffice_audit_log").insert({actor_user_id:userData.user.id,actor_role:account.role,entity_type:"customer",entity_id:uid,action:"Customer account created from Back Office",after_data:{full_name:fullName,email,phone:phone||null,loyalty_code:loyaltyCode,created_by:actor,must_change_password:true,welcome_email_requested:!emailError,welcome_email_error:emailError?.message||null}});
 return json({ok:true,user_id:uid,full_name:fullName,email,phone,loyalty_code:loyaltyCode,temporary_password:password,must_change_password:true,app_url:appUrl,created_by:actor,welcome_email_requested:!emailError,welcome_email_error:emailError?.message||null});
});
