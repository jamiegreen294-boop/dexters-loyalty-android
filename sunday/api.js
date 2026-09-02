(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const sb=supabase.createClient(U,K);
async function token(){const {data}=await sb.auth.getSession();return data.session?.access_token||''}
async function call(body){const t=await token();if(!t)throw Error('Please sign in to the Dexter’s Loyalty App first.');const r=await fetch(U+'/functions/v1/sunday-roast-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
function config(s){return{enabled:!!s.enabled,date:s.collection_date,slots:Array.isArray(s.slots)?s.slots:[],stock:s.stock||{},override:s.cutoff_mode||'auto'}}
window.SundayApi={sb,call,config,status:async date=>{const d=await call({action:'status',collection_date:date});return{...d,config:config(d.settings)}},create:(date,d,requestId)=>call({action:'create',collection_date:date,collection_slot:d.slot,customer_name:d.name,customer_phone:d.phone,meals:d.meals,extras:d.extras,request_id:requestId}),myOrders:()=>call({action:'my_orders'})};
})();