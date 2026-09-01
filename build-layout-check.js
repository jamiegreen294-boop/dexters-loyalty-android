// Offline visual fixture: original markup and CSS, no account data or app services.
const fs=require('fs');let s=fs.readFileSync('dist/index.html','utf8');
const actions=s.match(/<script id="dextersWorkLayoutActions">([\s\S]*?)<\/script>/)[1];
s=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
s=s.replace(/src="https:[^"]*"/g,'src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'260\' height=\'70\'%3E%3Ctext x=\'15\' y=\'45\' fill=\'%23ffcc33\' font-size=\'32\' font-family=\'sans-serif\'%3EDEXTERS%3C/text%3E%3C/svg%3E"');
s=s.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'none\'; img-src \'self\' data:; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; form-action \'none\'">');
s=s.replace('</body>',`<script>${actions}</script><script>
const q=new URLSearchParams(location.search),mode=q.get('mode')||'customer',theme=q.get('theme')||'normal';
if(theme!=='normal')document.body.classList.add('season-'+theme);
document.getElementById('seasonBanner').textContent=theme==='normal'?'':theme+' layout fixture';
document.getElementById('authView').classList.toggle('hidden',mode!=='login');document.getElementById('appView').classList.toggle('hidden',mode==='login');document.getElementById('bottomNav').classList.toggle('hidden',mode==='login');
document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==(mode==='staff'?'staffPage':mode==='account'?'accountPage':'homePage')));
document.getElementById('greeting').textContent='Layout sample';document.getElementById('stampText').textContent='8 / 9';document.getElementById('progressBar').style.width='88.88%';document.getElementById('stamps').innerHTML=Array.from({length:9},(_,i)=>'<div class="stamp '+(i<8?'on':'')+'">'+(i<8?'☕':9)+'</div>').join('');
document.querySelector('#bottomNav [data-page="spinPage"]').classList.toggle('hidden',q.get('spin')==='off');
document.querySelectorAll('input').forEach(i=>{i.disabled=true;i.value=''});
document.querySelectorAll('a').forEach(a=>a.onclick=e=>e.preventDefault());
document.querySelectorAll('#bottomNav [data-page]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==b.dataset.page))});
</script></body>`);
fs.writeFileSync('dist/layout-fixture.html',s);
fs.writeFileSync('dist/layout-check.html',`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Layout checks — no live data</title><style>body{font:15px system-ui;background:#eee;margin:16px}iframe{display:block;border:1px solid #888;height:820px;max-width:100%;margin-top:12px}select{padding:9px;margin:4px}</style><h1>Offline layout checks</h1><p>Sample markup only. No sign-in, orders, customer data or services.</p><label>Screen <select id="screen"><option value="customer">Customer home</option><option value="login">Login</option><option value="staff">Staff</option><option value="account">Account</option></select></label><label>Theme <select id="theme"><option value="normal">Normal</option><option value="halloween">Halloween</option><option value="christmas">Christmas</option><option value="valentines">Valentine’s</option></select></label><label>Width <select id="size"><option>360</option><option>320</option><option>430</option><option>768</option></select></label><label>Spin <select id="spin"><option value="on">On</option><option value="off">Off</option></select></label><iframe title="Layout fixture" width="360" src="/layout-fixture.html"></iframe><script>const f=document.querySelector('iframe');document.querySelectorAll('select').forEach(s=>s.onchange=()=>{f.style.width=document.getElementById('size').value+'px';f.src='/layout-fixture.html?mode='+document.getElementById('screen').value+'&theme='+document.getElementById('theme').value+'&spin='+document.getElementById('spin').value});</script>`);
