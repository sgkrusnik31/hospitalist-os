// Offline-first with network refresh: new deployments update on the next online visit.
const CACHE='hospitalist-os-v1.4.2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./pwa.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    } catch(_err) {
      return (await cache.match(req))||(req.mode==='navigate'?await cache.match('./index.html'):undefined)||Response.error();
    }
  })());
});
