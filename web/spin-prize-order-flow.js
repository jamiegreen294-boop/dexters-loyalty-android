(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const $=id=>document.getElementById(id);
function session(){try{const j=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return j?.access_token||j?.currentSession?.access_token||j?.session?.access_token||''}catch{return''}}
async function api(body){const t=session();if(!t)throw Error('Sign in to view your prizes.');const r=await fetch(U+'/functions/v1/collection-orders-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body||{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Could not load prizes.');return d}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function prettyDate(v){try{return new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}catch{return''}}
function ensureStyle(){if($('dxSpinClaimStyle'))return;const s=document.createElement('style');s.id='dxSpinClaimStyle';s.textContent='#dxSpinClaims{margin-top:14px}.dx-claim{padding:13px;border:1px solid #ffffff20;border-radius:14px;background:var(--navy2);margin-top:10px}.dx-claim-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.dx-claim-exp{font-size:12px;font-weight:900;color:var(--yellow)}.dx-claim-status{font-size:12px;font-weight:900;margin-top:6px}.dx-claim-used{opacity:.65}.dx-claim .btn{margin-top:10px}';document.head.appendChild(s)}
function host(){return $('spinPage')||$('rewardsPage')||$('qrPage')}
async function load(){
 const h=host();if(!h||!session())return;
 ensureStyle();
 let card=$('dxSpinClaims');
 if(!card){card=document.createElement('section');card.id='dxSpinClaims';card.className='card';card.innerHTML='<h2>🎁 Your Spin to Win prizes</h2><p class="muted">Prizes are claimed through the Dexter’s app when placing a collection order. They cannot be redeemed in store.</p><div id="dxSpinClaimList">Checking prizes…</div>';h.appendChild(card)}
 try{
   const d=await api({action:'spin_prizes'}),rows=d.prizes||[],list=$('dxSpinClaimList');
   if(!rows.length){list.innerHTML='<p class="muted">You have no available Spin to Win prizes just now.</p>';return}
   list.innerHTML=rows.map(p=>'<article class="dx-claim '+(p.status!=='available'?'dx-claim-used':'')+'"><div class="dx-claim-head"><div><strong>'+esc(p.prize_name)+'</strong><div class="dx-claim-status">'+esc(String(p.status||'').toUpperCase())+'</div></div><div class="dx-claim-exp">'+(p.expires_at?'Use by '+esc(prettyDate(p.expires_at)):'')+'</div></div>'+(p.status==='available'?'<button class="btn" data-spin-claim="'+esc(p.id)+'">Claim in app</button>':(p.status==='expired'?'<p class="muted">This prize has expired.</p>':'<p class="muted">This prize has already been used.</p>'))+'</article>').join('');
   list.querySelectorAll('[data-spin-claim]').forEach(b=>b.onclick=()=>{const id=b.dataset.spinClaim;localStorage.setItem('dexters_pending_spin_prize',id);location.href='/collection-order-test.html?spin_prize='+encodeURIComponent(id)});
 }catch(e){if($('dxSpinClaimList'))$('dxSpinClaimList').innerHTML='<p class="muted">'+esc(e.message)+'</p>'}
}
function boot(){load();setTimeout(load,500);setTimeout(load,1600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('dexters:loyalty-changed',load);
})();