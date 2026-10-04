(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const V='BKFP4y8dn01iosiV_LvFfeSA7O5ssNzSmQpL0Umhe2grStiT4yiGkSRhY_yuL-8AXrq-oTeBa0scgKfEdS4nJAE';
const SNOOZE='dexters-push-prompt-snooze-until-v2';
let pushBusy=false,lastRepair=0;

function token(){try{const x=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return x?.access_token||x?.currentSession?.access_token||x?.session?.access_token||''}catch{return''}}
function b64(s){const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),a=new Uint8Array(r.length);for(let i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function pushApi(body){const t=token();if(!t)throw Error('Please sign in again.');const r=await fetch(U+'/functions/v1/customer-web-push',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Notification service unavailable');return d}
function supported(){return 'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window}
async function registration(){if(!supported())throw Error('Phone notifications are not supported on this device/browser.');const reg=await navigator.serviceWorker.register('/dexters-sw.js',{scope:'/'});await navigator.serviceWorker.ready;return reg}
async function serverStatus(){if(!token())return {subscribed:false,devices:0};try{return await pushApi({action:'status'})}catch{return {subscribed:false,devices:0}}}
function emit(state){try{window.dispatchEvent(new CustomEvent('dextersPushStateChanged',{detail:state}))}catch{}}

async function enablePush(interactive=true){
 if(pushBusy)return false;
 const t=token();if(!t)return false;
 if(!supported()){renderPreference();return false}
 pushBusy=true;
 try{
   if(Notification.permission==='default'&&interactive)await Notification.requestPermission();
   if(Notification.permission!=='granted'){renderPreference();emit({permission:Notification.permission,subscribed:false});return false}
   const reg=await registration();
   let sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(V)});
   const d=await pushApi({action:'subscribe',subscription:sub.toJSON()});
   try{localStorage.removeItem(SNOOZE)}catch{}
   renderPreference();
   emit({permission:'granted',subscribed:true,devices:Number(d.devices||1)});
   return true;
 }catch(e){console.warn('Dexters push setup failed',e);renderPreference(String(e?.message||e));emit({permission:Notification.permission,subscribed:false,error:String(e?.message||e)});return false}
 finally{pushBusy=false}
}
window.dextersEnablePush=enablePush;

async function repairPush(force=false){
 if(!token()||!supported()||Notification.permission!=='granted')return;
 const now=Date.now();if(!force&&now-lastRepair<60000)return;lastRepair=now;
 try{
   const [reg,status]=await Promise.all([registration(),serverStatus()]);
   const local=await reg.pushManager.getSubscription();
   if(!local||!status.subscribed)await enablePush(false);
   else renderPreference();
 }catch{}
}
window.dextersPushStatus=serverStatus;

function promptSnoozed(){try{return Number(localStorage.getItem(SNOOZE)||0)>Date.now()}catch{return false}}
function closePrompt(){document.getElementById('dextersNotificationPrompt')?.remove()}
function ensurePrompt(){
 if(!token()||!supported()||Notification.permission!=='default'||promptSnoozed()||document.getElementById('dextersNotificationPrompt'))return;
 const wrap=document.createElement('div');wrap.id='dextersNotificationPrompt';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','Enable Dexter’s notifications');
 wrap.style.cssText='position:fixed;left:14px;right:14px;bottom:86px;z-index:99998;max-width:480px;margin:auto;background:#132038;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px;box-shadow:0 14px 38px rgba(0,0,0,.38);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
 wrap.innerHTML='<div style="font-weight:900;font-size:17px;margin-bottom:6px">Enable Dexter’s notifications</div><div style="font-size:13px;line-height:1.45;color:#c4cfdf">Get phone alerts for order accepted, cooking, ready to collect and important account updates. Marketing choices stay separate.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px"><button id="dextersNotifyLater" type="button" style="border:0;border-radius:12px;padding:12px;font-weight:800;background:#223454;color:#fff">Not now</button><button id="dextersNotifyEnable" type="button" style="border:0;border-radius:12px;padding:12px;font-weight:900;background:linear-gradient(90deg,#ffd43b,#ff8a00);color:#111">Enable notifications</button></div>';
 document.body.appendChild(wrap);
 document.getElementById('dextersNotifyEnable').onclick=async()=>{const ok=await enablePush(true);if(ok)closePrompt()};
 document.getElementById('dextersNotifyLater').onclick=()=>{try{localStorage.setItem(SNOOZE,String(Date.now()+86400000))}catch{}closePrompt()};
}
window.dextersEnsurePushPrompt=ensurePrompt;

async function renderPreference(errorText=''){
 const page=document.getElementById('accountPage');if(!page)return;
 let card=document.getElementById('dextersNotificationPreferences');
 if(!card){
   card=document.createElement('div');card.id='dextersNotificationPreferences';card.className='card';
   card.innerHTML='<h2>🔔 Phone notifications</h2><p class="muted">Order and service alerts from Dexter’s. Marketing email/SMS choices are managed separately below.</p><div id="dextersPushState" class="tiny muted">Checking this device…</div><button id="dextersPushEnableBtn" type="button" class="btn primary" style="margin-top:10px">Enable phone notifications</button>';
   const first=page.querySelector('.card');if(first)first.after(card);else page.prepend(card);
   document.getElementById('dextersPushEnableBtn').onclick=()=>enablePush(true);
 }
 const state=document.getElementById('dextersPushState'),btn=document.getElementById('dextersPushEnableBtn');if(!state||!btn)return;
 if(errorText){state.textContent=errorText}
 if(!supported()){state.textContent='This browser/device does not support web push notifications.';btn.disabled=true;btn.textContent='Notifications unavailable';return}
 if(Notification.permission==='denied'){state.textContent='Notifications are blocked in this phone/browser settings. Allow notifications for app.dextersspot.co.uk, then reopen Dexter’s.';btn.disabled=true;btn.textContent='Blocked in phone settings';return}
 if(Notification.permission==='default'){state.textContent='Not enabled on this device yet.';btn.disabled=false;btn.textContent='Enable phone notifications';return}
 const st=await serverStatus();
 if(st.subscribed){state.textContent='✓ This account has '+Number(st.devices||1)+' notification device'+(Number(st.devices||1)===1?'':'s')+' connected.';btn.disabled=true;btn.textContent='Phone notifications enabled'}
 else{state.textContent='Permission is allowed, but this device still needs linking to your Dexter’s account.';btn.disabled=false;btn.textContent='Link this device'}
}

function shell(){
 if(document.getElementById('dextersInboxBtn'))return;
 const b=document.createElement('button');b.id='dextersInboxBtn';b.type='button';b.setAttribute('aria-label','Notifications');b.innerHTML='🔔<span id="dextersInboxBadge"></span>';b.style.cssText='position:fixed;right:14px;top:14px;z-index:99970;width:48px;height:48px;border:1px solid #ffffff2b;border-radius:50%;background:#132038;color:#fff;font-size:21px;box-shadow:0 8px 24px #0005';document.body.appendChild(b);
 const p=document.createElement('div');p.id='dextersInboxPanel';p.style.cssText='display:none;position:fixed;inset:0;z-index:99990;background:#08101dee;color:#fff;padding:18px;overflow:auto;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';p.innerHTML='<div style="max-width:520px;margin:auto"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 style="margin:0">Notifications</h2><button id="dextersInboxClose" class="btn" type="button">Close</button></div><p style="color:#c4cfdf">Order updates and messages from Dexter’s.</p><div id="dextersInboxList"></div></div>';document.body.appendChild(p);
 b.onclick=()=>{p.style.display='block';load(true)};document.getElementById('dextersInboxClose').onclick=()=>p.style.display='none'
}
async function load(mark){const t=token();if(!t)return;try{const r=await fetch(U+'/rest/v1/customer_notification_inbox?select=id,title,body,created_at,read_at,data&order=created_at.desc&limit=50',{headers:{apikey:K,Authorization:'Bearer '+t,Accept:'application/json'},cache:'no-store'});if(!r.ok)return;const rows=await r.json();const unread=rows.filter(x=>!x.read_at);const badge=document.getElementById('dextersInboxBadge');if(badge){badge.textContent=unread.length?String(Math.min(unread.length,99)):'';badge.style.cssText=unread.length?'position:absolute;right:-2px;top:-2px;min-width:19px;height:19px;padding:0 4px;border-radius:10px;background:#ff394d;color:#fff;font:800 11px/19px system-ui;text-align:center':'display:none'}const list=document.getElementById('dextersInboxList');if(list){list.innerHTML=rows.length?rows.map(x=>'<div style="padding:14px;margin:10px 0;border-radius:14px;border:1px solid #ffffff1c;background:'+(x.read_at?'#ffffff08':'#ffffff12')+'"><div style="font-weight:900">'+esc(x.title)+'</div><div style="margin-top:5px;color:#d8e1ee;line-height:1.45">'+esc(x.body)+'</div><div style="margin-top:7px;font-size:12px;color:#91a0b4">'+new Date(x.created_at).toLocaleString()+'</div></div>').join(''):'<div style="padding:20px;text-align:center;color:#aab7c8">No notifications yet.</div>'}if(mark&&unread.length){await fetch(U+'/rest/v1/customer_notification_inbox?id=in.('+unread.map(x=>x.id).join(',')+')',{method:'PATCH',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})});setTimeout(()=>load(false),300)}}catch{}}

function boot(){
 shell();renderPreference();setTimeout(()=>{shell();renderPreference();repairPush(true);ensurePrompt();load(false)},900);
 setTimeout(()=>{renderPreference();repairPush(false);ensurePrompt()},2500);
 setInterval(()=>{load(false);repairPush(false)},30000);
 window.addEventListener('focus',()=>{load(false);repairPush(false);renderPreference();ensurePrompt()});
 window.addEventListener('dexters:startup-complete',()=>{renderPreference();repairPush(false);ensurePrompt()});
 const av=document.getElementById('appView');if(av)new MutationObserver(()=>setTimeout(()=>{renderPreference();ensurePrompt()},50)).observe(av,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();