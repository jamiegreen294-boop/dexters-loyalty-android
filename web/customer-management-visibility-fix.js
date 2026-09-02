(function(){
'use strict';
const API='https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/customer-offers-admin';
const KEY='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const STORE='sb-bpnkouymdvcogeaqjmxl-auth-token';
function token(){try{const j=JSON.parse(localStorage.getItem(STORE)||'null');return j?.access_token||j?.currentSession?.access_token||j?.session?.access_token||''}catch{return''}}
function card(){return document.getElementById('customerOffersManagerCard')}
function show(c){if(!c)return;c.classList.remove('hidden');c.style.removeProperty('display');const b=c.querySelector(':scope > .staff-collapse-toggle');if(c.classList.contains('staff-collapsed')){c.classList.remove('staff-collapsed');if(b)b.setAttribute('aria-expanded','true')}}
async function check(){const t=token(),c=card();if(!t||!c)return;try{const r=await fetch(API,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'customers'})});if(r.ok){show(c);setTimeout(()=>{if(!document.getElementById('dxCustomerManage')){const old=document.getElementById('dextersCustomerManagementLoader');if(old)old.remove();const s=document.createElement('script');s.id='dextersCustomerManagementLoader';s.src='/customer-management-live.js?v=az3';document.body.appendChild(s)}},50)}}catch(e){}}
setTimeout(check,500);setTimeout(check,1500);setTimeout(check,3500);
const rb=document.getElementById('roleBadge');if(rb)new MutationObserver(check).observe(rb,{childList:true,characterData:true,subtree:true});
const av=document.getElementById('appView');if(av)new MutationObserver(check).observe(av,{attributes:true,attributeFilter:['class']});
})();