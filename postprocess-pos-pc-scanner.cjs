const fs=require('fs');

const inner='dist/pos-test.html';
const outer='dist/pos.html';

if(fs.existsSync(inner)){
  let s=fs.readFileSync(inner,'utf8');
  if(!s.includes('/pos-pc-scanner.js')) s=s.replace('</body>','<script src="/pos-pc-scanner.js"></script>\n</body>');
  if(!s.includes('/pos-pc-loyalty-test.js')) s=s.replace('</body>','<script src="/pos-pc-loyalty-test.js"></script>\n</body>');

  if(!s.includes('pc-test-money-owed-layout')) s=s.replace('</body>',`<script id="pc-test-money-owed-layout">(function(){
    function alignMoneyOwed(){
      const top=document.querySelector('.top'),btn=document.getElementById('creditLaunch');
      if(!top||!btn)return;
      if(btn.parentElement!==top){
        const staff=document.getElementById('staffBtn');
        top.insertBefore(btn,staff||null);
      }
      btn.textContent='Money Owed';
      btn.style.cssText='position:static;z-index:auto;box-shadow:none;margin:0;border:0;border-radius:12px;padding:10px 12px;font-weight:900;background:#162a45;color:#fff';
    }
    alignMoneyOwed();
    window.addEventListener('load',()=>{alignMoneyOwed();setTimeout(alignMoneyOwed,100);setTimeout(alignMoneyOwed,500);setTimeout(alignMoneyOwed,1200)});
    new MutationObserver(alignMoneyOwed).observe(document.documentElement,{childList:true,subtree:true});
  })();</script>\n</body>`);

  if(!s.includes('pc-test-no-sw-cache')) s=s.replace('</body>',`<script id="pc-test-no-sw-cache">(async()=>{try{if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}if('caches' in window){for(const k of await caches.keys())if(k.startsWith('dexters-pos-shell-'))await caches.delete(k)}}catch(e){}})();</script>\n</body>`);
  s=s.replace("if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/pos-sw.js').catch(()=>{}));}","/* PC TEST: service worker disabled so preview updates are never hidden by cached POS HTML */");

  if(!s.includes('pc-test-safety')) s=s.replace('</body>',`<script id="pc-test-safety">(function(){function lockKds(){const b=document.getElementById('sendBtn');if(b){b.disabled=true;b.textContent='KDS TEST DISABLED';b.title='PC test safety: live KDS sending is blocked until an isolated test KDS route is connected';b.style.opacity='.55'}}lockKds();window.addEventListener('load',lockKds);setTimeout(lockKds,500)})();</script>\n</body>`);

  s=s.replace('DEXTER\'S TERMINAL','PC TEST · DEXTER\'S TERMINAL');
  fs.writeFileSync(inner,s);
}

if(fs.existsSync(outer)){
  let s=fs.readFileSync(outer,'utf8');
  // The live Sunday Roast wrapper floats its launch button over the iframe.
  // In the PC test, hide that launcher and recreate it inside the actual POS top bar.
  if(!s.includes('pc-test-wrapper-layout')) s=s.replace('</body>',`<script id="pc-test-wrapper-layout">(function(){
    const launch=document.getElementById('srLaunch');
    if(launch){launch.style.display='none';launch.setAttribute('aria-hidden','true')}
    const frame=document.getElementById('pos');
    function wireTopBar(){
      try{
        const d=frame&&frame.contentDocument;if(!d)return;
        const top=d.querySelector('.top');if(!top)return;
        let b=d.getElementById('pcSundayRoastBtn');
        if(!b){
          b=d.createElement('button');b.id='pcSundayRoastBtn';b.textContent='Sunday Roast';b.title='Sunday Roast orders';
          const staff=d.getElementById('staffBtn');top.insertBefore(b,staff||null);
          b.onclick=()=>launch&&launch.click();
        }
        b.style.cssText='position:static;border:0;border-radius:12px;padding:10px 12px;font-weight:900;background:#162a45;color:#fff';
      }catch(e){}
    }
    if(frame){frame.addEventListener('load',()=>{wireTopBar();setTimeout(wireTopBar,250);setTimeout(wireTopBar,900)})}
    window.addEventListener('load',()=>{wireTopBar();setTimeout(wireTopBar,400)});
  })();</script>\n</body>`);
  s=s.replace(/<title>Dexter's POS — Sunday Roast Test<\/title>/,"<title>Dexter's POS — PC Test</title>");
  fs.writeFileSync(outer,s);
}

fs.copyFileSync('web/pos-pc-scanner.js','dist/pos-pc-scanner.js');
fs.copyFileSync('web/pos-pc-loyalty-test.js','dist/pos-pc-loyalty-test.js');
console.log('PC POS final layer applied: iframe layout, scanner, loyalty test and safety');
