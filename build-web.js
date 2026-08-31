const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const parts = [1,2,3,4]
  .map(n => fs.readFileSync(path.join(__dirname,'web',`app-payload-${n}.txt`),'utf8').trim())
  .join('');

let wrapper = zlib.gunzipSync(Buffer.from(parts,'base64')).toString('utf8');

if(!wrapper.includes('Customer Offers') || !wrapper.includes('Menu Manager') || !wrapper.includes('Admin & Staff Manager')) {
  throw new Error('Integrated app validation failed');
}

const collapseAddon = `<style id="dextersMenuCollapseStyle">
#menuList .menu-section>.row:first-child{cursor:pointer;user-select:none;align-items:center}
#menuList .menu-section>.row:first-child::after{content:'▾';font-size:18px;color:var(--yellow);margin-left:8px;transition:transform .18s ease}
#menuList .menu-section.menu-open>.row:first-child::after{transform:rotate(180deg)}
#menuList .menu-section:not(.menu-open)>.menu-item,#menuList .menu-section:not(.menu-open)>.menu-note{display:none}
#menuList .menu-section>.row:first-child h2{margin-bottom:0}
</style><script id="dextersMenuCollapseScript">(function(){const list=document.getElementById('menuList'),search=document.getElementById('menuSearch');if(!list)return;function enhance(){const searching=!!(search&&search.value.trim());list.querySelectorAll('.menu-section').forEach(sec=>{if(sec.dataset.collapseReady==='1'){if(searching)sec.classList.add('menu-open');return}sec.dataset.collapseReady='1';const head=sec.querySelector(':scope>.row:first-child');if(!head)return;head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded',searching?'true':'false');if(searching)sec.classList.add('menu-open');const toggle=()=>{sec.classList.toggle('menu-open');head.setAttribute('aria-expanded',sec.classList.contains('menu-open')?'true':'false')};head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})})}new MutationObserver(()=>setTimeout(enhance,0)).observe(list,{childList:true,subtree:false});if(search)search.addEventListener('input',()=>setTimeout(enhance,0));setTimeout(enhance,0)})();</script>`;

const staffCollapseAddon = `<style id="dextersStaffCollapseStyle">
#staffPage>.card>.staff-collapse-toggle{width:100%;border:0;background:transparent;color:var(--white);padding:2px 0 4px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;font:inherit;font-weight:900;font-size:18px;cursor:pointer}
#staffPage>.card>.staff-collapse-toggle .staff-collapse-arrow{color:var(--yellow);font-size:20px;line-height:1;transition:transform .18s ease}
#staffPage>.card:not(.staff-collapsed)>.staff-collapse-toggle .staff-collapse-arrow{transform:rotate(180deg)}
#staffPage>.card.staff-collapsed>*:not(.staff-collapse-toggle){display:none!important}
#staffPage>.card:not(.staff-collapsed)>.staff-collapse-toggle{margin-bottom:14px}
</style><script id="dextersStaffCollapseScript">(function(){var page=document.getElementById('staffPage');if(!page)return;function escStaff(s){return String(s||'Staff section').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})}function enhance(){var kids=Array.prototype.slice.call(page.children||[]);kids.forEach(function(card){if(!card.classList||!card.classList.contains('card')||card.getAttribute('data-staff-collapse-ready')==='1')return;var h=card.querySelector('h2,h3');if(!h)return;card.setAttribute('data-staff-collapse-ready','1');var b=document.createElement('button');b.type='button';b.className='staff-collapse-toggle';b.setAttribute('aria-expanded','false');b.innerHTML='<span>'+escStaff((h.textContent||'Staff section').trim())+'</span><span class="staff-collapse-arrow">▾</span>';card.insertBefore(b,card.firstChild);card.classList.add('staff-collapsed');b.onclick=function(e){e.preventDefault();e.stopPropagation();var closed=card.classList.toggle('staff-collapsed');b.setAttribute('aria-expanded',closed?'false':'true')};});}enhance();setTimeout(enhance,300);setTimeout(enhance,1200);new MutationObserver(function(){setTimeout(enhance,0)}).observe(page,{childList:true,subtree:false});})();</script>`;

