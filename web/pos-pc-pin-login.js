(()=>{
const API=U+'/functions/v1/pc-pos-pin-auth';
const DEV_ID='dexters_pc_pin_device_id_v1',DEV_SEC='dexters_pc_pin_device_secret_v1',USER_ID='dexters_pc_pin_user_id_v1',USER_NAME='dexters_pc_pin_user_name_v1';
const FEATURE_SCRIPTS=['pos-pc-offline.js','pos-pc-session-security.js','pos-pc-v3-addon.js','pos-pc-hardware.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-pc-collection-orders.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','pos-pc-whatsapp.js','pos-pc-xepos-plus.js','pos-pc-promotions-auto.js','pos-pc-recipes.js','pos-pc-purchasing.js','pos-pc-expiry.js','pos-pc-account-statements.js','pos-pc-capacity.js','pos-pc-close-day.js','pos-pc-security-audit.js'];
const $p=id=>document.getElementById(id);
const memStore=new Map();
function cookieGet(k){try{const n=encodeURIComponent(k)+'=';const hit=document.cookie.split('; ').find(x=>x.startsWith(n));return hit?decodeURIComponent(hit.slice(n.length)):''}catch{return''}}
function cookieSet(k,v){try{document.cookie=encodeURIComponent(k)+'='+encodeURIComponent(String(v))+'; Path=/; Max-Age=31536000; SameSite=Lax';return cookieGet(k)===String(v)}catch{return false}}
function cookieRemove(k){try{document.cookie=encodeURIComponent(k)+'=; Path=/; Max-Age=0; SameSite=Lax'}catch{}}
const storage={
 get:k=>{
   try{const v=localStorage.getItem(k);if(v)return v}catch{}
   try{const v=sessionStorage.getItem(k);if(v)return v}catch{}
   const c=cookieGet(k);if(c)return c;
   return memStore.get(k)||''
 },
 set:(k,v)=>{
   const val=String(v);memStore.set(k,val);
   try{localStorage.setItem(k,val);return true}catch{}
   try{sessionStorage.setItem(k,val);return true}catch{}
   if(k!=='dexters-pos-session'&&cookieSet(k,val))return true;
   // The active Supabase session only needs to live in memory because every fresh POS open requires a staff PIN.
   // Do not reject a valid PIN merely because this Windows browser blocks persistent site storage.
   if(k==='dexters-pos-session')return true;
   return false
 },
 remove:k=>{
   memStore.delete(k);
   try{localStorage.removeItem(k)}catch{}
   try{sessionStorage.removeItem(k)}catch{}
   cookieRemove(k)
 }
};
function ensurePinStyle(){if(document.getElementById('dextersPcPinStyle'))return;const st=document.createElement('style');st.id='dextersPcPinStyle';st.textContent=`
#authGate{background:rgba(2,8,16,.78);backdrop-filter:blur(4px)}
#authGate .box{width:min(560px,94vw)!important;max-width:560px!important;padding:0!important;overflow:hidden;background:linear-gradient(180deg,#0d1d31 0%,#091624 100%);border:1px solid #31506f;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.55)}
#authGate .pcPinHead{padding:20px 22px 16px;background:#0b1a2d;border-bottom:1px solid #28415f}
#authGate .pcPinBrand{display:flex;align-items:center;justify-content:space-between;gap:12px}
#authGate .pcPinBrand strong{font-size:26px;font-weight:1000}
#authGate .pcPinBadge{background:var(--accent,#ffd43b);color:#08101d;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:1000}
#authGate .pcPinHead h2{margin:14px 0 4px;font-size:30px}
#authGate .pcPinSub{margin:0;color:#9eb0c5;font-size:14px}
#authGate .pcPinBody{padding:20px 22px 22px}
#authGate #pcPinDots{font-size:38px!important;letter-spacing:14px!important;margin:8px 0 18px!important;color:#f7fbff}
#authGate .pcPinGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
#authGate .pcPinKey{min-height:68px!important;border:1px solid #31506f!important;border-radius:13px!important;background:#142641!important;color:#fff!important;font-size:24px!important;font-weight:1000!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
#authGate .pcPinKey:active{background:#1c365a!important;transform:translateY(1px)}
#authGate #pcPinSubmit,#authGate #pcActivate{width:100%;border:0;border-radius:13px;padding:15px 16px;font-weight:1000;margin-top:12px;background:var(--accent,#ffd43b);color:#08101d}
#authGate #pcPinSubmit:disabled{opacity:.45}
#authGate #pcPinSetupAgain,#authGate #pcBackPin,#authGate #pcChooseAgain{width:100%;border:1px solid #31506f;border-radius:12px;padding:11px 12px;font-weight:900;margin-top:9px;background:#142641;color:#fff;text-decoration:none}
#authGate .pcUser{border:1px solid #31506f!important;border-radius:14px!important;background:#142641!important;color:#fff!important;font-weight:900!important;min-height:84px}
#authGate .pcUser small{color:#9eb0c5}
#authGate .pcUser:active{background:#1c365a!important}
#authGate #pcPinMsg,#authGate #pcSetupMsg{padding:2px 2px 0;min-height:22px}
#authGate .field{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #31506f;background:#09182a;color:#fff;margin:7px 0}
`;document.head.appendChild(st)}
function pinShell(title,subtitle,body){return '<div class="pcPinHead"><div class="pcPinBrand"><strong>Dexter\'s POS</strong><span class="pcPinBadge">STAFF</span></div><h2>'+title+'</h2><p class="pcPinSub">'+subtitle+'</p></div><div class="pcPinBody">'+body+'</div>'}
const headers=()=>({apikey:K,'Content-Type':'application/json'});
async function call(action,extra={}){const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),8000);try{const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...extra}),signal:ctrl.signal});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'PIN sign in failed');return x}catch(e){if(e?.name==='AbortError')throw Error('PIN service timed out. Check the internet connection and try again.');throw e}finally{clearTimeout(t)}}
function saveSession(x){if(!x?.session?.access_token)throw Error('POS session was not returned');storage.set('dexters-pos-session',JSON.stringify(x.session));if(x.device_id)storage.set(DEV_ID,x.device_id);if(x.device_secret)storage.set(DEV_SEC,x.device_secret);if(x.user_id)storage.set(USER_ID,x.user_id);if(x.display_name)storage.set(USER_NAME,x.display_name)}
function gateBox(){ensurePinStyle();const g=$p('authGate');if(!g)return null;let b=g.querySelector('.box');if(!b){b=document.createElement('div');b.className='box';g.appendChild(b)}return b}
function keypadHtml(){return '<div id="pcPinDots">○ ○ ○ ○</div><div class="pcPinGrid">'+['1','2','3','4','5','6','7','8','9','CLEAR','0','⌫'].map(k=>'<button class="pcPinKey" data-k="'+k+'">'+k+'</button>').join('')+'</div><button id="pcPinSubmit">SIGN IN WITH PIN</button><div id="pcPinMsg" class="bad"></div><button id="pcPinSetupAgain">SET UP / RESET THIS POS</button>'}
async function renderLogin(){const b=gateBox();if(!b)return;b.innerHTML=pinShell('Staff sign in','Choose your name','<div id="pcUsers">Loading staff…</div><button id="pcPinSetupAgain">SET UP THIS DEVICE AGAIN</button>');try{const x=await call('users',{device_id:storage.get(DEV_ID),device_secret:storage.get(DEV_SEC)}),users=x.users||[];const box=b.querySelector('#pcUsers');box.innerHTML=users.length?'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'+users.map(u=>'<button class="pcUser" data-id="'+String(u.id).replace(/"/g,'')+'" data-name="'+String(u.name||'Staff').replace(/"/g,'&quot;')+'" style="padding:18px 8px">'+String(u.name||'Staff').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'<br><small>'+String(u.role||'staff')+'</small></button>').join('')+'</div>':'<p>No PIN users are set up yet.</p>';box.querySelectorAll('.pcUser').forEach(btn=>btn.onclick=()=>pinFor(btn.dataset.id,btn.dataset.name))}catch(e){b.querySelector('#pcUsers').innerHTML='<p class="bad">'+e.message+'</p>'}b.querySelector('#pcPinSetupAgain').onclick=renderSetup;function pinFor(id,name){storage.set(USER_ID,id);storage.set(USER_NAME,name);b.innerHTML=pinShell(name,'Enter your staff PIN',keypadHtml()+'<button id="pcChooseAgain">CHOOSE ANOTHER NAME</button>');let pin='';const dots=b.querySelector('#pcPinDots'),msg=b.querySelector('#pcPinMsg'),submit=b.querySelector('#pcPinSubmit');function draw(){dots.textContent=Array.from({length:Math.max(4,pin.length)},(_,i)=>i<pin.length?'●':'○').join(' ');submit.disabled=pin.length<4}function press(k){if(k==='CLEAR')pin='';else if(k==='⌫')pin=pin.slice(0,-1);else if(/^\d$/.test(k)&&pin.length<6)pin+=k;msg.textContent='';draw()}b.querySelectorAll('.pcPinKey').forEach(y=>y.onclick=()=>press(y.dataset.k));submit.onclick=async()=>{submit.disabled=true;msg.textContent='Checking PIN…';try{
  const y=await call('login',{device_id:storage.get(DEV_ID),device_secret:storage.get(DEV_SEC),user_id:id,pin});
  saveSession(y);
  // The PIN service returns a real Supabase Auth session. Register it with the
  // browser Supabase client too, otherwise auth.getSession()/Edge JWT checks
  // can see an unauthenticated browser even though S.session has a token.
  let active=y.session;
  try{
    if(window.sb?.auth?.setSession && y.session?.access_token && y.session?.refresh_token){
      const {data,error}=await window.sb.auth.setSession({
        access_token:y.session.access_token,
        refresh_token:y.session.refresh_token
      });
      if(error)throw error;
      if(data?.session)active=data.session;
    }
  }catch(err){
    throw Error('Staff session could not be activated. Please enter your PIN again.');
  }
  S.session=active;
  storage.set('dexters-pos-session',JSON.stringify(active));
  msg.className='ok';msg.textContent='Signed in ✓';
  const gate=$p('authGate');if(gate)gate.classList.add('hide');
  try{
    await loadFeatures();
    if(typeof applySession==='function')await applySession(S.session);
  }catch(err){
    if(gate)gate.classList.remove('hide');
    msg.className='bad';
    msg.textContent='POS startup failed: '+String(err?.message||err)
  }
}catch(e){pin='';draw();msg.className='bad';msg.textContent=e.message;submit.disabled=false}};b.querySelector('#pcPinSetupAgain').onclick=renderSetup;b.querySelector('#pcChooseAgain').onclick=renderLogin;draw()}}
function renderSetup(){const b=gateBox();if(!b)return;b.innerHTML=pinShell('Set up PIN','One-time setup for this Windows till.','<input id="pcSetupCode" class="field" type="password" inputmode="numeric" maxlength="6" placeholder="6-digit setup code"><input id="pcNewPin" class="field" type="password" inputmode="numeric" maxlength="6" placeholder="Choose 4–6 digit PIN"><input id="pcNewPin2" class="field" type="password" inputmode="numeric" maxlength="6" placeholder="Confirm PIN"><button id="pcActivate">ACTIVATE PIN LOGIN</button><div id="pcSetupMsg" class="bad"></div>'+(storage.get(DEV_ID)?'<button id="pcBackPin">BACK TO PIN LOGIN</button>':''));const msg=b.querySelector('#pcSetupMsg'),btn=b.querySelector('#pcActivate');btn.onclick=async()=>{const code=String(b.querySelector('#pcSetupCode').value||'').replace(/\D/g,''),p1=String(b.querySelector('#pcNewPin').value||'').replace(/\D/g,''),p2=String(b.querySelector('#pcNewPin2').value||'').replace(/\D/g,'');if(code.length!==6){msg.textContent='Enter the 6-digit setup code.';return}if(p1.length<4||p1.length>6||p1!==p2){msg.textContent='Use the same 4–6 digit PIN in both PIN boxes.';return}btn.disabled=true;msg.textContent='Activating this POS…';try{const x=await call('activate',{code,pin:p1,device_name:'Dexters Windows POS'});saveSession(x);msg.className='ok';msg.textContent='PIN login activated ✓';setTimeout(()=>location.reload(),220)}catch(e){msg.className='bad';msg.textContent=e.message;btn.disabled=false}};const back=b.querySelector('#pcBackPin');if(back)back.onclick=renderLogin}
async function sessionValid(){const s=S?.session;if(!s?.access_token)return false;const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),3000);try{const r=await fetch(U+'/auth/v1/user',{headers:{apikey:K,Authorization:'Bearer '+s.access_token},cache:'no-store',signal:ctrl.signal});return r.ok}catch{return false}finally{clearTimeout(t)}}
let featuresPromise=null;function scriptUrl(name){return new URL(name,location.href).href}
function appendScript(name){return new Promise((resolve,reject)=>{window.__dextersFeatureLoading=name;const s=document.createElement('script'),timer=setTimeout(()=>{s.remove();reject(Error('Timed out loading '+name))},8000);s.src=scriptUrl(name)+(scriptUrl(name).includes('?')?'&':'?')+'build='+encodeURIComponent('20260920-raw-drawer-pulse-v10');s.async=false;s.dataset.dextersFeature=name;s.onload=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);reject(Error('Could not load '+name))};document.body.appendChild(s)})}
async function loadFeatures(){if(featuresPromise)return featuresPromise;featuresPromise=(async()=>{window.__dextersFeatureLoadComplete=false;for(const name of FEATURE_SCRIPTS)await appendScript(name);window.__dextersFeatureLoading='';window.__dextersFeatureLoadComplete=true;window.dispatchEvent(new CustomEvent('dexters-pos-features-ready'));const q=document.createElement('script');q.src='https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';q.async=true;q.dataset.dextersOptional='qrcode';document.head.appendChild(q);return true})();return featuresPromise}
let initStarted=false;async function init(){if(initStarted)return;initStarted=true;const gate=$p('authGate');if(!gate){initStarted=false;return}const configured=!!(storage.get(DEV_ID)&&storage.get(DEV_SEC));if(!configured){storage.remove('dexters-pos-session');storage.remove('dexters_pc_force_pin_lock_v1');S.session=null;gate.classList.remove('hide');window.__dextersFeatureLoadComplete=false;window.__dextersFeatureLoading='PIN';renderSetup();return}storage.remove('dexters-pos-session');storage.remove('dexters_pc_force_pin_lock_v1');S.session=null;gate.classList.remove('hide');window.__dextersFeatureLoadComplete=false;window.__dextersFeatureLoading='PIN';renderLogin()}
window.DextersPinLogin={renderLogin,renderSetup,init,loadFeatures,FEATURE_SCRIPTS};init();
})();
