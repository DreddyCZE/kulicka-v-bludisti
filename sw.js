const CACHE='kouzelna-zahrada-v8';
const ASSETS=[
  './','./index.html','./phaser.html','./manifest.json',
  './css/game.css','./css/phaser.css?v=8',
  './js/main.js','./js/data.js','./js/storage.js','./js/art.js','./js/phaser-game.js?v=8'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  const sameOrigin=url.origin===self.location.origin;

  if(sameOrigin){
    // Síť má přednost, aby se nová grafika a rozložení nezasekly ve staré cache.
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
          return response;
        })
        .catch(()=>caches.match(request).then(response=>response||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(caches.match(request).then(response=>response||fetch(request)));
});