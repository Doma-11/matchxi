import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/stream-embed.ts'],bundle:true,platform:'node',format:'esm',write:false});const {publishedStreamPlayer,allowsStreamEmbedding,fetchStreamPage}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
const app='https://matchxi.netlify.app';
test('follows only the reviewed listing domain migration; provider redirects remain same-host',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>++calls===1?new Response(null,{status:301,headers:{Location:'https://www.soccerstreams.click/hd-1'}}):new Response('listing');
  assert.equal((await fetchStreamPage('https://www.soccerstreams.zone/hd-1')).status,200);assert.equal(calls,2);
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://evil.example/hd-1'}});
  await assert.rejects(fetchStreamPage('https://www.soccerstreams.click/hd-1'),/Unexpected stream redirect/);
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://www.soccerstreams.click/hd-1'}});
  await assert.rejects(fetchStreamPage('https://dlive.sx/stream/player.php'),/Unexpected stream redirect/);
 }finally{globalThis.fetch=original;}
});
test('uses only published HTTPS players on the supported provider',()=>{assert.equal(publishedStreamPlayer('<iframe src="https://w6.sportsonliine.click/channels/hd/hd1.php"></iframe>'),'https://w6.sportsonliine.click/channels/hd/hd1.php');for(const src of ['http://w6.sportsonliine.click/x','https://evil.example/x','javascript:alert(1)'])assert.equal(publishedStreamPlayer(`<iframe src="${src}"></iframe>`),null);});
test('does not bypass X-Frame-Options or CSP ancestor restrictions',()=>{assert.equal(allowsStreamEmbedding(new Headers(),app),true);for(const x of ['DENY','SAMEORIGIN'])assert.equal(allowsStreamEmbedding(new Headers({'X-Frame-Options':x}),app),false);for(const csp of ["frame-ancestors 'none'","frame-ancestors 'self'","frame-ancestors https://another.example"])assert.equal(allowsStreamEmbedding(new Headers({'Content-Security-Policy':csp}),app),false);assert.equal(allowsStreamEmbedding(new Headers({'Content-Security-Policy':`frame-ancestors ${app}`}),app),true);});

test('follows canonical slash redirects but rejects a different host',async()=>{const original=globalThis.fetch;let calls=[];globalThis.fetch=async url=>{calls.push(String(url));return calls.length===1?new Response(null,{status:301,headers:{Location:'/hd-1/'}}):new Response('player');};try{const response=await fetchStreamPage('https://www.soccerstreams.zone/hd-1');assert.equal(response.status,200);assert.deepEqual(calls,['https://www.soccerstreams.zone/hd-1','https://www.soccerstreams.zone/hd-1/']);globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://evil.example/player'}});await assert.rejects(()=>fetchStreamPage('https://www.soccerstreams.zone/hd-1'));}finally{globalThis.fetch=original;}});

test('recognizes current Arsenal/Inter published hosts and skips an unrelated first frame',()=>{
 for(const src of ['https://ww1.sportsonnline.click/channels/hd/hd7.php','https://ww1.sportsonnline.click/channels/hd/hd5.php','https://dlive.sx/stream/stream-31.php'])assert.equal(publishedStreamPlayer(`<iframe src="https://ads.example/frame"></iframe><iframe src="${src}"></iframe>`),src);
 assert.equal(publishedStreamPlayer('<iframe data-src="https://dlive.sx/stream/stream-31.php"></iframe>'),'https://dlive.sx/stream/stream-31.php');
 for(const src of ['https://dlive.sx.evil.example/stream/1','https://user:password@dlive.sx/stream/1','https://dlive.sx:9443/stream/1','http://ww1.sportsonnline.click/x','https://sportsonnline.click.evil.example/x'])assert.equal(publishedStreamPlayer(`<iframe src="${src}"></iframe>`),null);
});

test('recognizes the replacement player hosts published in current live listings',()=>{
 for(const src of ['https://sportsoonline.click/channels/hd/hd1.php','https://sportsoonline.click/channels/pt/eleven1.php','https://sportsoonline.click/channels/bra/br2.php','https://embedcenter.st/embed/ch1.php']){
  assert.equal(publishedStreamPlayer(`<iframe src="https://ads.example/frame"></iframe><iframe src="${src}"></iframe>`),src);
 }
 for(const src of ['https://sportsoonline.click.evil.example/channels/hd/hd1.php','https://evil.sportsoonline.click/channels/hd/hd1.php','https://embedcenter.st.evil.example/embed/ch1.php','https://embedcenter.st/advertising','https://sportsoonline.click/ads','http://sportsoonline.click/channels/hd/hd1.php']){
  assert.equal(publishedStreamPlayer(`<iframe src="${src}"></iframe>`),null);
 }
});
