(() => {
  'use strict';

  const cfg = window.DEXTERS_CONFIG;
  const $ = (id) => document.getElementById(id);
  const state = { session: null, user: null, points: 0, rewards: [], pendingRedemption: null };
  const SESSION_KEY = 'dexters.session.v3';
  const REQUEST_TIMEOUT = 9000;

  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function setMessage(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text||'';el.className=`message ${type}`.trim();}
  function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));const target=$(`${name}View`);if(target)target.classList.remove('hidden');document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));window.scrollTo({top:0,behavior:'instant'});}

  async function jsonFetch(url,options={},timeout=REQUEST_TIMEOUT){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try{const r=await fetch(url,{...options,signal:controller.signal,cache:'no-store'});const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{body={raw:text}}if(!r.ok){const e=new Error(body?.msg||body?.message||body?.error_description||body?.error||`Request failed (${r.status})`);e.status=r.status;e.body=body;throw e}return body;}finally{clearTimeout(timer)}
  }
  function authHeaders(token=state.session?.access_token){const h={'Content-Type':'application/json',apikey:cfg.supabasePublishableKey};if(token)h.Authorization=`Bearer ${token}`;return h;}
  function saveSession(s){state.session=s||null;if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);}
  function storedSession(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return s?.access_token&&s?.refresh_token?s:null}catch{return null}}
  function decodeJwt(token){try{let p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return JSON.parse(atob(p))}catch{return{}}}

  async function signIn(email,password){return jsonFetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:authHeaders(null),body:JSON.stringify({email,password})});}
  async function signUp(name,email,password){return jsonFetch(`${cfg.supabaseUrl}/auth/v1/signup`,{method:'POST',headers:authHeaders(null),body:JSON.stringify({email,password,data:{name,full_name:name}})});}
  async function refreshSession(refresh_token){return jsonFetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:authHeaders(null),body:JSON.stringify({refresh_token})});}
  async function getUser(){return jsonFetch(`${cfg.supabaseUrl}/auth/v1/user`,{headers:authHeaders()});}
  async function invoke(fn,payload={}){return jsonFetch(`${cfg.functionBase}/${fn}`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)});}

  function applyTheme(){const d=new Date(),m=d.getMonth()+1,day=d.getDate();let theme='standard';if(m===9||m===10)theme='halloween';else if(m===11||m===12)theme='christmas';else if(m===1||(m===2&&day<=15))theme='valentine';document.documentElement.dataset.theme=theme;if($('themeBadge'))$('themeBadge').textContent=theme[0].toUpperCase()+theme.slice(1);}
  function setAuthenticatedUi(on){$('authView')?.classList.toggle('hidden',on);$('bottomNav')?.classList.toggle('hidden',!on);if(on)showView('home');}
  function displayName(){return state.user?.user_metadata?.name||state.user?.user_metadata?.full_name||state.user?.email?.split('@')[0]||'there';}

  function renderAccount(){if(!state.user)return;$('welcomeName').textContent=`Hi ${displayName()}`;$('accountDetails').innerHTML=`<div class="info-row"><span>Email</span><b>${escapeHtml(state.user.email||'')}</b></div><div class="info-row"><span>Customer ID</span><b>${escapeHtml((state.user.id||'').slice(0,8))}</b></div>`;}
  function setSummary(points='—',rewards='—'){$('pointsValue').textContent=Number.isFinite(Number(points))?Number(points).toLocaleString():'—';$('rewardsValue').textContent=Array.isArray(rewards)?rewards.length:(Number.isFinite(Number(rewards))?Number(rewards):'—');$('stampsValue').textContent='—';}

  function renderPoints(data){
    const points=Number(data?.points||0);state.points=points;state.rewards=Array.isArray(data?.rewards)?data.rewards:[];state.pendingRedemption=data?.pending_redemption||null;setSummary(points,state.rewards);
    const summary=$('rewardSummary');summary.innerHTML=`<div class="info-row"><span>Points</span><b>${points.toLocaleString()} (£${(points/100).toFixed(2)})</b></div><div class="info-row"><span>Free coffee</span><b>9-stamp reward preserved</b></div><div class="info-row"><span>App rewards available</span><b>${state.rewards.length}</b></div>${state.pendingRedemption?`<div class="info-row"><span>Waiting for confirmation</span><b>${escapeHtml(state.pendingRedemption.item_name||'Reward')}</b></div>`:''}`;
    $('customerQr').textContent=state.user?`DEXTERS:${state.user.id}`:'Sign in to show your loyalty QR';
    const list=$('pointsRewards');list.innerHTML='';
    if(state.pendingRedemption){list.innerHTML=`<div class="item"><b>${escapeHtml(state.pendingRedemption.item_name||'Reward')}</b><small>Reference ${escapeHtml(state.pendingRedemption.reference_code||'')}</small><span>Waiting for staff confirmation</span></div>`;return;}
    if(!state.rewards.length){list.innerHTML='<span class="muted">Keep collecting points. More free menu items unlock as your balance grows.</span>';return;}
    state.rewards.slice(0,30).forEach(r=>{const row=document.createElement('div');row.className='item reward-row';row.innerHTML=`<div><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.category||'Menu')} · ${Number(r.points_required||0)} points</small></div><button type="button" class="primary compact">Use points</button>`;row.querySelector('button').addEventListener('click',()=>requestReward(r));list.appendChild(row);});
  }

  async function loadPoints(){try{renderPoints(await invoke(cfg.functions.points,{action:'me'}));}catch(err){setSummary();$('rewardSummary').innerHTML='<span class="muted">Rewards are temporarily unavailable.</span>';}}
  async function requestReward(r){setMessage('rewardMessage',`Requesting ${r.name}…`);try{const d=await invoke(cfg.functions.points,{action:'redeem_request',item_id:r.id});state.pendingRedemption=d?.pending_redemption||null;setMessage('rewardMessage','Reward requested. Staff can confirm it from the Dexter\'s system.','success');await loadPoints();}catch(err){setMessage('rewardMessage',err.message||'Could not request reward.','error');}}

  async function loadCollectionStatus(){const pill=$('collectionStatus');try{const d=await invoke(cfg.functions.collection,{action:'status'});const open=Boolean(d?.enabled??d?.open??d?.collection_open);pill.textContent=open?'Open':'Closed';pill.classList.toggle('open',open);}catch{pill.textContent='Status unavailable';}}
  async function loadNews(){const area=$('newsArea');try{const d=await jsonFetch(`${cfg.functionBase}/${cfg.functions.news}`,{headers:authHeaders()});const items=d?.items||d?.news||(Array.isArray(d)?d:[]);area.innerHTML='';if(!Array.isArray(items)||!items.length){area.textContent='No current announcements.';return;}items.slice(0,4).forEach(x=>{const el=document.createElement('div');el.className='news-item';el.textContent=x?.message||x?.text||x?.title||String(x);area.appendChild(el);});}catch{area.textContent='Dexter\'s news will appear here when available.';}}
  async function loadOffers(){const area=$('offersArea');area.innerHTML='<span class="muted">Your personal offers remain connected to the existing Dexter\'s offers service.</span>';}
  async function hydrate(){renderAccount();await Promise.allSettled([loadPoints(),loadCollectionStatus(),loadNews(),loadOffers()]);}

  async function establishSession(session){saveSession(session);const u=await getUser();state.user=u?.user||u;renderAccount();setAuthenticatedUi(true);$('bootStatus').classList.add('hidden');await hydrate();}
  async function restoreSession(){const s=storedSession();if(!s)return false;const p=decodeJwt(s.access_token);const exp=Number(p.exp||0)*1000;try{await establishSession(exp&&exp<Date.now()+60000?await refreshSession(s.refresh_token):s);return true}catch{saveSession(null);state.user=null;return false}}
  function openRoute(path){if(path)window.location.href=path;}

  async function claimReceipt(code){return invoke(cfg.functions.receiptPoints,{token:String(code||'').trim()});}
  async function deleteAccount(){return invoke(cfg.functions.deleteAccount,{});}

  function bindActions(){
    $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('loginBtn');btn.disabled=true;setMessage('authMessage','Signing in…');try{await establishSession(await signIn($('loginEmail').value.trim(),$('loginPassword').value));setMessage('authMessage','');}catch(err){setMessage('authMessage',err.name==='AbortError'?'Login timed out. Please try again.':(err.message||'Login failed.'),'error');}finally{btn.disabled=false;}});
    $('showJoinBtn').addEventListener('click',()=>$('joinPanel').classList.remove('hidden'));$('backToLoginBtn').addEventListener('click',()=>$('joinPanel').classList.add('hidden'));
    $('joinForm').addEventListener('submit',async e=>{e.preventDefault();setMessage('joinMessage','Creating account…');try{const r=await signUp($('joinName').value.trim(),$('joinEmail').value.trim(),$('joinPassword').value);if(r?.access_token)await establishSession(r);else setMessage('joinMessage','Account created. Check your email if confirmation is required.','success');}catch(err){setMessage('joinMessage',err.message||'Could not create account.','error');}});

    document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>{const n=btn.dataset.nav;if(n==='menu')openRoute(cfg.routes.collection);else showView(n);}));
    document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.action;if(a==='spin')showView('spin');else if(a==='rewards')showView('rewards');else if(a==='receipt-points')showView('receipt');else if(a==='menu'||a==='order-again')openRoute(cfg.routes.collection);else if(a==='sunday')openRoute(cfg.routes.sunday);else if(a==='ask-dexter')openRoute(cfg.routes.askDexter);}));

    $('spinBtn').addEventListener('click',()=>{setMessage('spinMessage','Spin to Win is preserved in the rebuild, but it will not be enabled for release until its existing prize service has been verified.','error');});
    $('receiptForm').addEventListener('submit',async e=>{e.preventDefault();const code=$('receiptCode').value.trim();setMessage('receiptMessage','Checking receipt…');try{const d=await claimReceipt(code);setMessage('receiptMessage',d?.message||`Points added${d?.points_added?`: ${d.points_added}`:''}.`,'success');await loadPoints();}catch(err){setMessage('receiptMessage',err.message||'Receipt could not be claimed.','error');}});
    $('deleteAccountBtn').addEventListener('click',async()=>{if(!confirm('Delete your Dexter\'s account and loyalty data? This cannot be undone.'))return;setMessage('accountMessage','Deleting account…');try{await deleteAccount();saveSession(null);state.user=null;state.session=null;setMessage('accountMessage','Account deleted.','success');setAuthenticatedUi(false);showView('auth');}catch(err){setMessage('accountMessage',err.message||'Account could not be deleted.','error');}});
    $('logoutBtn').addEventListener('click',()=>{saveSession(null);state.user=null;state.session=null;setAuthenticatedUi(false);showView('auth');$('bottomNav').classList.add('hidden');});
  }

  async function boot(){applyTheme();bindActions();$('bootStatus').textContent='Loading Dexter\'s…';const restored=await restoreSession();if(!restored){$('bootStatus').classList.add('hidden');setAuthenticatedUi(false);showView('auth');}if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}),{once:true});}
  document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
