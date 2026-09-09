(function(){
  if(window.__dextersMarketingConsentReady)return;
  window.__dextersMarketingConsentReady=true;

  const SUPABASE_URL='https://bpnkouymdvcogeaqjmxl.supabase.co';
  const ANON_KEY='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const TABLE='customer_consents';
  const VERSION='marketing-email-v1-2026-09';
  const DISMISS_KEY='dextersMarketingConsentDismissedUntil';

  function authSession(){
    try{
      const raw=localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token');
      if(!raw)return null;
      const j=JSON.parse(raw);
      const access_token=j.access_token||j.currentSession?.access_token||j.session?.access_token;
      const user=j.user||j.currentSession?.user||j.session?.user;
      return access_token&&user?.id?{access_token,user}:null;
    }catch(e){return null}
  }

  function h(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function api(path,opts={}){
    const s=authSession(); if(!s)throw new Error('Sign in required');
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
      ...opts,
      headers:{
        apikey:ANON_KEY,
        Authorization:'Bearer '+s.access_token,
        'Content-Type':'application/json',
        Prefer:opts.prefer||'return=representation',
        ...(opts.headers||{})
      }
    });
    if(!r.ok)throw new Error('Could not update communication preferences');
    const txt=await r.text(); return txt?JSON.parse(txt):null;
  }

  async function getConsent(){
    const s=authSession(); if(!s)return null;
    const rows=await api(TABLE+'?customer_id=eq.'+encodeURIComponent(s.user.id)+'&select=*',{method:'GET'});
    return rows&&rows[0]||null;
  }

  async function saveChoice(yes){
    const s=authSession(); if(!s)throw new Error('Sign in required');
    const existing=await getConsent();
    const payload={
      customer_id:s.user.id,
      marketing_consent:!!yes,
      email_consent:!!yes,
      sms_consent:existing?.sms_consent||false,
      terms_accepted:existing?.terms_accepted||false,
      privacy_accepted:existing?.privacy_accepted||false,
      consent_version:VERSION,
      consent_source:'loyalty_app_marketing_preferences',
      consent_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
    await api(TABLE+'?on_conflict=customer_id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(payload)
    });
    localStorage.removeItem(DISMISS_KEY);
    renderPreferenceCard(payload);
    removePrompt();
    toast(yes?'Email offers are ON.':'Email offers are OFF.');
  }

  function toast(msg){
    let el=document.getElementById('dextersMarketingToast');
    if(!el){el=document.createElement('div');el.id='dextersMarketingToast';el.style.cssText='position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99999;background:#111;color:#fff;padding:11px 14px;border-radius:12px;font:700 13px system-ui;box-shadow:0 8px 28px #0007';document.body.appendChild(el)}
    el.textContent=msg;el.hidden=false;setTimeout(()=>el.hidden=true,2500);
  }

  function dismissPrompt(){
    const until=Date.now()+30*24*60*60*1000;
    localStorage.setItem(DISMISS_KEY,String(until));
    removePrompt();
  }

  function dismissed(){
    return Number(localStorage.getItem(DISMISS_KEY)||0)>Date.now();
  }

  function removePrompt(){document.getElementById('dextersMarketingConsentPrompt')?.remove()}

  function addPrompt(){
    if(document.getElementById('dextersMarketingConsentPrompt')||dismissed())return;
    const home=document.getElementById('homePage'); if(!home)return;
    const card=document.createElement('div');
    card.id='dextersMarketingConsentPrompt';
    card.className='card';
    card.innerHTML='<h2>📧 Choose your Dexter’s communication preferences</h2><p>Would you like to receive Dexter’s offers, rewards, news and promotions by email?</p><p class="tiny muted">Your choice will not affect your loyalty account or rewards. You can change it at any time in Account → Marketing Preferences.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn primary" id="dextersMarketingYes">YES, EMAIL ME</button><button class="btn" id="dextersMarketingNo">NO THANKS</button></div><button class="btn" id="dextersMarketingLater" style="margin-top:8px">REMIND ME LATER</button><div id="dextersMarketingPromptMsg" class="tiny muted" style="margin-top:8px"></div>';
    home.insertBefore(card,home.firstChild?.nextSibling||home.firstChild);
    card.querySelector('#dextersMarketingYes').onclick=()=>choose(true,card.querySelector('#dextersMarketingPromptMsg'));
    card.querySelector('#dextersMarketingNo').onclick=()=>choose(false,card.querySelector('#dextersMarketingPromptMsg'));
    card.querySelector('#dextersMarketingLater').onclick=dismissPrompt;
  }

  async function choose(yes,msg){
    try{msg.textContent='Saving…';await saveChoice(yes)}catch(e){msg.textContent=e.message||'Could not save your choice.'}
  }

  function renderPreferenceCard(consent){
    const account=document.getElementById('accountPage'); if(!account)return;
    let card=document.getElementById('dextersMarketingPrefsCard');
    if(!card){
      card=document.createElement('div');card.id='dextersMarketingPrefsCard';card.className='card';
      account.appendChild(card);
    }
    const emailOn=!!(consent&&consent.marketing_consent&&consent.email_consent);
    card.innerHTML='<h2>📧 Marketing Preferences</h2><p>Choose whether Dexter’s may email you offers, rewards, news and promotions.</p><div class="item"><b>Email marketing</b><div class="tiny muted">'+(emailOn?'ON — you can receive marketing emails.':'OFF — you will not receive marketing emails.')+'</div></div><p class="tiny muted">Changing this setting does not affect service messages such as order updates or account security messages.</p><button class="btn primary" id="dextersMarketingEnable">'+(emailOn?'KEEP EMAILS ON':'TURN EMAILS ON')+'</button><button class="btn" id="dextersMarketingDisable" style="margin-top:8px">'+(emailOn?'TURN EMAILS OFF':'KEEP EMAILS OFF')+'</button><div id="dextersMarketingPrefsMsg" class="tiny muted" style="margin-top:8px"></div>';
    card.querySelector('#dextersMarketingEnable').onclick=()=>choose(true,card.querySelector('#dextersMarketingPrefsMsg'));
    card.querySelector('#dextersMarketingDisable').onclick=()=>choose(false,card.querySelector('#dextersMarketingPrefsMsg'));
  }

  async function refresh(){
    if(!authSession()){removePrompt();return}
    try{
      const consent=await getConsent();
      renderPreferenceCard(consent);
      if(!consent)addPrompt(); else removePrompt();
    }catch(e){
      // Do not show a broken marketing prompt if the consent service is unavailable.
    }
  }

  function boot(){
    refresh();
    setTimeout(refresh,400);
    setTimeout(refresh,1400);
    new MutationObserver(()=>setTimeout(refresh,0)).observe(document.body,{childList:true,subtree:false});
    window.addEventListener('storage',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();