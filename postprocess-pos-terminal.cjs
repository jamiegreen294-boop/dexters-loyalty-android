const fs=require('fs');

const API='https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-pos-terminal';

function patchPos(p){
  if(!fs.existsSync(p)) return;
  let s=fs.readFileSync(p,'utf8');
  s=s.replace('id="authGate" class="modal"','id="authGate" class="modal hide"');
  s=s.replace("const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',sb=null;",
`const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',POS_API=U+'/functions/v1/dexters-pos-test-api',AUTH_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token',TERMINAL_API='${API}',TERMINAL_KEY='dexters-pos-terminal-token-v1',sb=null;`);
  const helper=`\nfunction terminalToken(){try{return localStorage.getItem(TERMINAL_KEY)||''}catch{return''}}\nasync function pairTerminal(){let t=terminalToken();const u=new URL(location.href),pair=u.searchParams.get('pair')||'';if(pair){const r=await fetch(TERMINAL_API,{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({action:'pair',pair})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.token)throw Error(d.error||'Could not pair this POS');t=d.token;try{localStorage.setItem(TERMINAL_KEY,t)}catch{}u.searchParams.delete('pair');history.replaceState({},'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash)}return t}\n`;
  if(!s.includes('function terminalToken()')) s=s.replace('const $=id=>document.getElementById(id),money=n=>',helper+'\nconst $=id=>document.getElementById(id),money=n=>');
  s=s.replace("if(!S.session?.access_token){$('status').textContent='Please sign in again.';return}","const terminal=terminalToken();if(!terminal){$('status').textContent='This POS needs pairing before it can send to KDS.';return}");
  s=s.replace("fetch(POS_API+'/orders',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+S.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)})",
"fetch(TERMINAL_API,{method:'POST',headers:{apikey:K,'x-terminal-token':terminal,'Content-Type':'application/json'},body:JSON.stringify({action:'pos_order',...body})})");
  s=s.replace(/validateSession\(storedSession\(\)\)\.then\(v=>\{if\(v\)applySession\(v\);else\{try\{localStorage\.removeItem\(AUTH_KEY\)\}catch\{\}applySession\(null\)\}\}\)/,
"pairTerminal().then(t=>{S.session=t?{access_token:t}:null;S.staffEmail='POS Terminal';$('staffBtn').textContent='Terminal';$('authGate').classList.add('hide');loadMenu();if(!t)$('status').textContent='POS ready · pair this device once to enable KDS and Sunday Roast'}).catch(e=>{$('authGate').classList.add('hide');loadMenu();$('status').textContent='POS ready · '+e.message})");
  fs.writeFileSync(p,s);
  console.log('Paired terminal POS applied to '+p);
}

function patchSunday(p){
  if(!fs.existsSync(p)) return;
  let s=fs.readFileSync(p,'utf8');
  s=s.replace("const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',srSb=supabase.createClient(U,K);",
`const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',TERMINAL_API='${API}',TERMINAL_KEY='dexters-pos-terminal-token-v1';`);
  s=s.replace(/async function token\(\)\{[\s\S]*?return t\}/,
"function token(){const t=localStorage.getItem(TERMINAL_KEY)||'';if(!t)throw Error('This POS terminal is not paired yet.');return t}");
  const oldApi=/async function api\(action,body=\{\}\)\{[\s\S]*?return d\}/;
  s=s.replace(oldApi,`async function api(action,body={}){const t=token();if(action==='status'&&!body.collection_date){const d=new Date();const add=((7-d.getDay())%7)||7;d.setDate(d.getDate()+add);body={...body,collection_date:d.toISOString().slice(0,10)}}if(action==='staff_create'&&body.extras)body={...body,extras:{...body.extras,potatoes:body.extras.roast_potatoes??body.extras.potatoes??0}};const r=await fetch(TERMINAL_API,{method:'POST',headers:{apikey:K,'x-terminal-token':t,'Content-Type':'application/json'},body:JSON.stringify({action:'sunday_'+action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.message||'Sunday Roast request failed');return d}`);
  const oldAmend=/async function amend\(id,body\)\{[\s\S]*?return d\}/;
  s=s.replace(oldAmend,`async function amend(id,body){const t=token();const extras={...(body.extras||{}),potatoes:body.extras?.roast_potatoes??body.extras?.potatoes??0};const r=await fetch(TERMINAL_API,{method:'POST',headers:{apikey:K,'x-terminal-token':t,'Content-Type':'application/json'},body:JSON.stringify({action:'sunday_amend',id,...body,extras})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.message||'Could not amend order');return d}`);
  fs.writeFileSync(p,s);
  console.log('Paired terminal Sunday Roast applied to '+p);
}

for(const p of ['dist/pos.html','dist/pos-test.html']) patchPos(p);
patchSunday('dist/pos-sunday-test.html');
