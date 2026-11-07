import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const compiled=await build({entryPoints:['app/api/stream-player/route.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'fake-blobs',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'blobs',namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:'const records=new Map();export function getStore(){return {get:async k=>records.get(k)||null,setJSON:async(k,v)=>records.set(k,v)}}'}))}}]});
const {GET}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const request=listing=>new Request('https://matchxi.netlify.app/api/stream-player?'+new URLSearchParams({url:'https://www.soccerstreams.zone/watch/'+listing+'.htm'}));
test('new listing domain reaches the same verified player flow',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('soccerstreams.click')?new Response('<iframe src="https://dlive.sx/stream/new-listing.php"></iframe>'):new Response('player');
 try{const r=await GET(new Request('https://matchxi.netlify.app/api/stream-player?'+new URLSearchParams({url:'https://www.soccerstreams.click/hd-18'})));assert.equal(r.status,200);const d=await r.json();assert.equal(d.embedAllowed,true);assert.equal(d.embedUrl,'https://dlive.sx/stream/new-listing.php');}finally{globalThis.fetch=previous;}
});
test('reviewed alternate Arsenal player is verified, saved and reused',async()=>{const previous=globalThis.fetch;let calls=0;globalThis.fetch=async url=>{calls++;return String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://dlive.sx/stream/stream-31.php"></iframe>'):new Response('player')};try{const data=await(await GET(request('tnt-1'))).json();assert.equal(data.embedAllowed,true);assert.equal(data.embedUrl,'https://dlive.sx/stream/stream-31.php');assert.equal((await(await GET(request('tnt-1'))).json()).embedAllowed,true);assert.equal(calls,2)}finally{globalThis.fetch=previous}});
test('Inter/new provider 403 and SAMEORIGIN remain blocked, never labelled playable',async()=>{const previous=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://ww1.sportsonnline.click/channels/hd/hd7.php"></iframe>'):new Response('blocked',{status:403,headers:{'X-Frame-Options':'SAMEORIGIN'}});try{const data=await(await GET(request('hd-7'))).json();assert.equal(data.embedAllowed,false);assert.equal(data.embedUrl,undefined);assert.match(data.reason,/restricts playback/)}finally{globalThis.fetch=previous}});
test('HTTP errors without a frame policy are unverified, not assumed embeddable',async()=>{const previous=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://dlive.sx/stream/stream-99.php"></iframe>'):new Response('unavailable',{status:503});try{const data=await(await GET(request('unavailable'))).json();assert.equal(data.embedAllowed,false);assert.equal(data.embedUrl,undefined);assert.match(data.reason,/could not be verified/)}finally{globalThis.fetch=previous}});

test('current published players use the same provider checks and preserve frame restrictions',async()=>{
 const previous=globalThis.fetch;
 try{
  for(const [id,embed] of [['current-hd','https://sportsoonline.click/channels/hd/hd1.php'],['current-stream','https://embedcenter.st/embed/ch1.php']]){
   globalThis.fetch=async url=>String(url).includes('soccerstreams.zone')?new Response(`<iframe src="${embed}"></iframe>`):new Response('player');
   const data=await(await GET(request(id))).json();assert.equal(data.embedAllowed,true);assert.equal(data.embedUrl,embed);
  }
  globalThis.fetch=async url=>String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://sportsoonline.click/channels/hd/hd1.php"></iframe>'):new Response('blocked',{headers:{'Content-Security-Policy':"frame-ancestors 'self'"}});
  const denied=await(await GET(request('current-restricted'))).json();assert.equal(denied.embedAllowed,false);assert.equal(denied.embedUrl,undefined);
 }finally{globalThis.fetch=previous;}
});

test('a previously working provider is rechecked after fifteen minutes',async()=>{
 const previous=globalThis.fetch,realNow=Date.now;let calls=0;
 try{
  globalThis.fetch=async url=>{calls++;return String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://sportsoonline.click/channels/hd/hd1.php"></iframe>'):new Response('player');};
  assert.equal((await(await GET(request('expiring-player'))).json()).embedAllowed,true);
  assert.equal((await(await GET(request('expiring-player'))).json()).embedAllowed,true);assert.equal(calls,2);
  Date.now=()=>realNow()+16*60*1000;
  globalThis.fetch=async url=>{calls++;return String(url).includes('soccerstreams.zone')?new Response('<iframe src="https://sportsoonline.click/channels/hd/hd1.php"></iframe>'):new Response('blocked',{status:403,headers:{'X-Frame-Options':'SAMEORIGIN'}});};
  assert.equal((await(await GET(request('expiring-player'))).json()).embedAllowed,false);assert.equal(calls,4);
 }finally{globalThis.fetch=previous;Date.now=realNow;}
});
