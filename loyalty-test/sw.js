const CACHE='dexters-loyalty-github-pages-test-v2';
const SCOPE='/loyalty-test/';
const SHELL=[SCOPE,SCOPE+'index.html',SCOPE+'styles.css',SCOPE+'config.js',SCOPE+'app.js',SCOPE+'theme-rebuild.js',SCOPE+'theme-preview.js',SCOPE+'spin-rebuild.js',SCOPE+'customer-rebuild.js',SCOPE+'manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async fresh=>{if(fresh?.ok)(await caches.open(CACHE)).put('/index.html',fresh.clone()).catch(()=>{});return fresh;}).catch(()=>caches.match(SCOPE+'index.html')));
    return;
  }
  if(SHELL.includes(url.pathname)){
    event.respondWith(caches.match(req).then(cached=>{
      const update=fetch(req,{cache:'no-cache'}).then(async fresh=>{if(fresh?.ok)(await caches.open(CACHE)).put(req,fresh.clone()).catch(()=>{});return fresh;}).catch(()=>null);
      return cached||update;
    }));
    return;
  }
  event.respondWith(fetch(req).catch(()=>caches.match(req)));
});