const collectionAddon = `<style id="dextersCollectionLiveStyle">
#collectionOrderLiveCard .collection-live-state{font-weight:800;margin:6px 0 10px}
#collectionOrderLiveCard .collection-live-open{color:#18864b}
#collectionOrderLiveCard .collection-live-closed{color:#c34b4b}
</style><script id="dextersCollectionLiveScript">(function(){var U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';function add(){var page=document.getElementById('homePage');if(!page||document.getElementById('collectionOrderLiveCard'))return;var card=document.createElement('div');card.className='card';card.id='collectionOrderLiveCard';card.innerHTML='<h2>🛍️ Order for Collection</h2><p>Place a collection-only order directly from the Dexter’s menu.</p><div id="collectionLiveState" class="collection-live-state">Checking availability…</div><button type="button" id="collectionLiveBtn" class="btn">Order for Collection</button>';page.appendChild(card);var btn=document.getElementById('collectionLiveBtn');if(btn)btn.onclick=function(){location.href='/collection-order-test.html'};check()}async function check(){var el=document.getElementById('collectionLiveState'),btn=document.getElementById('collectionLiveBtn');if(!el||!btn)return;try{var raw=localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token');if(!raw){el.textContent='Sign in to place a collection order.';btn.disabled=true;return}var j=JSON.parse(raw),t=j.access_token||j?.currentSession?.access_token||j?.session?.access_token;if(!t){el.textContent='Sign in to place a collection order.';btn.disabled=true;return}var r=await fetch(U+'/functions/v1/collection-orders-test-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'status'})});var d=await r.json();if(!r.ok)throw new Error('status');el.textContent=d.enabled?'Collection ordering is OPEN':'Collection ordering is currently CLOSED';el.className='collection-live-state '+(d.enabled?'collection-live-open':'collection-live-closed');btn.disabled=!d.enabled}catch(e){el.textContent='Collection ordering unavailable just now.';el.className='collection-live-state collection-live-closed';btn.disabled=true}}add();setTimeout(add,300);setTimeout(add,1200);new MutationObserver(function(){setTimeout(add,0)}).observe(document.body,{childList:true,subtree:true});setInterval(check,10000)})();</script>`;

