const fs=require('fs');
const file='dist/index.html';
let s=fs.readFileSync(file,'utf8');

// Turn every executable app script into an inert queue entry. The browser can
// finish parsing and show the page first; scripts are then restored in their
// original order by one tiny bootstrap loader.
let index=0;
s=s.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(m,attrs,body)=>{
  if(/type\s*=\s*["']application\/ld\+json/i.test(attrs)) return m;
  const srcMatch=attrs.match(/\bsrc\s*=\s*"([^"]+)"/i) || attrs.match(/\bsrc\s*=\s*'([^']+)'/i);
  const src=srcMatch?srcMatch[1]:'';
  let kept=attrs
    .replace(/\s+src\s*=\s*"[^"]*"/ig,'')
    .replace(/\s+src\s*=\s*'[^']*'/ig,'')
    .replace(/\s+type\s*=\s*"[^"]*"/ig,'')
    .replace(/\s+type\s*=\s*'[^']*'/ig,'')
    .replace(/\s+(?:async|defer)(?=\s|$)/ig,'');
  const safeSrc=src.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  return '<script type="application/x-dexters-startup" data-dex-order="'+(index++)+'"'+
    (safeSrc?' data-dex-src="'+safeSrc+'"':'')+kept+'>'+body+'</script>';
});

const bootstrap=`
<script id="dextersStartupBootstrap">
(function(){
  'use strict';
  async function run(){
    const queued=Array.from(document.querySelectorAll('script[type="application/x-dexters-startup"]'))
      .sort((a,b)=>Number(a.dataset.dexOrder)-Number(b.dataset.dexOrder));
    for(const old of queued){
      const real=document.createElement('script');
      for(const a of Array.from(old.attributes)){
        if(['type','data-dex-order','data-dex-src'].includes(a.name)) continue;
        real.setAttribute(a.name,a.value);
      }
      const src=old.dataset.dexSrc||'';
      console.log('[dex-startup] begin',old.dataset.dexOrder,old.id||'',src||'inline');
      old.remove();
      if(src){
        real.src=src;
        real.async=false;
        const done=new Promise(resolve=>{
          let finished=false;
          const end=(kind)=>{if(finished)return;finished=true;clearTimeout(timer);console.log('[dex-startup]',kind,src);resolve();};
          real.onload=()=>end('loaded');
          real.onerror=()=>end('failed');
          const timer=setTimeout(()=>end('timeout'), src.startsWith('/')?4000:6000);
        });
        document.body.appendChild(real);
        await done;
      }else{
        real.textContent=old.textContent||'';
        document.body.appendChild(real);
        await new Promise(r=>setTimeout(r,0));
      }
    }
    document.documentElement.dataset.dextersStartup='complete';
    window.dispatchEvent(new Event('dexters:startup-complete'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{run().catch(e=>console.error('[dex-startup]',e))},{once:true});
  else run().catch(e=>console.error('[dex-startup]',e));
})();
</script>`;
s=s.replace('</body>',bootstrap+'</body>');
fs.writeFileSync(file,s);
console.log('Startup-unblock applied: ordered post-parse script queue',index);

// trace-trigger
