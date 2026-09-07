(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const SESSION='sb-bpnkouymdvcogeaqjmxl-auth-token';
const $=s=>document.querySelector(s);
function token(){try{const j=JSON.parse(localStorage.getItem(SESSION)||'null');return j?.access_token||j?.currentSession?.access_token||j?.session?.access_token||''}catch{return''}}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function original(page){return document.querySelector('.nav button[data-page="'+page+'"]')}
function go(page){const b=original(page);if(b)b.click()}
function style(){
 if(document.getElementById('dextersRecoveryUiStyle'))return;
 const s=document.createElement('style');s.id='dextersRecoveryUiStyle';s.textContent=
 '.nav{display:none!important}#dextersRecoveryTop{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0 10px}#dextersRecoveryTop button{width:auto;padding:10px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(10,18,30,.8);color:#fff;font-weight:900}#dextersRecoveryTop .admin{margin-left:auto}#dextersRecoveryBottom{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(8,16,29,.97);backdrop-filter:blur(12px);border-top:1px solid #243651;padding:7px max(8px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}#dextersRecoveryBottom .inner{width:min(520px,100%);margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}#dextersRecoveryBottom button{border:0;background:transparent;color:#9ba8ba;padding:7px 2px;border-radius:12px;font-weight:800;font-size:20px}#dextersRecoveryBottom button span{display:block;font-size:11px;margin-top:2px}#dextersRecoveryBottom button.active{background:#21314c;color:var(--yellow)}#dextersLiveOrdersCard .order-row{background:#0d1829;border:1px solid #324866;border-radius:14px;padding:12px;margin:9px 0}#dextersLiveOrdersCard .order-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:10px}#dextersLiveOrdersCard .order-step{font-size:10px;text-align:center;padding:7px 3px;border-radius:9px;background:#18263b;color:#8fa0b6;font-weight:800}#dextersLiveOrdersCard .order-step.on{background:#244c37;color:#b9f3ce}#dextersLiveOrdersCard .order-step.current{outline:2px solid var(--yellow)}';
 document.head.appendChild(s);
}
function ensureTop(){
 if(document.getElementById('dextersRecoveryTop'))return;
 const wrap=document.querySelector('.wrap'); if(!wrap)return;
 const bar=document.createElement('div');bar.id='dextersRecoveryTop';
 bar.innerHTML='<button type="button" id="dextersTopHome">🏠 Home</button><button type="button" id="dextersTopAdmin" class="admin hidden">⚙ Staff / Admin</button>';
 const app=document.getElementById('appView'); if(app)wrap.insertBefore(bar,app); else wrap.prepend(bar);
 document.getElementById('dextersTopHome').onclick=()=>go('homePage');
 document.getElementById('dextersTopAdmin').onclick=()=>go('staffPage');
}
function ensureBottom(){
 if(document.getElementById('dextersRecoveryBottom'))return;
 const n=document.createElement('nav');n.id='dextersRecoveryBottom';n.innerHTML='<div class="inner"><button data-go="homePage" class="active">🏠<span>Home</span></button><button data-go="qrPage">🎁<span>Rewards</span></button><button data-go="menuPage">🍔<span>Order</span></button><button data-go="accountPage">👤<span>Account</span></button></div>';
 document.body.appendChild(n);
 n.querySelectorAll('button').forEach(b=>b.onclick=()=>{go(b.dataset.go);n.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))});
}
async function role(){
 const t=token();if(!t)return;
 try{
  const r=await fetch(U+'/rest/v1/profiles?select=role&id=eq.'+encodeURIComponent((JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))).sub),{headers:{apikey:K,Authorization:'Bearer '+t}});
  const d=await r.json();const role=String(d?.[0]?.role||'customer').toLowerCase(),allowed=['admin','staff','manager'].includes(role);
  const a=document.getElementById('dextersTopAdmin');if(a)a.classList.toggle('hidden',!allowed);
  const old=document.getElementById('staffNav');if(old)old.classList.toggle('hidden',!allowed);
 }catch{}
}
function ensureOrderCard(){
 const home=document.getElementById('homePage');if(!home||document.getElementById('dextersLiveOrdersCard'))return;
 const c=document.createElement('div');c.className='card';c.id='dextersLiveOrdersCard';c.innerHTML='<h2>🧾 Your live order</h2><div id="dextersLiveOrdersBody" class="muted">Checking your latest order…</div>';home.insertBefore(c,home.children[1]||null);
}
function stageIndex(st){return {pending:0,amended:0,accepted:1,preparing:2,ready:3,collected:4}[String(st||'').toLowerCase()]??0}
function label(st){return ({pending:'Pending',amended:'Pending',accepted:'Accepted',preparing:'Preparing',ready:'Ready',collected:'Collected',amendment_required:'Amend order',rejected:'Rejected'})[String(st||'').toLowerCase()]||String(st||'')}
async function liveOrders(){
 ensureOrderCard();const box=document.getElementById('dextersLiveOrdersBody'),t=token();if(!box||!t)return;
 try{
  const r=await fetch(U+'/functions/v1/collection-orders-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'my_orders'}),cache:'no-store'});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load orders');
  const all=d.orders||[],active=all.filter(o=>!['collected','rejected','cancelled','completed'].includes(String(o.status||'').toLowerCase())).slice(0,3);
  if(!active.length){box.innerHTML='No live collection orders just now.';return}
  box.innerHTML=active.map(o=>{const st=String(o.status||'').toLowerCase(),idx=stageIndex(st),steps=['Accepted','Preparing','Ready','Collected'];return '<div class="order-row"><b>Order #'+esc(o.order_number)+'</b><div style="margin-top:5px">Status: <b>'+esc(label(st))+'</b></div>'+(o.collection_time?'<div class="tiny muted">Collection: '+esc(o.collection_time)+'</div>':'')+(st==='amendment_required'?'<div class="status err" style="margin-top:9px">One or more items are unavailable. Open your order to amend it.</div>':'')+'<div class="order-steps">'+steps.map((x,i)=>'<div class="order-step '+(idx>i?'on':idx===i+1?'on current':'')+'">'+x+'</div>').join('')+'</div></div>'}).join('');
 }catch(e){box.textContent='Order updates are temporarily unavailable.'}
}
function boot(){style();ensureTop();ensureBottom();role();ensureOrderCard();liveOrders()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,500);setTimeout(boot,1500);setInterval(()=>{role();liveOrders()},5000);
})();