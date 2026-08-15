// Simple service worker for caching app shell
const CACHE_NAME = 'trpgc-v1'
const PRECACHE = ['index.html', 'assets/styles.css', 'assets/app.js', 'manifest.json', 'icons/icon.svg', 'samples/alice.json']
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()))
})
self.addEventListener('activate', e=>{
  e.waitUntil(self.clients.claim())
})
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url)
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      // runtime cache for same-origin requests
      if(e.request.method === 'GET'){
        const copy = res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(e.request, copy))
      }
      return res
    }).catch(()=>caches.match('index.html'))))
  }
})
