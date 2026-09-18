(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const VERSION='2026-09';
const $=id=>document.getElementById(id);
function token(){try{const j=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return j?.access_token||j?.currentSession?.access_token||j?.session?.access_token||''}catch{return''}}
function subject(t){try{let x=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';return JSON.parse(atob(x)).sub||''}catch{return''}}
async function request(path,options={}){
 const t=token(); if(!t) throw Error('Please sign in again.');
 const r=await fetch(U+'/rest/v1/'+path,{...options,headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json',...(options.headers||{})}});
 const d=await r.json().catch(()=>({}));
 if(!r.ok) throw Error(d.message||d.error||'Could not update your marketing choice.');
 return r.status===204?null:d;
}
function css(){
 if($('dxMarketingConsentStyle'))return;
 const s=document.createElement('style');s.id='dxMarketingConsentStyle';s.textContent=`
#dxMarketingConsent{margin-top:12px}
.dx-consent-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.dx-consent-heading h2{margin-bottom:5px}.dx-consent-heading p{margin:0 0 10px}
.dx-consent-status{min-height:18px;margin-top:9px;text-align:center}
.dx-consent-choice{display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-top:1px solid #ffffff18;cursor:pointer}
.dx-consent-choice input{width:22px;height:22px;flex:none;margin:1px 0;accent-color:var(--yellow)}
.dx-consent-choice span{display:grid;gap:3px}.dx-consent-choice strong{font-size:15px}.dx-consent-choice small{color:var(--muted);font-size:12px;line-height:1.45}
.dx-consent-note{line-height:1.5;margin:8px 0 13px}
#dxMarketingGate{position:fixed;inset:0;z-index:99990;display:grid;place-items:center;padding:18px;background:#05070bd9;backdrop-filter:blur(5px)}
#dxMarketingGate .dx-gate-card{width:min(100%,520px);max-height:90vh;overflow:auto;background:var(--card,#161e2a);border:1px solid #ffffff2a;border-radius:18px;padding:22px;box-shadow:0 24px 70px #0009}
#dxMarketingGate h2{margin:0 0 8px}.dx-gate-sub{color:var(--muted,#aab4c2);line-height:1.5;margin:0 0 14px}
#dxMarketingGate .dx-gate-error{color:#ffb4c0;min-height:20px;margin-top:8px}
.dx-gate-option{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-top:1px solid #ffffff18;cursor:pointer}
.dx-gate-option input{width:22px;height:22px;margin:1px 0;accent-color:var(--yellow);flex:none}
.dx-gate-option span{display:grid;gap:3px}.dx-gate-option small{color:var(--muted,#aab4c2);line-height:1.4}
#dxSignupMarketingChoice{margin:12px 0;padding:14px;border:1px solid #ffffff20;border-radius:12px;background:#ffffff06}
#dxSignupMarketingChoice .dx-required{font-size:11px;font-weight:900;color:var(--yellow);text-transform:uppercase;letter-spacing:.08em}
@media(max-width:480px){#dxMarketingGate{padding:10px}#dxMarketingGate .dx-gate-card{padding:18px}}
`;document.head.appendChild(s)
}
function consentRows(){const id=subject(token());return id?request('customer_consents?select=marketing_consent,email_consent,sms_consent,marketing_choice_made,marketing_choice_at&customer_id=eq.'+encodeURIComponent(id)+'&limit=1'):Promise.resolve([])}
async function saveChoice(email,sms,source){
 const id=subject(token());if(!id)throw Error('Please sign in again.');
 const now=new Date().toISOString(),reason=source||'loyalty_app';
 await request('customer_consents?on_conflict=customer_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({customer_id:id,marketing_consent:email||sms,email_consent:email,sms_consent:sms,marketing_choice_made:true,marketing_choice_at:now,consent_source:reason,consent_version:VERSION,consent_at:now,updated_at:now})});
 await request('marketing_suppressions?on_conflict=customer_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({customer_id:id,email_suppressed:!email,sms_suppressed:!sms,email_suppressed_at:email?null:now,sms_suppressed_at:sms?null:now,reason,updated_at:now})});
 return null;
}
function gateMarkup(){
 const g=document.createElement('div');g.id='dxMarketingGate';g.innerHTML=`<div class="dx-gate-card" role="dialog" aria-modal="true" aria-labelledby="dxGateTitle">
 <h2 id="dxGateTitle">Marketing preferences</h2>
 <p class="dx-gate-sub">Before you continue, please choose whether Dexter’s can send you marketing emails and offers. You can say No and still use the app. <a href="/privacy.html" target="_blank" rel="noopener">Privacy notice</a>.</p>
 <label class="dx-gate-option"><input type="radio" name="dxGateChoice" value="yes"><span><strong>Yes, send me Dexter’s offers and news by email</strong><small>You can withdraw this permission at any time.</small></span></label>
 <label class="dx-gate-option"><input type="radio" name="dxGateChoice" value="no"><span><strong>No thanks</strong><small>You can still use your account, order, earn rewards and change your choice later.</small></span></label>
 <button id="dxGateSave" type="button" class="btn primary" disabled>Save choice & continue</button>
 <div id="dxGateError" class="dx-gate-error" role="status" aria-live="polite"></div>
 </div>`;
 document.body.appendChild(g);
 const radios=g.querySelectorAll('input[name="dxGateChoice"]'),btn=$('dxGateSave');
 radios.forEach(r=>r.addEventListener('change',()=>btn.disabled=false));
 btn.onclick=async()=>{const v=g.querySelector('input[name="dxGateChoice"]:checked')?.value;if(!v){return}btn.disabled=true;$('dxGateError').textContent='Saving…';try{await saveChoice(v==='yes',false,'loyalty_app_required_choice');g.remove();window.dispatchEvent(new CustomEvent('dextersMarketingChoiceChanged'))}catch(e){btn.disabled=false;$('dxGateError').textContent=e.message}};
 return g
}
let gateBusy=false,gateDone=false;
async function enforceChoice(){
 if(gateBusy||gateDone||!token()||$('dxMarketingGate'))return;
 gateBusy=true;css();
 try{const rows=await consentRows(),c=rows?.[0];if(c?.marketing_choice_made){gateDone=true;return}gateMarkup()}catch(e){console.warn('Marketing choice check failed',e)}finally{gateBusy=false}
}
function accountCard(){
 const page=$('accountPage');if(!page||$('dxMarketingConsent'))return;
 css();const first=page.querySelector('.card');if(!first)return;
 const card=document.createElement('div');card.id='dxMarketingConsent';card.className='card dx-consent-card';
 card.innerHTML=`<div class="dx-consent-heading"><div><h2>Marketing preferences</h2><p class="muted">Choose whether Dexter’s may send you offers and loyalty news.</p></div></div>
 <label class="dx-consent-choice"><input id="dxConsentEmail" type="checkbox"><span><strong>Email offers</strong><small>Offers, rewards and Dexter’s news by email.</small></span></label>
 <label class="dx-consent-choice"><input id="dxConsentSms" type="checkbox"><span><strong>Text message offers</strong><small>Occasional offers and loyalty news by SMS.</small></span></label>
 <p class="tiny muted dx-consent-note">A marketing choice is required, but choosing “No thanks” does not affect your account, orders or rewards. You can change your mind at any time. Dexter’s keeps an opt-out record so you are not contacted by mistake. <a href="/privacy.html" target="_blank" rel="noopener">Privacy notice</a>.</p>
 <button id="dxConsentSave" type="button" class="btn primary">Save marketing preferences</button>
 <button id="dxConsentUnsubscribe" type="button" class="btn" style="margin-top:8px">Unsubscribe from all marketing</button>
 <div id="dxConsentStatus" class="tiny muted dx-consent-status" role="status" aria-live="polite"></div>`;
 first.after(card);$('dxConsentSave').onclick=saveAccount;$('dxConsentUnsubscribe').onclick=unsubscribeAll;loadAccount();
}
async function loadAccount(){
 const status=$('dxConsentStatus');try{const rows=await consentRows(),c=rows?.[0];$('dxConsentEmail').checked=!!c?.email_consent;$('dxConsentSms').checked=!!c?.sms_consent;if(status)status.textContent=c?.marketing_choice_made?'':'Please make a marketing choice.'}catch(e){if(status)status.textContent='Preferences could not be loaded.'}
}
async function saveAccount(){
 const btn=$('dxConsentSave'),status=$('dxConsentStatus'),email=!!$('dxConsentEmail')?.checked,sms=!!$('dxConsentSms')?.checked;
 btn.disabled=true;status.textContent='Saving…';try{await saveChoice(email,sms,'loyalty_app_account');status.textContent='✓ Marketing preferences saved.';gateDone=true;if($('dxMarketingGate'))$('dxMarketingGate').remove()}catch(e){status.textContent=e.message}finally{btn.disabled=false}
}
async function unsubscribeAll(){
 const btn=$('dxConsentUnsubscribe'),status=$('dxConsentStatus');if(!btn)return;
 btn.disabled=true;status.textContent='Unsubscribing…';
 try{
  await saveChoice(false,false,'loyalty_app_unsubscribe_all');
  if($('dxConsentEmail'))$('dxConsentEmail').checked=false;
  if($('dxConsentSms'))$('dxConsentSms').checked=false;
  status.textContent='✓ Unsubscribed. Dexter’s will not send you marketing emails or texts unless you opt in again.';
  gateDone=true;
 }catch(e){status.textContent=e.message}finally{btn.disabled=false}
}
function signupChoicePanel(){
 if($('dxSignupMarketingChoice')||!$('authView'))return;
 css();const panel=document.createElement('div');panel.id='dxSignupMarketingChoice';panel.innerHTML=`<div class="dx-required">Marketing choice required when creating an account</div><p class="tiny muted">Choose one option — “No thanks” is allowed and will not affect your account. Dexter’s uses consent for marketing and you can withdraw it at any time. <a href="/privacy.html" target="_blank" rel="noopener">Privacy notice</a>.</p><label class="dx-consent-choice"><input type="radio" name="dxSignupMarketing" value="yes"><span><strong>Yes, email me Dexter’s offers and news</strong></span></label><label class="dx-consent-choice"><input type="radio" name="dxSignupMarketing" value="no"><span><strong>No thanks</strong></span></label>`;
 const target=$('authView').querySelector('.card:last-child')||$('authView');target.appendChild(panel);
}
function signupChoiceSelected(){return !!document.querySelector('input[name="dxSignupMarketing"]:checked')}
function interceptSignup(){
 document.addEventListener('click',async e=>{
  const el=e.target.closest('button,input[type="submit"],a');if(!el)return;
  const text=(el.textContent||el.value||'').trim().toLowerCase();
  if(!/sign up|signup|register|create account|join/.test(text))return;
  if(!$('authView')||$('authView').classList.contains('hidden'))return;
  if(!signupChoiceSelected()){e.preventDefault();e.stopImmediatePropagation();signupChoicePanel();alert('Please choose Yes or No for marketing before creating your account.');return}
 },true);
}
function sync(){
 if(!$('appView')?.classList.contains('hidden')){accountCard();enforceChoice()}
 else {signupChoicePanel()}
}
function boot(){css();sync();setTimeout(sync,500);setTimeout(sync,1500);interceptSignup();const av=$('appView');if(av)new MutationObserver(sync).observe(av,{attributes:true,attributeFilter:['class']});window.addEventListener('dextersMarketingChoiceChanged',()=>{gateDone=true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();