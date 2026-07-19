const CACHE='kouzelna-zahrada-v20';
const ASSETS=[
  './','./index.html','./phaser.html','./manifest.json',
  './css/game.css','./css/phaser.css?v=20',
  './js/main.js','./js/data.js','./js/storage.js','./js/art.js',
  './js/control-mode-v15.js?v=20','./js/external-assets-v15.js?v=20',
  './js/phaser-game-v10.js?v=20','./js/visual-overlays-v20.js?v=20',
  './assets/generated/lili.png.b64?v=20',
  './assets/generated/star-v16.png.b64?v=20',
  './assets/generated/key-v16.png.b64?v=20',
  './assets/generated/pond-v16.png.b64?v=20',
  './assets/generated/gate-v16.png.b64?v=20'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin===self.location.origin){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(response=>response||caches.match('./index.html'))));return}event.respondWith(caches.match(request).then(response=>response||fetch(request)))})
