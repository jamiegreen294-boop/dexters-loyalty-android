async function startHub(){
  const last = document.getElementById('lastOpened');
  const dashLast = document.getElementById('dashLast');
  const dashLastTime = document.getElementById('dashLastTime');
  const status = document.getElementById('installStatus');
  const installBtn = document.getElementById('installBtn');
  const HISTORY_KEY='dextersHubRecentV2';
  const hubStatusText=document.getElementById('hubStatusText');
  const summaryUpdated=document.getElementById('summaryUpdated');
  const CURRENT_KDS='https://app.dextersspot.co.uk/kds-order-test.html';
  document.querySelectorAll('a[href="https://dexters-kds.vercel.app"]').forEach(a=>a.href=CURRENT_KDS);
  function renderConnectivity(){
    if(hubStatusText)hubStatusText.textContent=navigator.onLine?'Hub ready':'Offline mode';
  }

  function fmtTime(iso){
    if(!iso)return '—';
    try{return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}catch{return '—'}
  }
  function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return []}}
  function saveHistory(name){
    const items=getHistory();
    items.unshift({name,time:new Date().toISOString()});
    localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,8)));
    localStorage.setItem('dextersHubLastApp',name);
    localStorage.setItem('dextersHubLastOpen',new Date().toISOString());
  }
  function renderHistory(){
    const items=getHistory();
    const box=document.getElementById('recentActivity');
    if(box) box.innerHTML=items.length?items.slice(0,5).map(x=>'<div class="activity-item"><b>'+x.name+'</b><span>'+fmtTime(x.time)+'</span></div>').join(''):'<p class="empty">No apps opened yet.</p>';
    const saved=localStorage.getItem('dextersHubLastApp');
    const time=localStorage.getItem('dextersHubLastOpen');
    if(saved){last.textContent='Last opened: '+saved;dashLast.textContent=saved;dashLastTime.textContent=fmtTime(time)}
  }
  function renderAccountsCount(){
    try{
      const entries=JSON.parse(localStorage.getItem('dextersAccountsTestLedgerV1')||'[]');
      const arr=Array.isArray(entries)?entries:[];
      document.getElementById('accountsCount').textContent=arr.length;
      const expenses=arr.filter(x=>x.type==='expense');
      const spend=expenses.reduce((a,x)=>a+(Number(x.total)||0),0);
      const vat=expenses.reduce((a,x)=>a+(Number(x.vat)||0),0);
      const spendEl=document.getElementById('accountsSpend');
      const textEl=document.getElementById('accountsText');
      if(spendEl)spendEl.textContent='£'+spend.toFixed(2);
      if(textEl)textEl.textContent=expenses.length+' saved expense'+(expenses.length===1?'':'s')+' · VAT £'+vat.toFixed(2);
    }catch{
      document.getElementById('accountsCount').textContent='0';
    }
  }

  async function renderSundaySummary(){
    const totalEl=document.getElementById('sundayTotal');
    const textEl=document.getElementById('sundayText');
    if(!totalEl||!textEl)return;

    try{
      const cached=JSON.parse(localStorage.getItem('dextersSundayHubSummaryV1')||'null');
      if(cached && cached.date){
        const age=Date.now()-new Date(cached.updatedAt||0).getTime();
        const dinners=Number(cached.dinners)||0;
        totalEl.textContent=String(dinners);
        textEl.textContent=(cached.enabled?'Ordering enabled':'Ordering closed')+' · '+cached.date+' · '+dinners+' dinner'+(dinners===1?'':'')+(age>21600000?' · refresh Sunday admin':'');
        if(age<=21600000)return;
      }
    }catch{}

    if(!window.supabase){totalEl.textContent='—';textEl.textContent='Open Sunday admin once to update Hub totals.';return}
    try{
      const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
      const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
      const sb=window.supabase.createClient(U,K);
      const {data}=await sb.auth.getSession();
      const token=data.session?.access_token;
      if(!token)throw new Error('Sign-in required');
      async function call(body){
        const r=await fetch(U+'/functions/v1/sunday-roast-test-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||'Request failed');
        return d;
      }
      const status=await call({action:'status'});
      const date=status.settings?.collection_date;
      if(!date)throw new Error('No Sunday set');
      const prep=await call({action:'prep_summary',collection_date:date});
      const dinners=Number(prep.totals?.dinners)||0;
      totalEl.textContent=String(dinners);
      textEl.textContent=(status.settings?.enabled?'Ordering enabled':'Ordering closed')+' · '+date+' · '+dinners+' dinner'+(dinners===1?'':'s');
      try{localStorage.setItem('dextersSundayHubSummaryV1',JSON.stringify({date,enabled:!!status.settings?.enabled,dinners,updatedAt:new Date().toISOString()}))}catch{}
    }catch(e){
      totalEl.textContent='—';
      textEl.textContent='Open Sunday admin once to update Hub totals.';
    }
  }


  async function refreshOperations(){
    const updated=document.getElementById('opsUpdated');
    if(updated)updated.textContent='Updating…';
    if(!window.supabase)return;
    try{
      const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
      const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
      const sb=window.supabase.createClient(U,K);
      const activeCollection=['pending','accepted','preparing','ready','amendment_requested'];
      const activeTables=['new','accepted','cooking','ready','bill_requested'];
      const [c,t,set,stock]=await Promise.all([
        sb.from('collection_orders').select('id,status',{count:'exact',head:false}).in('status',activeCollection),
        sb.from('table_service_orders').select('id,status',{count:'exact',head:false}).in('status',activeTables),
        sb.from('collection_ordering_settings').select('enabled').limit(1).maybeSingle(),
        sb.from('loyalty_menu_items').select('id',{count:'exact',head:true}).eq('active',true).eq('in_stock',false)
      ]);
      const cCount=c.count ?? (Array.isArray(c.data)?c.data.length:0);
      const tCount=t.count ?? (Array.isArray(t.data)?t.data.length:0);
      const sCount=stock.count ?? 0;
      const enabled=!!set.data?.enabled;
      document.getElementById('opsCollection').textContent=String(cCount);
      document.getElementById('opsCollectionText').textContent=cCount===1?'1 active collection order':cCount+' active collection orders';
      document.getElementById('opsTables').textContent=String(tCount);
      document.getElementById('opsTablesText').textContent=tCount===1?'1 active table order':tCount+' active table orders';
      document.getElementById('opsCollectionOpen').textContent=enabled?'OPEN':'CLOSED';
      document.getElementById('opsCollectionOpenText').textContent=enabled?'Customers can place collection orders':'Collection orders are currently paused';
      document.getElementById('opsStock').textContent=String(sCount);
      document.getElementById('opsStockText').textContent=sCount===1?'1 menu item marked out of stock':sCount+' menu items marked out of stock';
    }catch(e){
      ['opsCollection','opsTables','opsCollectionOpen','opsStock'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—'});
      const el=document.getElementById('opsUpdated');if(el)el.textContent='Live data unavailable';
      return;
    }
    if(updated)updated.textContent='Updated '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  }

  async function refreshOwnerSummary(){
    if(summaryUpdated)summaryUpdated.textContent='Updating…';
    renderAccountsCount();
    await renderSundaySummary();
    if(summaryUpdated)summaryUpdated.textContent='Updated '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  }

  document.querySelectorAll('a[data-app]').forEach(link=>link.addEventListener('click',()=>saveHistory(link.dataset.app||"Dexter's app")));
  document.getElementById('clearHistory')?.addEventListener('click',()=>{localStorage.removeItem(HISTORY_KEY);localStorage.removeItem('dextersHubLastApp');localStorage.removeItem('dextersHubLastOpen');last.textContent='No app opened yet';dashLast.textContent='None yet';dashLastTime.textContent='—';renderHistory()});

  document.getElementById('refreshBtn')?.addEventListener('click',()=>location.reload());
  document.getElementById('summaryRefresh')?.addEventListener('click',refreshOwnerSummary);
  document.getElementById('opsRefresh')?.addEventListener('click',refreshOperations);
  document.getElementById('fullscreenBtn')?.addEventListener('click',async()=>{
    try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}
    catch{if(status)status.textContent='Full screen is controlled by this tablet/browser.'}
  });

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone&&status)status.textContent="Dexter's Hub is installed on this tablet.";

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.hidden=false;if(status)status.textContent='Ready to install on this tablet.'});
  installBtn?.addEventListener('click',async()=>{if(!deferredPrompt){if(status)status.textContent='Open the browser menu and choose Install app or Add to Home screen.';return}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.hidden=true});
  window.addEventListener('appinstalled',()=>{if(status)status.textContent="Dexter's Hub installed successfully.";installBtn.hidden=true});

  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/hub-sw.js',{scope:'/'}).catch(()=>{if(status)status.textContent='Hub works online; offline shell could not be enabled on this browser.'}));

  renderConnectivity();
  renderHistory();
  refreshOwnerSummary();
  refreshOperations();
  window.addEventListener('online',renderConnectivity);
  window.addEventListener('offline',renderConnectivity);
  window.addEventListener('pageshow',()=>{renderConnectivity();renderHistory();refreshOwnerSummary();refreshOperations()});
}
(() => {
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
  const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const ACCESS=U+'/functions/v1/hub-owner-access-test';
  const sb=window.supabase.createClient(U,K);
  const gate=document.getElementById('hubAuth');
  const shell=document.getElementById('hubShell');
  const errorEl=document.getElementById('hubAuthError');
  let started=false;
  async function authorised(session){
    if(!session?.access_token)return false;
    try{const r=await fetch(ACCESS,{headers:{apikey:K,Authorization:'Bearer '+session.access_token},cache:'no-store'});return r.ok}catch{return false}
  }
  async function apply(session){
    if(await authorised(session)){
      gate.hidden=true;shell.hidden=false;errorEl.textContent='';
      if(!started){started=true;await startHub()}
      return true;
    }
    gate.hidden=false;shell.hidden=true;return false;
  }
  document.getElementById('hubAuthLogin').addEventListener('click',async()=>{
    errorEl.textContent='Signing in…';
    const email=document.getElementById('hubAuthEmail').value.trim();
    const password=document.getElementById('hubAuthPassword').value;
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error||!await apply(data.session)){await sb.auth.signOut();errorEl.textContent=error?.message||'Owner access required.'}
  });
  document.getElementById('hubAuthPassword').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('hubAuthLogin').click()});
  sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){gate.hidden=false;shell.hidden=true}else if(session)apply(session)});
  sb.auth.getSession().then(({data})=>apply(data.session));
})();