const customerDesignAddon = `<style id="dextersCustomerDesignStyle">
body.dexters-customer-design{--white:#151515;--muted:#6f6f6f;--card:#fff;--yellow:#111;--orange:#111;--navy:#f7f7f5;--navy2:#f7f7f5;background:#f7f7f5;color:#151515}
body.dexters-customer-design .wrap{max-width:430px;padding:18px 16px 96px;background:#f7f7f5;min-height:100vh}
body.dexters-customer-design .logo{width:min(190px,54vw);margin:4px auto 16px;filter:none}
body.dexters-customer-design #homePage>.card,body.dexters-customer-design #qrPage>.card,body.dexters-customer-design #spinPage>.card,body.dexters-customer-design #menuPage>.card,body.dexters-customer-design #accountPage>.card{background:#fff;border:0;border-radius:20px;box-shadow:0 6px 18px rgba(0,0,0,.05);color:#151515;margin:12px 0;padding:17px}
body.dexters-customer-design #homePage>.card:first-child{padding:16px 18px;margin-top:4px}
body.dexters-customer-design #homePage>.card:nth-child(2){border-radius:22px;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
body.dexters-customer-design #homePage>.card:nth-child(2) h2{font-size:23px;letter-spacing:-.4px;margin-bottom:8px}
body.dexters-customer-design .big{font-size:28px;letter-spacing:-.7px}
body.dexters-customer-design .muted{color:#6f6f6f}
body.dexters-customer-design .stamps{gap:8px;margin:14px 0}
body.dexters-customer-design .stamp{background:#efefec;border-color:#d3d3cf;color:#151515}
body.dexters-customer-design .stamp.on{background:#111;border-color:#111;color:#fff}
body.dexters-customer-design .progress{height:12px;background:#ecece8}
body.dexters-customer-design .bar{background:#111}
body.dexters-customer-design .reward{border:0;background:#fff}
body.dexters-customer-design .offer,body.dexters-customer-design .co-box{background:#f5f5f2;border:0;border-radius:16px;color:#151515}
body.dexters-customer-design .btn{border-radius:16px;min-height:48px;font-weight:900}
body.dexters-customer-design .primary{background:#111;color:#fff}
body.dexters-customer-design .secondary{background:#efefec;color:#151515}
body.dexters-customer-design .danger{background:#f3dede;color:#8b2222}
body.dexters-customer-design .input{background:#f4f4f1;border:1px solid #deded9;color:#151515}
body.dexters-customer-design .tabs{background:#efefec}
body.dexters-customer-design .tab{color:#666}
body.dexters-customer-design .tab.active{background:#fff;color:#111}
body.dexters-customer-design #collectionOrderLiveCard{background:#111!important;color:#fff!important;border-radius:20px!important}
body.dexters-customer-design #collectionOrderLiveCard p{color:#d6d6d6}
body.dexters-customer-design #collectionOrderLiveCard .btn{background:#fff;color:#111}
body.dexters-customer-design #collectionOrderLiveCard .collection-live-open{color:#9ce3ba}
body.dexters-customer-design #collectionOrderLiveCard .collection-live-closed{color:#ffc1cb}
body.dexters-customer-design #bottomNav{background:rgba(255,255,255,.95);border-top:1px solid #e8e8e5;backdrop-filter:blur(10px)}
body.dexters-customer-design #bottomNav button{color:#777;padding:9px 3px}
body.dexters-customer-design #bottomNav button.active{color:#111;font-weight:900}
body.dexters-customer-design #qr{border:1px solid #ecece8}
body.dexters-customer-design .code,body.dexters-customer-design .menu-price{color:#111}
body.dexters-customer-design .menu-chip{background:#fff;border:1px solid #deded9;color:#333}
body.dexters-customer-design .menu-chip.active{background:#111;color:#fff;border-color:#111}
body.dexters-customer-design .menu-note{background:#f4f4f1;color:#666}
body.dexters-customer-design .menu-item{border-bottom:1px solid #ecece8}
body.dexters-customer-design .spin-wheel{border-color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.10);background:conic-gradient(#111 0 45deg,#efefec 45deg 90deg,#777 90deg 135deg,#efefec 135deg 180deg,#111 180deg 225deg,#efefec 225deg 270deg,#777 270deg 315deg,#efefec 315deg)}
body.dexters-customer-design .spin-wheel-center{background:#fff;color:#111}
body.dexters-customer-design #customerDesignHeader{display:flex;align-items:center;justify-content:space-between;margin:2px 0 14px}
body.dexters-customer-design #customerDesignHeader .customer-brand{font-weight:900;font-size:28px;letter-spacing:-1px}
body.dexters-customer-design #customerDesignHeader .customer-open-pill{background:#e8f4ec;color:#146b3a;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:800}
body.dexters-customer-design .logo{display:none}
#customerDesignHeader{display:none}
@media(max-width:360px){body.dexters-customer-design .wrap{padding-left:12px;padding-right:12px}body.dexters-customer-design .stamp{font-size:22px}}
</style><script id="dextersCustomerDesignScript">(function(){var body=document.body,app=document.getElementById('appView'),auth=document.getElementById('authView'),nav=document.getElementById('bottomNav'),wrap=document.querySelector('.wrap');if(!body||!wrap)return;var head=document.getElementById('customerDesignHeader');if(!head){head=document.createElement('div');head.id='customerDesignHeader';head.innerHTML='<div class="customer-brand">DEXTER\'S</div><div class="customer-open-pill" id="customerOpenPill">Collection</div>';wrap.insertBefore(head,wrap.firstChild)}function activePage(){var pages=document.querySelectorAll('#appView .page');for(var i=0;i<pages.length;i++){if(!pages[i].classList.contains('hidden'))return pages[i].id}return''}function syncPill(){var p=document.getElementById('customerOpenPill'),s=document.getElementById('collectionLiveState');if(!p)return;var t=(s&&s.textContent||'').toUpperCase();if(t.indexOf('OPEN')>-1){p.textContent='Collection OPEN';p.style.background='#e8f4ec';p.style.color='#146b3a'}else if(t.indexOf('CLOSED')>-1){p.textContent='Collection CLOSED';p.style.background='#f7e4e4';p.style.color='#8b2c2c'}else{p.textContent='Collection';p.style.background='#efefec';p.style.color='#555'}}function apply(){var signed=app&&!app.classList.contains('hidden'),page=activePage(),customer=signed&&page!=='staffPage';body.classList.toggle('dexters-customer-design',customer);head.style.display=customer?'flex':'none';syncPill()}document.querySelectorAll('[data-page]').forEach(function(b){b.addEventListener('click',function(){setTimeout(apply,20);setTimeout(apply,300)})});new MutationObserver(function(){apply()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});setInterval(syncPill,1500);setTimeout(apply,100);setTimeout(apply,700)})();</script>`;

