(function(){
  // TEST-BRANCH integration layer. No deployment has been performed.
  // Customer never sees internal stock-check wording.
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let shownOrderId='',lastOutageKey=null;

  async function token(){try{const {data}=await sb.auth.getSession();return data.session?.access_token||''}catch{return''}}
  async function call(url,body){
    const t=await token();if(!t)throw Error('Please sign in again.');
    const r=await fetch(url,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d;
  }
  const amendApi=body=>call(U+'/functions/v1/collection-order-amend-test-api',body);
  const orderApi=body=>call(U+'/functions/v1/collection-orders-api',body);

  async function outageIds(){
    try{const d=await amendApi({action:'daily_outages'});return new Set((d.item_ids||[]).map(String))}
    catch{return new Set()}
  }
  async function applyOutagesToCategories(list,blocked){
    blocked=blocked||await outageIds();
    for(const c of list||[])for(const i of c.items||[])if(blocked.has(String(i.id)))i.in_stock=false;
    return blocked;
  }
  async function applyOutages(){
    try{
      const blocked=await outageIds();
      const key=[...blocked].sort().join('|');
      if(key===lastOutageKey)return false;
      lastOutageKey=key;
      await applyOutagesToCategories(categories||[],blocked);
      renderMenu();
      return true;
    }catch{return false}
  }

  function ensureAlert(){
    if($('collectionAmendAlert'))return $('collectionAmendAlert');
    const host=$('msg')?.parentElement||document.body;
    const x=document.createElement('div');x.id='collectionAmendAlert';x.className='status bad hide';
    host.insertBefore(x,host.firstChild);return x;
  }

  function showAmend(order){
    const x=ensureAlert();shownOrderId=String(order.id||'');
    const blocked=new Set((order.amendment_items||[]).map(String));
    const names=(order.items||[]).filter(i=>blocked.has(String(i.id||''))).map(i=>String(i.base_name||i.name||'Item'));
    x.classList.remove('hide');
    x.innerHTML='<b>Sorry, you need to amend your order.</b><br>'+
      (names.length?'Unavailable: <b>'+names.map(esc).join(', ')+'</b><br>':'')+
      esc(order.amendment_note||'One or more items are unavailable today.')+
      '<br><button type="button" id="collectionStartAmendBtn" class="btn">Amend order</button>';
    $('collectionStartAmendBtn').onclick=()=>{
      try{
        window.DexterCollectionBasket.loadAmendment(order);
        x.innerHTML='<b>Amend your order</b><br>The unavailable item has been removed. Choose a replacement from the full Dexter’s menu, then tap <b>Send amended order</b>.';
        $('search')?.scrollIntoView({behavior:'smooth',block:'start'});$('search')?.focus();
      }catch(e){x.innerHTML='<b>Could not load the order.</b><br>'+esc(e.message)}
    };
  }

  async function poll(){
    try{
      const d=await orderApi({action:'my_orders'});
      const order=(d.orders||[]).find(o=>o.status==='amendment_required');
      const x=ensureAlert();
      if(order){if(String(order.id)!==shownOrderId||x.classList.contains('hide'))showAmend(order)}
      else{x.classList.add('hide');shownOrderId=''}
    }catch{}
  }

  window.dextersCollectionAmend={applyOutages,applyOutagesToCategories,showAmend,submit:amendApi};
  setTimeout(()=>{applyOutages();poll()},1200);
  // Keep customer amendment status responsive, but do not rebuild the full menu every 5 seconds.
  setInterval(poll,5000);
  setInterval(applyOutages,60000);
})();