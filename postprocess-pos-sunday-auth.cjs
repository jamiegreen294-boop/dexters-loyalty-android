const fs = require('fs');
const path = 'dist/pos-sunday-test.html';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) {
  s = s.replace('<style>', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<style>');
}

s = s.replace(
  "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';",
  "const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',srSb=supabase.createClient(U,K);"
);

s = s.replace(
  /function token\(\)\{try\{const x=JSON\.parse\(localStorage\.getItem\('sb-bpnkouymdvcogeaqjmxl-auth-token'\)\|\|'null'\);return x\?\.access_token\|\|x\?\.currentSession\?\.access_token\|\|x\?\.session\?\.access_token\|\|''\}catch\{return''\}\}\nasync function api\(action,body=\{\}\)\{const t=token\(\);if\(!t\)throw Error\('Sign in to the POS first, then try again\.'\);/,
  "async function token(){const {data,error}=await srSb.auth.getSession();const t=data?.session?.access_token||'';if(error||!t){try{await srSb.auth.signOut({scope:'local'})}catch{}throw Error('Please sign in to the POS first.')}const {error:userError}=await srSb.auth.getUser(t);if(userError){try{await srSb.auth.signOut({scope:'local'})}catch{}throw Error('Your POS session expired. Please sign in again.')}return t}\nasync function api(action,body={}){const t=await token();"
);

s = s.replace(
  "async function amend(id,body){const t=token();if(!t)throw Error('Sign in to the POS first, then try again.');",
  "async function amend(id,body){const t=await token();"
);

s = s.replace(
  "$('srLaunch').onclick=()=>{$('srModal').classList.remove('hide');loadNew()};",
  "$('srLaunch').onclick=async()=>{try{await token();$('srModal').classList.remove('hide');loadNew()}catch(e){$('srModal').classList.add('hide');alert(e.message+' Use the POS sign-in screen, then tap Sunday Roast again.')}};"
);

fs.writeFileSync(path, s);
console.log('POS Sunday Roast auth/session patch applied');
