// Network-only navigation with an offline message. No saved private data,
// asset prefetch, API interception, background sync, or polling.
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MatchXI · Offline</title><body style="background:#252b30;color:#fff;font:18px system-ui;padding:32px"><h1>You’re offline</h1><p>Connect to the internet to open MatchXI and get current scores.</p><a href="/" style="color:#b8f45c">Try again</a></body></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
