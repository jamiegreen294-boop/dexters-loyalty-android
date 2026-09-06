(() => {
  'use strict';

  const cfg = window.DEXTERS_CONFIG;
  const SESSION_KEY = 'dexters.session.v3';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let qrLoader = null;

  function session(){ try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null} }
  function token(){ return session()?.access_token || ''; }
  function headers(){ return {'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,Authorization:`Bearer ${token()}`}; }

  async function json(url, options={}){
    const r = await fetch(url,{cache:'no-store',...options});
    const text = await r.text(); let d=null;
    try{ d=text?JSON.parse(text):null; }catch{ d={message:text}; }
    if(!r.ok) throw new Error(d?.error||d?.message||`Request failed (${r.status})`);
    return d;
  }
  async function invoke(fn,body){ return json(`${cfg.functionBase}/${fn}`,{method:'POST',headers:headers(),body:JSON.stringify(body||{})}); }
  async function rpc(name,body={}){ return json(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(),body:JSON.stringify(body)}); }
  async function rest(path){ return json(`${cfg.supabaseUrl}/rest/v1/${path}`,{headers:headers()}); }

  function afterWindowLoad(fn){
    if(document.readyState==='complete') setTimeout(fn,0);
    else window.addEventListener('load',()=>setTimeout(fn,0),{once:true});
  }
  function loadQrLibrary(){
    if(window.QRCode) return Promise.resolve(window.QRCode);
    if(qrLoader) return qrLoader;
    qrLoader = new Promise((resolve,reject)=>{
      afterWindowLoad(()=>{
        if(window.QRCode){resolve(window.QRCode);return;}
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.async=true; s.defer=true;
        const timer=setTimeout(()=>{s.remove();reject(new Error('QR library timeout'));},6000);
        s.onload=()=>{clearTimeout(timer);window.QRCode?resolve(window.QRCode):reject(new Error('QR unavailable'));};
        s.onerror=()=>{clearTimeout(timer);reject(new Error('QR unavailable'));};
        document.body.appendChild(s);
      });
    });
    return qrLoader;
  }
  async function renderLoyaltyQr(code){
    const box=$('customerQr'); if(!box||!code)return;
    box.innerHTML=`<div id="customerQrImage" class="qr-image"></div><b>${esc(code)}</b><small>Dexter's loyalty code</small>`;
    try{
      await loadQrLibrary();
      const target=$('customerQrImage');
      if(target && window.QRCode) new QRCode(target,{text:String(code),width:180,height:180});
    }catch{
      const target=$('customerQrImage');
      if(target) target.innerHTML='<small class="muted">QR image unavailable — use the loyalty code shown below.</small>';
    }
  }

  function ensureCards(){
    const rewards=$('rewardsView'), home=$('homeView'), account=$('accountView');
    if(rewards && !$('coffeeRewardCard')){
      const c=document.createElement('div'); c.id='coffeeRewardCard'; c.className='card';
      c.innerHTML='<h2>☕ Coffee card</h2><div id="coffeeRewardContent" class="stack"><span class="muted">Loading coffee stamps…</span></div>';
      rewards.insertBefore(c,rewards.firstChild);
    }
    if(rewards && !$('appRewardCard')){
      const c=document.createElement('div'); c.id='appRewardCard'; c.className='card';
      c.innerHTML='<h2>🎁 App-only rewards</h2><div id="appRewardContent" class="stack"><span class="muted">Loading rewards…</span></div>';
      rewards.appendChild(c);
    }
    if(home && !$('recentOrdersCard')){
      const c=document.createElement('div'); c.id='recentOrdersCard'; c.className='card';
      c.innerHTML='<div class="section-title"><h2>Recent orders</h2><button id="viewMenuAgain" class="secondary compact" type="button">Order again</button></div><div id="recentOrdersContent" class="stack"><span class="muted">Loading order history…</span></div>';
      home.appendChild(c);
      $('viewMenuAgain')?.addEventListener('click',()=>location.href=cfg.routes.collection);
    }
    if(account && !$('loyaltyIdentityCard')){
      const c=document.createElement('div'); c.id='loyaltyIdentityCard'; c.className='card';
      c.innerHTML='<h2>Your loyalty card</h2><div id="loyaltyIdentityContent" class="stack"><span class="muted">Loading loyalty details…</span></div>';
      account.insertBefore(c,account.firstChild);
    }
  }

  async function loadProfileAndCoffee(){
    const uid=(session()?.user?.id)||null;
    let profile=null, account=null;
    try{
      const me=await json(`${cfg.supabaseUrl}/auth/v1/user`,{headers:headers()});
      const id=me?.id||me?.user?.id||uid;
      if(!id) return;
      const profiles=await rest(`profiles?id=eq.${encodeURIComponent(id)}&select=id,full_name,loyalty_code`);
      const accounts=await rest(`loyalty_accounts?user_id=eq.${encodeURIComponent(id)}&select=stamps,reward_ready`);
      profile=profiles?.[0]||null; account=accounts?.[0]||null;
    }catch{}
    if(account){
      const stamps=Math.max(0,Number(account.stamps||0));
      if($('stampsValue')) $('stampsValue').textContent=String(stamps);
      if($('coffeeRewardContent')) $('coffeeRewardContent').innerHTML=`<div class="info-row"><span>Coffee stamps</span><b>${stamps} / ${cfg.featureRules.coffeeStampsRequired}</b></div><div class="info-row"><span>Free coffee</span><b>${account.reward_ready?'Ready in your app':'Keep collecting'}</b></div><small class="muted">Free coffee is handled through Dexter's app reward flow.</small>`;
    }
    if(profile && $('loyaltyIdentityContent')){
      $('loyaltyIdentityContent').innerHTML=`<div class="info-row"><span>Name</span><b>${esc(profile.full_name||'Customer')}</b></div><div class="info-row"><span>Loyalty code</span><b>${esc(profile.loyalty_code||'—')}</b></div><small class="muted">Your existing Dexter's customer account and loyalty code are unchanged.</small>`;
      if(profile.loyalty_code) renderLoyaltyQr(profile.loyalty_code);
    }
  }

  function rewardRow(title,detail,status='Available'){
    return `<div class="item"><div><b>${esc(title)}</b><small>${esc(detail||'')}</small></div><span class="pill ${status==='Available'?'open':''}">${esc(status)}</span></div>`;
  }

  async function loadAppRewards(){
    const rows=[];
    try{
      const d=await invoke(cfg.functions.collection,{action:'spin_prizes'});
      (d?.prizes||[]).filter(x=>x.status==='available').forEach(x=>rows.push(rewardRow(x.prize_name, x.expires_at?`Expires ${new Date(x.expires_at).toLocaleDateString('en-GB')}`:'Spin to Win','Available')));
    }catch{}
    try{
      const d=await rpc('receipt_bonus_my_rewards');
      (Array.isArray(d)?d:[]).filter(x=>x.status==='active').forEach(x=>rows.push(rewardRow(x.prize_name,'Receipt bonus reward','Available')));
    }catch{}
    try{
      const d=await invoke('customer-offers-admin',{action:'customer_offers'});
      const offers=(d?.offers||[]).filter(x=>x.status==='active');
      const area=$('offersArea');
      if(area) area.innerHTML=offers.length?offers.map(o=>`<div class="item"><div><b>${esc(o.title)}</b><small>${esc(o.reward_value||o.staff_instructions||'Personal offer')}${o.expires_at?` · Expires ${new Date(o.expires_at).toLocaleDateString('en-GB')}`:''}</small></div><span class="pill open">Available</span></div>`).join(''):'<span class="muted">No personal offers right now.</span>';
      offers.forEach(o=>rows.push(rewardRow(o.title,o.reward_value||'Personal offer','Available')));
    }catch{}
    if($('appRewardContent')) $('appRewardContent').innerHTML=rows.length?rows.join(''):'<span class="muted">No extra app rewards available right now.</span>';
  }

  async function loadOrders(){
    const box=$('recentOrdersContent'); if(!box)return;
    try{
      const d=await invoke(cfg.functions.collection,{action:'my_orders'}), orders=d?.orders||[];
      if(!orders.length){box.innerHTML='<span class="muted">No previous collection orders yet.</span>';return;}
      box.innerHTML=orders.slice(0,5).map(o=>{
        const items=(Array.isArray(o.items)?o.items:[]).slice(0,4).map(i=>`${Number(i.qty||1)}× ${i.base_name||i.name||'Item'}`).join(', ');
        return `<div class="item"><div><b>Order #${esc(o.order_number||'')}</b><small>${esc(items||'Dexter\'s order')} · ${esc(o.collection_time||'')}</small></div><span class="pill">${esc(o.status||'')}</span></div>`;
      }).join('');
    }catch{ box.innerHTML='<span class="muted">Order history is temporarily unavailable.</span>'; }
  }

  async function refresh(){
    if(!token())return;
    ensureCards();
    await Promise.allSettled([loadProfileAndCoffee(),loadAppRewards(),loadOrders()]);
  }

  function bind(){
    ensureCards();
    document.querySelectorAll('[data-nav="home"],[data-nav="rewards"],[data-nav="account"],[data-action="rewards"]').forEach(n=>n.addEventListener('click',()=>setTimeout(refresh,0)));
    window.addEventListener('storage',e=>{if(e.key===SESSION_KEY)setTimeout(refresh,0)});
    setTimeout(refresh,600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();
