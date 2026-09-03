(function(){
'use strict';
const BASE='https://bpnkouymdvcogeaqjmxl.supabase.co/rest/v1/rpc/';
const PUBLISHABLE='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const originalFetch=window.fetch.bind(window);
function isRpc(url,name){try{return new URL(url,location.href).pathname.endsWith('/rest/v1/rpc/'+name)}catch{return false}}
function jsonBody(text){try{return JSON.parse(text||'{}')}catch{return {}}}
async function bodyOf(input,init){if(init&&typeof init.body==='string')return init.body;if(typeof Request!=='undefined'&&input instanceof Request){try{return await input.clone().text()}catch{}}return ''}
function requestInit(input,init,body){if(typeof Request!=='undefined'&&input instanceof Request){const headers=new Headers(input.headers);return {method:input.method,headers,body:body||undefined,credentials:input.credentials,cache:input.cache,redirect:input.redirect,referrer:input.referrer,referrerPolicy:input.referrerPolicy,integrity:input.integrity,keepalive:input.keepalive,signal:input.signal}}return {...(init||{}),body:body===undefined?init?.body:body}}
async function replaceRpc(input,init,name,body){const u=typeof input==='string'?input:input.url;const next=new URL(u,location.href);next.pathname=next.pathname.replace(/\/rest\/v1\/rpc\/[^/]+$/,'/rest/v1/rpc/'+name);return originalFetch(next.toString(),requestInit(input,init,body))}
async function testReward(token){const r=await originalFetch(BASE+'shared_spin_test_my_reward',{method:'POST',headers:{apikey:PUBLISHABLE,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});if(!r.ok)return null;return (await r.json())?.reward||null}
function token(){try{const s=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return s?.access_token||s?.currentSession?.access_token||s?.session?.access_token||null}catch{return null}}
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:input?.url||'';
 if(isRpc(url,'spin_wheel_spin'))return replaceRpc(input,init,'shared_spin_test_spin',await bodyOf(input,init));
 if(isRpc(url,'spin_wheel_my_status'))return replaceRpc(input,init,'shared_spin_test_status',await bodyOf(input,init));
 if(isRpc(url,'universal_qr_action')){
   const rawBody=await bodyOf(input,init),data=jsonBody(rawBody);
   if(data.p_action==='wallet'){
     const live=await originalFetch(input,init),copy=live.clone();
     if(!live.ok)return live;
     let payload;try{payload=await copy.json()}catch{return live}
     const t=token(),reward=t?await testReward(t):null;
     if(reward){payload.rewards=Array.isArray(payload.rewards)?payload.rewards:[];if(!payload.rewards.some(x=>x.raw===reward.raw))payload.rewards.unshift({raw:reward.raw,kind:'spin',item:reward.item,category:'Spin to Win'});}
     return new Response(JSON.stringify(payload),{status:live.status,statusText:live.statusText,headers:{'Content-Type':'application/json'}});
   }
   if(typeof data.p_raw==='string'&&/^DEXTERS_SPIN:[0-9a-f-]{36}$/i.test(data.p_raw)){
     const testBody=JSON.stringify({p_action:data.p_action,p_raw:data.p_raw,p_request_id:data.p_request_id||null});
     const testResponse=await replaceRpc(input,init,'shared_spin_test_qr_action',testBody);
     if(testResponse.ok)return testResponse;
     let err={};try{err=await testResponse.clone().json()}catch{}
     if(String(err.message||'').includes('Winning test reward not found'))return originalFetch(input,init);
     return testResponse;
   }
 }
 return originalFetch(input,init);
};
function badge(){const page=document.getElementById('spinPage');if(!page||document.getElementById('sharedSpinTestBadge'))return;const d=document.createElement('div');d.id='sharedSpinTestBadge';d.className='card';d.innerHTML='<b>TEST MODE — shared 1,000-spin prize cycle</b><p class="muted">This screen uses isolated test Spin records. Live Spin records are not changed.</p>';page.prepend(d)}
function refreshBadge(){badge()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshBadge,{once:true});else refreshBadge();
setTimeout(refreshBadge,600);setTimeout(refreshBadge,1800);
})();
