const fs=require('fs');

function patch(p){
 let s=fs.readFileSync(p,'utf8');
 s=s.replace(
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',sb=supabase.createClient(U,K);",
 "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',sb=(window.supabase&&window.supabase.createClient)?window.supabase.createClient(U,K):null;"
 );
 const helper=`\nasync function directSignIn(email,password){\n const r=await fetch(U+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({email,password})});\n const d=await r.json().catch(()=>({}));\n if(!r.ok)throw Error(d.error_description||d.msg||d.message||'Sign in failed');\n try{localStorage.setItem(AUTH_KEY,JSON.stringify(d))}catch{}\n return d;\n}\nfunction storedSession(){try{const x=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return x&&x.access_token?x:null}catch{return null}}\nasync function validateSession(session){if(!session?.access_token)return null;try{const r=await fetch(U+'/auth/v1/user',{headers:{apikey:K,Authorization:'Bearer '+session.access_token}});if(!r.ok)return null;const user=await r.json();return {...session,user:user||session.user}}catch{return null}}\nasync function signOutPos(){try{if(sb)await sb.auth.signOut()}catch{}try{localStorage.removeItem(AUTH_KEY)}catch{}S.session=null;location.reload()}\n`;
 s=s.replace("const $=id=>document.getElementById(id),money=n=>", helper+"\nconst $=id=>document.getElementById(id),money=n=>");
 s=s.replace(
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?')){await sb.auth.signOut();location.reload()}};",
 "$('staffBtn').onclick=async()=>{if(confirm('Sign out '+(S.staffEmail||'staff')+'?'))await signOutPos()};"
 );
 s=s.replace(
 "$('loginBtn').onclick=async()=>{const email=$('staffEmail').value.trim(),password=$('staffPassword').value;$('loginMsg').textContent='Signing in…';const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){$('loginMsg').textContent=error.message;return}await applySession(data.session);$('loginMsg').textContent=''}",
 "$('loginBtn').onclick=async()=>{const email=$('staffEmail').value.trim(),password=$('staffPassword').value;if(!email||!password){$('loginMsg').textContent='Enter email and password.';return}$('loginBtn').disabled=true;$('loginMsg').textContent='Signing in…';try{let session;if(sb){const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;session=data.session}else session=await directSignIn(email,password);if(!session?.access_token)throw Error('Sign in failed');try{localStorage.setItem(AUTH_KEY,JSON.stringify(session))}catch{}await applySession(session);$('loginMsg').textContent=''}catch(e){$('loginMsg').textContent=e.message||'Sign in failed'}finally{$('loginBtn').disabled=false}}"
 );
 s=s.replace(
 "sb.auth.onAuthStateChange((_e,s)=>{if(!s&&S.session)location.reload()});sb.auth.getSession().then(({data})=>applySession(data.session));",
 "if(sb){sb.auth.onAuthStateChange((_e,s)=>{if(!s&&S.session)location.reload()});sb.auth.getSession().then(async({data})=>{const v=await validateSession(data.session);if(v)applySession(v);else applySession(null)}).catch(()=>applySession(null))}else{validateSession(storedSession()).then(v=>{if(v)applySession(v);else{try{localStorage.removeItem(AUTH_KEY)}catch{}applySession(null)}})}"
 );
 fs.writeFileSync(p,s);
 console.log('POS auth fallback applied to '+p);
}

for(const p of ['dist/pos-test.html','dist/pos.html']) if(fs.existsSync(p)) patch(p);
