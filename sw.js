const CACHE_NAME = 'app-braga-tablet-v2';
const ASSETS = ['./','./index.html','./style.css','./app.js','./manifest.json','./icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
