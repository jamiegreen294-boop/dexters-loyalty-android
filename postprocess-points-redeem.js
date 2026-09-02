const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
if(s.includes('dextersPointsRedeemScript')){console.log('points redemption already present');process.exit(0)}
const addon=String.raw`<style id="dextersPointsRedeemStyle">
#dxRewardsRedeemCard{margin-top:14px}
.dx-pr-cat{margin-top:12px;border:1px solid #ffffff18;border-radius:14px;overflow:hidden;background:var(--navy2)}
.dx-pr-cat-head{padding:10px 11px;background:#ffffff09;font-size:12px;font-weight:950;color:var(--white);display:flex;justify-content:space-between;gap:8px;align-items:center}
.dx-pr-cat-count{font-size:9px;padding:4px 7px;border-radius:999px;background:var(--yellow);color:#111;font-weight:950}
.dx-pr-reward{padding:11px;border-top:1px solid #ffffff12}
.dx-pr-reward:first-child{border-top:0}
.dx-pr-row{display:flex;justify-content:space-between;gap:9px;align-items:flex-start}
.dx-pr-name{font-weight:900;line-height:1.35}
.dx-pr-redeem{width:auto!important;white-space:nowrap}
.dx-pr-pending{margin-top:11px;padding:11px 12px;border-radius:13px;background:var(--navy2);font-size:12px;line-height:1.45}
#dxPendingRedemptions{margin-top:16px;padding-top:13px;border-top:1px solid #ffffff1a}
.dx-pr-queue-item{margin-top:9px;padding:11px;border-radius:13px;background:var(--navy2);border:1px solid #ffffff15}
.dx-pr-qhead{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.dx-pr-ref{font-size:10px;color:var(--yellow);font-weight:950}
.dx-pr-empty{padding:11px;border-radius:12px;background:var(--navy2);color:var(--muted);font-size:11px;text-align:center}
.dx-pr-confirm{margin-top:9px}
</style><script id="dextersPointsRedeemScript">(function(){
'use strict';
var U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function token(){try{var j=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return j&&((j.currentSession&&j.currentSession.access_token)||(j.session&&j.session.access_token)||j.access_token)||''}catch(e){return''}}
async function api(body){var t=token();if(!t)throw new Error('Sign in to use points.');var r=await fetch(U+'/functions/v1/loyalty-points-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});var d=await r.json();if(!r.ok)throw new Error(d.error||'Points unavailable');return d}
function groupRewards(items){var g={};(items||[]).forEach(function(x){var k=x.category||'Menu';(g[k]||(g[k]=[])).push(x)});return g}
function ensureCustomerCard(){
  var old=$('dxRewardsPointsCard'),qr=$('qrPage');
  if(!qr)return null;
  if(old)old.style.display='none';
  var card=$('dxRewardsRedeemCard');
  if(!card){card=document.createElement('div');card.className='card dx-points-card';card.id='dxRewardsRedeemCard';if(old&&old.parentNode){old.after(card)}else{qr.appendChild(card)}}
  return card
}
function customerHtml(d){
  var groups=groupRewards(d.rewards||[]);
  var cats=Object.keys(groups).map(function(cat){
    return '<div class="dx-pr-cat"><div class="dx-pr-cat-head"><span>'+esc(cat)+'</span><span class="dx-pr-cat-count">'+groups[cat].length+' unlocked</span></div>'+groups[cat].map(function(x){return '<div class="dx-pr-reward"><div class="dx-pr-row"><div><div class="dx-pr-name">'+esc(x.name)+'</div><div class="tiny muted" style="margin-top:5px">'+esc(x.points_required)+' points</div></div><button type="button" class="btn primary dx-pr-redeem" data-item-id="'+esc(x.id)+'" '+(d.pending_redemption?'disabled':'')+'>'+(d.pending_redemption?'Pending':'Redeem')+'</button></div></div>'}).join('')+'</div>'
  }).join('');
  var pending=d.pending_redemption?'<div class="dx-pr-pending"><b style="color:var(--white)">Waiting for staff confirmation</b><br>'+esc(d.pending_redemption.item_name)+'<br><span class="muted">Category: '+esc(d.pending_redemption.category_name)+' · '+esc(d.pending_redemption.points_cost)+' points · Ref '+esc(d.pending_redemption.reference_code)+'</span></div>':'';
  return '<h2>⭐ Dexter’s Points</h2><div class="dx-points-balance">'+esc(d.points||0)+'</div><div class="muted">points · worth £'+esc(d.value_gbp||'0.00')+'</div><div class="dx-points-note"><b style="color:var(--white)">1 point for every full £1 spent.</b> 1 point = £0.01 reward value.</div><h3 style="margin-top:18px">What you can get free</h3>'+(cats||'<p class="muted">No full menu item unlocked yet.</p>')+pending
}
async function refreshCustomer(){var card=ensureCustomerCard();if(!card)return;try{var d=await api({action:'me'});card.innerHTML=customerHtml(d);card.querySelectorAll('.dx-pr-redeem').forEach(function(b){b.onclick=function(){requestRedeem(b.getAttribute('data-item-id'),b)}})}catch(e){card.innerHTML='<h2>⭐ Dexter’s Points</h2><p class="muted">'+esc(e.message)+'</p>'}}
async function requestRedeem(itemId,btn){if(!itemId||!btn)return;btn.disabled=true;var old=btn.textContent;btn.textContent='Sending…';try{await api({action:'redeem_request',item_id:itemId});await refreshCustomer();await refreshQueue()}catch(e){btn.disabled=false;btn.textContent=old;alert(e.message)}}
function ensureQueue(){var staff=$('dxStaffPointsCard');if(!staff)return null;var box=$('dxPendingRedemptions');if(!box){box=document.createElement('div');box.id='dxPendingRedemptions';box.innerHTML='<h3>Pending Redemptions</h3><div class="dx-pr-empty">No customers waiting to redeem points.</div>';staff.appendChild(box)}return box}
async function refreshQueue(){var box=ensureQueue();if(!box)return;try{var d=await api({action:'pending_redemptions'}),rows=d.redemptions||[];box.innerHTML='<h3>Pending Redemptions</h3><div class="tiny muted" style="margin-bottom:6px">Only customers currently waiting for a points redemption are shown here. Confirmed customers disappear automatically.</div>'+(rows.length?rows.map(function(r){return '<div class="dx-pr-queue-item"><div class="dx-pr-qhead"><div><strong>'+esc(r.customer_name)+'</strong><div class="tiny muted">Code '+esc(r.loyalty_code)+'</div></div><div class="dx-pr-ref">'+esc(r.reference_code)+'</div></div><div class="tiny" style="margin-top:7px"><strong>'+esc(r.item_name)+'</strong><br>Category: '+esc(r.category_name)+'<br>'+esc(r.points_cost)+' points</div><button type="button" class="btn primary dx-pr-confirm" data-redemption-id="'+esc(r.id)+'">Confirm Redemption</button></div>'}).join(''):'<div class="dx-pr-empty">No customers waiting to redeem points.</div>');box.querySelectorAll('.dx-pr-confirm').forEach(function(b){b.onclick=function(){confirmRedeem(b.getAttribute('data-redemption-id'),b)}})}catch(e){box.innerHTML='<h3>Pending Redemptions</h3><div class="dx-pr-empty">'+esc(e.message)+'</div>'}}
async function confirmRedeem(id,btn){if(!id||!btn)return;btn.disabled=true;btn.textContent='Confirming…';try{var d=await api({action:'confirm_redemption',redemption_id:id});await refreshQueue();await refreshCustomer();var st=$('dxPointsStatus');if(st){st.textContent=d.confirmed?'✓ Redemption confirmed. Customer removed from the pending list.':'Redemption was already confirmed.';st.className='dx-points-status dx-points-ok'}}catch(e){btn.disabled=false;btn.textContent='Confirm Redemption';var st=$('dxPointsStatus');if(st){st.textContent=e.message;st.className='dx-points-status dx-points-err'}}}
function boot(){ensureCustomerCard();ensureQueue();refreshCustomer();refreshQueue();setTimeout(function(){ensureCustomerCard();ensureQueue();refreshCustomer();refreshQueue()},800);new MutationObserver(function(){ensureCustomerCard();ensureQueue()}).observe(document.body,{childList:true,subtree:true});document.addEventListener('visibilitychange',function(){if(!document.hidden){refreshCustomer();refreshQueue()}});setInterval(function(){if(!document.hidden)refreshQueue()},15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
if(!s.includes('</body>'))throw new Error('No closing body tag');
s=s.replace('</body>',addon+'</body>');
if(!s.includes('dextersPointsRedeemScript')||!s.includes('dxPendingRedemptions')||!s.includes('redeem_request'))throw new Error('Points redemption injection validation failed');
fs.writeFileSync(p,s);
console.log('Dexter points redemption integration injected');
