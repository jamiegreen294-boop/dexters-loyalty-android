const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
function handler(file,opts={}){
 const state={role:'admin',targetRole:'customer',activity:'2020-01-01T00:00:00Z',deleted:[],news:{message:'Existing news',active:true},...opts};let serve;
 function builder(table){let id,patch;const b={select(){return b},eq(k,v){if(k==='id')id=v;return b},update(v){patch=v;return b},single:()=>reply(),maybeSingle:()=>reply()};async function reply(){if(table==='profiles')return {data:id==='actor'?{role:state.role,staff_permissions:{}}:{id:'customer',role:state.targetRole,full_name:'Dummy Customer'},error:state.profileError||null};if(table==='app_news_banner'){if(patch)Object.assign(state.news,patch);return {data:state.news,error:null};}throw Error('Unexpected table '+table);}return b;}
 const db={from:builder,auth:{admin:{getUserById:async()=>({data:{user:{last_sign_in_at:state.activity,created_at:state.activity}},error:null}),deleteUser:async id=>{state.deleted.push(id);return {error:state.deleteError?{message:'denied'}:null};}}}};
 const uc={auth:{getUser:async()=>({data:{user:state.invalidSession?null:{id:'actor'}}})}};
 const context={Deno:{env:{get:k=>({SUPABASE_URL:'https://unit.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}[k])},serve:f=>serve=f},createClient:(url,key)=>key==='anon'?uc:db,Response,Request,Date,Map,Number,String,Math,console};
 const source=fs.readFileSync(file,'utf8').replace(/^import .*;\s*$/gm,'');vm.runInNewContext(stripTypeScriptTypes(source),context);
 return {state,call:(body,auth=true,method='POST')=>serve(new Request('https://unit.invalid',{method,headers:auth?{Authorization:'Bearer fake','Content-Type':'application/json'}:{},...(method==='POST'?{body:JSON.stringify(body)}:{})}))};
}
async function run(){let count=0;const path='supabase/functions/customer-offers-admin/index.ts';
 const body={action:'delete_customer',customer_id:'customer',min_inactive_days:365,confirm:true};
 const cases=[[{role:'staff'},body,true,'POST',403],[{role:'customer'},body,true,'POST',403],[{},body,false,'POST',401],[{invalidSession:true},body,true,'POST',401],[{}, {...body,confirm:false},true,'POST',400],[{targetRole:'staff'},body,true,'POST',404],[{activity:new Date().toISOString()},body,true,'POST',409],[{activity:'not-a-date'},body,true,'POST',409],[{activity:null},body,true,'POST',409],[{},body,true,'GET',405],[{profileError:{message:'db unavailable'}},body,true,'POST',500]];
 for(const [opts,payload,auth,method,expected] of cases){const h=handler(path,opts),r=await h.call(payload,auth,method);assert.equal(r.status,expected,JSON.stringify(opts));assert.equal(h.state.deleted.length,0);count++;}
 let h=handler(path),r=await h.call(body);assert.equal(r.status,200);assert.deepEqual(h.state.deleted,['customer']);count++;
 h=handler(path,{deleteError:true});r=await h.call(body);assert.equal(r.status,500);assert.equal((await r.json()).ok,undefined);count++;
 const news='supabase/functions/app-news-api/index.ts';h=handler(news,{role:'customer'});r=await h.call({action:'save',message:'Bad',active:true});assert.equal(r.status,403);assert.equal(h.state.news.message,'Existing news');count++;
 h=handler(news,{role:'staff'});r=await h.call({action:'save',message:'Test coffee morning',active:true});assert.equal(r.status,200);assert.equal(h.state.news.message,'Test coffee morning');r=await h.call({action:'unpublish'});assert.equal(r.status,200);assert.equal(h.state.news.active,false);count++;
 h=handler(news);r=await h.call({action:'current'},false);assert.equal(r.status,200);count++;
 console.log('PASS '+count+' combined backend checks. Auth and deleteUser are mocks; no live customer changes.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
