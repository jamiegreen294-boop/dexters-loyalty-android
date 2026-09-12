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
  let src=srcMatch?srcMatch[1]:'';
  // Inline same-origin JavaScript at build time so startup never depends on a
  // service worker/network fetch for files already shipped with this build.
  if(src.startsWith('/')){
    const local=require('path').join('dist',src.slice(1));
    if(fs.existsSync(local) && fs.statSync(local).isFile() && /\.js$/i.test(local)){
      body=fs.readFileSync(local,'utf8');
      src='';
    }
  }
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
  const SESSION_KEY='sb-bpnkouymdvcogeaqjmxl-auth-token';
  function hasStoredSession(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);
      if(!raw)return false;
      const j=JSON.parse(raw);
      return !!(j?.access_token||j?.currentSession?.access_token||j?.session?.access_token);
    }catch{return false}
  }
  function visible(el){return !!el&&!el.classList.contains('hidden')}
  async function waitForAuthView(){
    const auth=document.getElementById('authView'),app=document.getElementById('appView');
    if(!auth||!app)return;
    const expectedApp=hasStoredSession();
    const started=Date.now();
    while(Date.now()-started<2800){
      const a=visible(auth),p=visible(app);
      if(expectedApp?p&&!a:a&&!p){
        await new Promise(r=>setTimeout(r,90));
        const a2=visible(auth),p2=visible(app);
        if(expectedApp?p2&&!a2:a2&&!p2)return;
      }
      await new Promise(r=>setTimeout(r,40));
    }
    // A stale stored token can legitimately resolve back to Sign In. In that
    // case, wait only until the UI has reached one unambiguous final view.
    const fallbackStarted=Date.now();
    while(Date.now()-fallbackStarted<900){
      const a=visible(auth),p=visible(app);
      if(a!==p){await new Promise(r=>setTimeout(r,90));return}
      await new Promise(r=>setTimeout(r,40));
    }
  }
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
        document.head.appendChild(real);
        await done;
      }else{
        real.textContent=old.textContent||'';
        document.head.appendChild(real);
        await new Promise(r=>setTimeout(r,0));
      }
    }
    // Some app scripts start async auth work and return immediately. Keep the
    // branded startup cover in place until Supabase has settled on exactly one
    // of Sign In or the logged-in app, preventing the auth/home screen flash.
    await waitForAuthView();
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
