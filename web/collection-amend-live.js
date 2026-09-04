(function(){
  // TEST-BRANCH integration layer. Requires collection-order-amend-test-api to be deployed before activation.
  // Customer never sees internal stock-check wording.
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  async function token(){try{const {data}=await sb.auth.getSession();return data.session?.access_token||''}catch{return''}}
  async function amendApi(body){const t=await token();if(!t)throw Error('Please sign in again.');const r=await fetch(U+'/functions/v1/collection-order-amend-test-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
  async function outages(){try{const d=await amendApi({action:'daily_outages'});return new Set(d.item_ids||[])}catch{return new Set()}}
  async function applyOutages(){const blocked=await outages();for(const c of categories||[])for(const i of c.items||[])if(blocked.has(String(i.id)))i.in_stock=false;try{renderMenu()}catch{}}
  function ensureAlert(){if($('collectionAmendAlert'))return;const host=$('msg')?.parentElement||document.body;const x=document.createElement('div');x.id='collectionAmendAlert';x.className='status bad hide';host.insertBefore(x,host.firstChild)}
  function showAmend(order){ensureAlert();const x=$('collectionAmendAlert');if(!x)return;x.classList.remove('hide');x.innerHTML='<b>Sorry, you need to amend your order.</b><br>'+esc(order.amendment_note||'One or more items are unavailable today.')+'<br><button type="button" id="collectionAmendMenuBtn" class="btn">Choose something else</button>';$('collectionAmendMenuBtn').onclick=()=>{$('search')?.scrollIntoView({behavior:'smooth'});$('search')?.focus()}}
  window.dextersCollectionAmend={applyOutages,showAmend,submit:amendApi};
  setTimeout(applyOutages,1200);setInterval(applyOutages,15000);
})();