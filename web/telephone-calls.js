(() => {
  'use strict';
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
  const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const $=id=>document.getElementById(id);
  let events=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function previous(o){if(!o)return'No previous order';const items=Array.isArray(o.items)?o.items.map(i=>`${i.qty||1} × ${i.name||'Item'}`).join(', '):'';return`${o.source||'Order'} #${o.order_number||'—'}${items?' · '+items:''}`}
  function render(){
    const q=$('historySearch').value.trim().toLowerCase();
    const rows=events.filter(x=>`${x.customer_name||''} ${x.caller_number||''} ${x.event_type||''} ${x.callback_status||''}`.toLowerCase().includes(q));
    $('callsCount').textContent=new Set(events.map(x=>x.call_id||x.id)).size;
    $('missedCount').textContent=events.filter(x=>x.event_type==='missed').length;
    $('callbackCount').textContent=events.filter(x=>x.callback_status==='required').length;
    $('historyList').innerHTML=rows.length?rows.map(x=>`<article class="history"><div><strong>${esc(x.customer_name||(x.caller_type==='withheld'?'Withheld caller':'Guest caller'))}</strong><br><span>${esc(x.caller_type==='customer'?'Loyalty customer':'Guest caller')}</span></div><span>${esc(x.caller_number||'Withheld')}<br>${esc(new Date(x.received_at).toLocaleString('en-GB'))}</span><span>${esc(String(x.event_type||'call').toUpperCase())}<br>${esc(previous(x.previous_order))}</span>${x.callback_status==='required'?`<button type="button" data-resolve="${esc(x.id)}">Mark callback resolved</button>`:x.callback_status==='resolved'?'<span class="resolved">Callback resolved</span>':'<span>—</span>'}</article>`).join(''):'<p class="empty">No matching calls found.</p>';
    document.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>resolve(b));
  }
  function sessionToken(){try{const raw=JSON.parse(localStorage.getItem('dexters-backoffice-auth-v1')||'null');return raw?.access_token||raw?.currentSession?.access_token||raw?.session?.access_token||null}catch{return null}}
  async function api(body){const token=sessionToken();if(!token)throw Error('Your Back Office session has expired. Sign in again.');const r=await fetch(U+'/functions/v1/telephone-events-admin-test',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Telephone history could not be loaded.');return d}
  async function load(){const btn=$('refreshHistory');btn.disabled=true;try{$('liveMessage').textContent='Loading telephone calls…';const d=await api({action:'list'});events=d.events||[];$('liveMessage').textContent=`Connected · ${d.summary?.callbacks||0} callback${d.summary?.callbacks===1?'':'s'} required`;render()}catch(e){events=[];$('liveMessage').textContent=e.message;render()}finally{btn.disabled=false}}
  async function resolve(btn){if(!confirm('Mark this callback as completed?'))return;btn.disabled=true;try{await api({action:'resolve_callback',id:btn.dataset.resolve});await load()}catch(e){alert(e.message);btn.disabled=false}}
  $('historySearch').addEventListener('input',render);$('refreshHistory').addEventListener('click',load);load();setInterval(load,30000);
})();
