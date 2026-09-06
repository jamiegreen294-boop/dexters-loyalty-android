const fs=require('fs');
const p='dist/app.html';
if(!fs.existsSync(p)) throw new Error('dist/app.html missing');
let html=fs.readFileSync(p,'utf8');
const marker='dextersEmergencyLoginRecovery';
if(html.includes(marker)){console.log('Login recovery already injected');process.exit(0)}
const script=`<script id="${marker}">(function(){
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const STORAGE='sb-bpnkouymdvcogeaqjmxl-auth-token';
let busy=false;
function $(id){return document.getElementById(id)}
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function status(msg,bad){let s=$('status');if(!s){s=document.createElement('div');s.id='status';const a=$('authView');if(a&&a.parentNode)a.parentNode.insertBefore(s,a)}if(s)s.innerHTML='<div class="status '+(bad?'err':'ok')+'">'+esc(msg)+'</div>'}
async function login(e){
 if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
 if(busy)return false;
 const email=String($('loginEmail')?.value||'').trim(),password=String($('loginPassword')?.value||'');
 if(!email||!password){status('Enter your email address and password.',true);return false}
 busy=true;const b=$('loginBtn');if(b){b.disabled=true;b.textContent='Signing in…'}
 try{
   const r=await fetch(U+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.access_token||!d.refresh_token||!d.user)throw new Error(d.error_description||d.msg||d.message||'Could not sign in. Check your email and password.');
   if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);
   localStorage.setItem(STORAGE,JSON.stringify(d));
   status('Signed in. Opening Dexter’s…',false);
   location.replace('/app.html?login=ok&v=20260906-directauth2');
 }catch(err){status(err&&err.message?err.message:'Could not sign in. Please try again.',true);if(b){b.disabled=false;b.textContent='Login'}busy=false}
 return false
}
function wire(){const b=$('loginBtn');if(!b||b.dataset.directAuth==='1')return;b.dataset.directAuth='1';b.addEventListener('click',login,true);const p=$('loginPassword');if(p)p.addEventListener('keydown',ev=>{if(ev.key==='Enter')login(ev)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
setTimeout(wire,100);setTimeout(wire,800);
})();</script>`;
if(!html.includes('</body>')) throw new Error('Unexpected app.html');
html=html.replace('</body>',script+'</body>');
fs.writeFileSync(p,html);
console.log('Direct loyalty login recovery injected');
