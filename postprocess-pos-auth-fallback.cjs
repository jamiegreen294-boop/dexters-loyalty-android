const fs=require('fs');

function patch(p){
 let s=fs.readFileSync(p,'utf8');
 s=s.replace(
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',sb=supabase.createClient(U,K);",
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',sb=null;"
 );
 s=s.replace(
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',sb=(window.supabase&&window.supabase.createClient)?window.supabase.createClient(U,K):null;",
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',sb=null;"
 );
 const helper=`\nasync function directSignIn(email,password){\n const r=await fetch(U+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({email,password})});\n const d=await r.json().catch(()=>({}));\n if(!r.ok)throw Error(d.error_description||d.msg||d.message||'Sign in failed');\n try{localStorage.setItem(AUTH_KEY,JSON.stringify(d))}catch{}\n return d;\n}\nfunction storedSession(){try{const x=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return x&&x.access_token?x:null}catch{return null}}\nasync function validateSession(session){if(!session||!session.access_token)return null;try{const r=await fetch(U+'/auth/v1/user',{headers:{apikey:K,Authorization:'Bearer '+session.access_token}});if(!r.ok)return null;const user=await r.json();return Object.assign({},session,{user:user||session.user})}catch{return null}}\nasync function signOutPos(){try{localStorage.removeItem(AUTH_KEY)}catch{}S.session=null;location.reload()}\n`;
 if(!s.includes('async function directSignIn(email,password)')) s=s.replace("const $=id=>document.getElementById(id),money=n=>", helper+"\nconst $=id=>document.getElementById(id),money=n=>");
 s=s.replace(
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?')){await sb.auth.signOut();location.reload()}};",
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?'))await signOutPos()};"
 );
 s=s.replace(
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?'))await signOutPos()};",
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?'))await signOutPos()};"
 );
 const oldLogin="$('loginBtn').onclick=async()=>{const email=$('staffEmail').value.trim(),password=$('staffPassword').value;$('loginMsg').textContent='Signing in…';const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){$('loginMsg').textContent=error.message;return}await applySession(data.session);$('loginMsg').textContent=''}";
 const patchedLogin="$('loginBtn').onclick=async function(){const email=$('staffEmail').value.trim(),password=$('staffPassword').value;if(!email||!password){$('loginMsg').textContent='Enter email and password.';return}this.disabled=true;$('loginMsg').textContent='Signing in…';try{const session=await directSignIn(email,password);if(!session||!session.access_token)throw Error('Sign in failed');await applySession(session);$('loginMsg').textContent=''}catch(e){$('loginMsg').textContent=(e&&e.message)||'Sign in failed'}finally{this.disabled=false}}";
 s=s.replace(oldLogin,patchedLogin);
 s=s.replace(/\$\('loginBtn'\)\.onclick=async\(\)=>\{const email=\$\('staffEmail'\)\.value\.trim\(\),password=\$\('staffPassword'\)\.value;[\s\S]*?finally\{\$\('loginBtn'\)\.disabled=false\}\}/,patchedLogin);
 s=s.replace(
 "sb.auth.onAuthStateChange((_e,s)=>{if(!s&&S.session)location.reload()});sb.auth.getSession().then(({data})=>applySession(data.session));",
 "validateSession(storedSession()).then(v=>{if(v)applySession(v);else{try{localStorage.removeItem(AUTH_KEY)}catch{}applySession(null)}})"
 );
 s=s.replace(/if\(sb\)\{sb\.auth\.onAuthStateChange\([\s\S]*?\}\)\}/,
 "validateSession(storedSession()).then(v=>{if(v)applySession(v);else{try{localStorage.removeItem(AUTH_KEY)}catch{}applySession(null)}})");
 fs.writeFileSync(p,s);
 console.log('POS direct auth applied to '+p);
}

for(const p of ['dist/pos-test.html','dist/pos.html']) if(fs.existsSync(p)) patch(p);
