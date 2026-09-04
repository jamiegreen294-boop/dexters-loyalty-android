const CACHE='dexters-hub-test-v3';
const ASSETS=['/hub-test.html','/hub-test.css','/hub-test.js','/hub-manifest.webmanifest','/hub-admin-test.html','/hub-admin-test.css','/hub-admin-test.js','/accounts-test.html','/accounts-test.css','/accounts-test.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});