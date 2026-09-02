(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const DEALS=[
 {category:'Chicken Tenders',title:'Winter Tenders',description:'4 Chicken Tenders + Chips + Can',normal:'£13.50',price:'£12.50',icon:'❄️'},
 {category:'Dexter’s Smash Burgers',title:'Valentine Burger Deal',description:'2 Dexter Smash Burgers + 2 Cans',normal:'£20.40',price:'£18.99',icon:'❤️'},
 {category:'Dexter’s Street Subs',title:'Street Sub Meal',description:'Chicken Mayo Melt + Chips + Can',normal:'£11.50',price:'£10.75',icon:'🍀'},
 {category:'Chicken Burgers',title:'Easter Chicken Deal',description:'Classic Chicken Smash + Can + Garlic Bread',normal:'£14.20',price:'£13.25',icon:'🐣'},
 {category:'Dexter’s Smash Burgers',title:'Smash & Rings',description:'Dexter Smash + Can + Onion Rings',normal:'£14.70',price:'£13.49',icon:'☀️'},
 {category:'Dexter’s Street Subs',title:'Summer Sub',description:'Southern Fried Chicken Sub + Chips + Can',normal:'£12.00',price:'£10.99',icon:'🌤️'},
 {category:'Chicken Tenders',title:'Summer Tenders',description:'6 Chicken Tenders + Chips + Can',normal:'£15.50',price:'£14.25',icon:'☀️'},
 {category:'Chicken Tenders',title:'BBQ Summer',description:'BBQ Tenders + Chips + Can',normal:'£13.50',price:'£12.50',icon:'🍔'},
 {category:'Dexter’s Street Subs',title:'Back to Routine',description:'Chicken Mayo Melt + Chips + Can',normal:'£11.50',price:'£10.75',icon:'🔥'},
 {category:'Inferno Chicken Tenders',title:'Halloween Inferno',description:'Inferno Chicken + Chips + Can',normal:'£14.00',price:'£12.99',icon:'🎃'},
 {category:'Dexter’s Rice Bowls',title:'Winter Warmer',description:'Chicken Curry Rice Bowl + Can',normal:'£11.00',price:'£10.25',icon:'🍟'},
 {category:'Dexter’s Smash Burgers',title:'Christmas Burger Feast',description:'2 Dexter Smash Burgers + 2 Cans + Onion Rings',normal:'£24.90',price:'£22.99',icon:'🎄'}
];
let activeClaim=null,timer=null,busy=false;
function session(){try{const j=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return j?.currentSession||j?.session||j||null}catch(e){return null}}
function token(){const s=session();return s?.access_token||null}
async function req(path,opt){const t=token();if(!t)throw new Error('no-session');const r=await fetch(U+path,Object.assign({},opt||{},{headers:Object.assign({apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},(opt&&opt.headers)||{})}));const text=await r.text();let d=null;try{d=text?JSON.parse(text):null}catch(e){}if(!r.ok)throw new Error((d&&(d.message||d.error))||('HTTP '+r.status));return d}
async function rpc(name,body){return req('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body||{})})}
function dealKey(d){const n=new Date(),m=n.getMonth()+1;return 'yearly-'+n.getFullYear()+'-'+String(m).padStart(2,'0')+'-'+d.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function nextMonthIso(){const n=new Date();return new Date(n.getFullYear(),n.getMonth()+1,1,0,0,0,0).toISOString()}
function removeFix(){const x=document.getElementById('dextersDealVisibleFix');if(x)x.remove();activeClaim=null;if(timer){clearInterval(timer);timer=null}}
function qr(target,text){target.innerHTML='';if(window.QRCode){try{new window.QRCode(target,{text,width:190,height:190});return}catch(e){}}target.innerHTML='<div style="color:#111;padding:10px;font-weight:900;word-break:break-all">'+text+'</div>'}
async function render(){if(busy)return;busy=true;try{
 const offers=document.getElementById('offers');if(!offers||!token())return;
 const setting=await req('/rest/v1/loyalty_deal_settings?id=eq.1&select=auto_enabled',{method:'GET'});if(!(Array.isArray(setting)&&setting[0]&&setting[0].auto_enabled)){removeFix();return}
 const d=DEALS[new Date().getMonth()];const x=await rpc('loyalty_claim_deal',{p_deal_key:dealKey(d),p_expires_at:nextMonthIso()});const claim=Array.isArray(x)?x[0]:x;if(!claim||claim.redeemed_at){removeFix();return}
 activeClaim=claim;
 let box=document.getElementById('dextersDealVisibleFix');if(!box){box=document.createElement('div');box.id='dextersDealVisibleFix';box.className='offer';offers.prepend(box)}
 box.innerHTML='<div style="display:inline-block;background:#243a5e;color:#ffd43b;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900;text-transform:uppercase">'+d.category+'</div><h3 style="margin:10px 0 6px">'+d.icon+' '+d.title+'</h3><p>'+d.description+'</p><div><span style="text-decoration:line-through;color:#94a3b8;margin-right:8px">'+d.normal+'</span><strong style="font-size:27px;color:#9ff3c5">'+d.price+'</strong></div><p style="font-weight:900;color:#9ff3c5;margin-top:10px">ONE USE ONLY</p><div id="dextersDealVisibleQr" style="background:#fff;border-radius:14px;padding:10px;width:max-content;max-width:100%;margin:12px auto"></div><p class="tiny muted">Show this QR to staff. Once scanned successfully, this deal disappears from your account and cannot be used again.</p>';
 qr(document.getElementById('dextersDealVisibleQr'),'DEXTERS_DEAL:'+claim.claim_id);
 if(!timer)timer=setInterval(check,1500);
 }catch(e){}finally{busy=false}}
async function check(){if(!activeClaim||!token())return;try{const d=await req('/rest/v1/loyalty_deal_claims?id=eq.'+encodeURIComponent(activeClaim.claim_id)+'&select=redeemed_at',{method:'GET'});if(Array.isArray(d)&&d[0]&&d[0].redeemed_at)removeFix()}catch(e){}}
function boot(){render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,500);setTimeout(boot,1500);setInterval(boot,10000);new MutationObserver(()=>setTimeout(boot,0)).observe(document.body,{childList:true,subtree:true});
})();
