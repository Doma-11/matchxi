import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const c=await build({entryPoints:['app/pwa-install.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createInstallController}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
function host(standalone=false){const h=new EventTarget(),media=new EventTarget();media.matches=standalone;h.navigator={};h.matchMedia=()=>media;return h;}
function offer(h,{outcome='accepted',prompt=async()=>{}}={}){const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=prompt;e.userChoice=Promise.resolve({outcome});h.dispatchEvent(e);return e;}
test('install offer survives screen subscriptions, runs only from click, and is one-use',async()=>{
 const h=host(),c=createInstallController(h);let calls=0;const e=offer(h,{prompt:async()=>{calls++;}});assert.equal(e.defaultPrevented,true);assert.equal(calls,0);assert.equal(c.getSnapshot().available,true);
 let changes=0;const stop=c.subscribe(()=>changes++);stop();
 await Promise.all([c.install(),c.install()]);assert.equal(calls,1);assert.equal(changes,0);assert.equal(c.getSnapshot().installed,false);assert.match(c.getSnapshot().message,/requested/);
 h.dispatchEvent(new Event('appinstalled'));assert.equal(c.getSnapshot().installed,true);assert.equal(c.getSnapshot().message,'');await c.install();assert.equal(calls,1);
});
test('dismissed, rejected and unavailable prompts never claim installation',async()=>{
 const h=host(),c=createInstallController(h);await c.install();assert.equal(c.getSnapshot().available,false);
 offer(h,{outcome:'dismissed'});await c.install();assert.match(c.getSnapshot().message,/cancelled/);assert.equal(c.getSnapshot().installed,false);
 offer(h,{prompt:async()=>{throw Error('unsupported');}});await c.install();assert.match(c.getSnapshot().message,/could not/);assert.equal(c.getSnapshot().busy,false);
 assert.equal(createInstallController(host(true)).getSnapshot().installed,true);
});
test('worker ignores API/subresource traffic and only provides an offline navigation response',async()=>{
 let handler;const ctx={self:{location:{origin:'https://touchline.test'},addEventListener:(name,fn)=>{handler=fn;}},URL,Response,fetch:async()=>{throw Error('offline');}};
 vm.runInNewContext(await readFile('public/sw.js','utf8'),ctx);
 let response;const respondWith=p=>{response=p;};handler({request:{mode:'cors',url:'https://touchline.test/api/match-live'},respondWith});assert.equal(response,undefined);
 handler({request:{mode:'navigate',url:'https://other.test/'},respondWith});assert.equal(response,undefined);
 handler({request:{mode:'navigate',url:'https://touchline.test/'},respondWith});const r=await response;assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(await r.text(),/You’re offline/);
});
