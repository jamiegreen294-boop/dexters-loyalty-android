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
let busy=false,client=null;
function $(id){return document.getElementById(id)}
function status(msg,bad){let s=$('status');if(!s){s=document.createElement('div');s.id='status';const a=$('authView');if(a&&a.parentNode)a.parentNode.insertBefore(s,a)}if(s){s.innerHTML='<div class="status '+(bad?'err':'ok')+'">'+String(msg).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))+'</div>'}}
function getClient(){if(client)return client;if(!window.supabase||!window.supabase.createClient)throw new Error('Login service is still loading. Try again in a moment.');client=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}
async function login(e){
 if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
 if(busy)return false;
 const email=String($('loginEmail')?.value||'').trim(),password=String($('loginPassword')?.value||'');
 if(!email||!password){status('Enter your email address and password.',true);return false}
 busy=true;const b=$('loginBtn');if(b){b.disabled=true;b.textContent='Signing in…'}
 try{const sb=getClient();const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;if(!data||!data.session)throw new Error('Login did not complete.');status('Signed in. Opening Dexter’s…',false);setTimeout(()=>location.replace('/app.html?login=ok&v=20260906-loginfix'),120)}
 catch(err){status(err&&err.message?err.message:'Could not sign in. Please try again.',true);if(b){b.disabled=false;b.textContent='Login'}busy=false}
 return false
}
function wire(){const b=$('loginBtn');if(!b)return;b.addEventListener('click',login,true);const p=$('loginPassword');if(p)p.addEventListener('keydown',ev=>{if(ev.key==='Enter')login(ev)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
setTimeout(wire,500);
})();</script>`;
if(!html.includes('</body>')) throw new Error('Unexpected app.html');
html=html.replace('</body>',script+'</body>');
fs.writeFileSync(p,html);
console.log('Emergency loyalty login recovery injected');