const stockAddon = `<script id="dextersStaffStockLoader" src="https://cdn.jsdelivr.net/gh/jamiegreen294-boop/dexters-loyalty-android@474f976e235e7894b4beaec2132c1a0f495bfa2d/web/staff-stock-control.js"></script>`;

if(!wrapper.includes('dextersMenuCollapseScript')) wrapper = wrapper.replace('</body></html>',collapseAddon+'</body></html>');
if(!wrapper.includes('dextersStaffCollapseScript')) wrapper = wrapper.replace('</body></html>',staffCollapseAddon+'</body></html>');
if(!wrapper.includes('dextersCollectionLiveScript')) wrapper = wrapper.replace('</body></html>',collectionAddon+'</body></html>');
if(!wrapper.includes('dextersCustomerDesignScript')) wrapper = wrapper.replace('</body></html>',customerDesignAddon+'</body></html>');
if(!wrapper.includes('dextersStaffStockLoader')) wrapper = wrapper.replace('</body></html>',stockAddon+'</body></html>');

if(!wrapper.includes('dextersMenuCollapseScript') || !wrapper.includes('dextersStaffCollapseScript') || !wrapper.includes('dextersCollectionLiveScript') || !wrapper.includes('dextersCustomerDesignScript') || !wrapper.includes('dextersStaffStockLoader')) {
  throw new Error('Live app injection validation failed');
}

fs.rmSync(path.join(__dirname,'dist'),{recursive:true,force:true});
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist','index.html'),wrapper);

for(const f of ['collection-order-test.html','kds-order-test.html','admin-only-test.html','collection-order-total.js']) {
  const s = path.join(__dirname,'web',f);
  if(fs.existsSync(s)) fs.copyFileSync(s,path.join(__dirname,'dist',f));
}

const collectionPath = path.join(__dirname,'dist','collection-order-test.html');
if(fs.existsSync(collectionPath)) {
  let c = fs.readFileSync(collectionPath,'utf8');
  if(!c.includes('dextersHideLegacyStock')) c = c.replace('</head>','<style id="dextersHideLegacyStock">#stockCard{display:none!important}</style></head>');
  if(!c.includes('collection-order-total.js')) c = c.replace('</body>','<script src="/collection-order-total.js"></script></body>');
  fs.writeFileSync(collectionPath,c);
}

console.log('Built integrated Dexter\'s Loyalty app with customer design, staff stock control and collection total',wrapper.length);
