/* درب الإملاء — إعداد وتصميم: وائل الخزاعي */
var CACHE='imla-v11';
var CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','audio/index.json'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
/* الصفحات وفهرس الأصوات: الشبكة أولاً (فيصل كل تحديث فوراً)، والمحفوظ عند انقطاع الاتصال.
   حزم الأصوات تحمل رقم نسختها في عنوانها، فتُحفظ مرة واحدة وتُحذف نسخها القديمة. وبقية الملفات: المحفوظ أولاً. */
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'){return;}
  var u=new URL(req.url),path=u.pathname;
  function keep(res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(CACHE).then(function(c){
    if(/\/audio\/p[0-9a-f]\.mp3$/.test(path)){c.keys().then(function(ks){ks.forEach(function(k){var ku=new URL(k.url);if(ku.pathname===path&&ku.search!==u.search){c.delete(k);}});});}
    c.put(req,cp);});}return res;}
  var netFirst=req.mode==='navigate'||/\/(index\.html|studio\.html)?$/.test(path)||/\/audio\/index\.json$/.test(path);
  if(netFirst){
    e.respondWith(fetch(req,{cache:'no-store'}).then(keep).catch(function(){return caches.match(req,{ignoreSearch:true}).then(function(h){return h||caches.match('index.html');});}));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(keep);}));
});
