import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/api/match-streams/route.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mock-store',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'store',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export function getStore(){return {get:async k=>globalThis.streamTestStore.get(k),setJSON:async(k,v)=>globalThis.streamTestStore.set(k,v)}}',loader:'js'}));}}]});const {GET}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
test('successful listings are reused per fixture without another source fetch',async()=>{globalThis.streamTestStore=new Map();const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('<tr><td>12:00</td><td>Arsenal vs Leeds United</td><td><a href="/hd-1">Watch</a></td></tr>');};try{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());const request=id=>new Request('https://app.test/api/match-streams?'+new URLSearchParams({home:'Arsenal',away:'Leeds United',date,id,league:'eng.1',live:'true'}));const first=await(await GET(request('1'))).json();const second=await(await GET(request('1'))).json();assert.equal(first.streams.length,1);assert.deepEqual(second,first);assert.equal(calls,1);await GET(request('2'));assert.equal(calls,2);}finally{globalThis.fetch=original;delete globalThis.streamTestStore;}});

test('unknown listing spellings are recorded without accepting wrong teams or adding fetches',async()=>{
 globalThis.streamTestStore=new Map();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('<tr><td>12:00</td><td>Unknown Albion vs Leeds United</td><td><a href="/hd-1">Watch</a></td></tr>');};
 try{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
  const request=new Request('https://app.test/api/match-streams?'+new URLSearchParams({home:'Arsenal',away:'Leeds United',date,id:'3',league:'eng.1',live:'true'}));
  const result=await(await GET(request)).json();assert.deepEqual(result.streams,[]);assert.equal(calls,1);
  const diagnostics=[...globalThis.streamTestStore.entries()].filter(([key])=>key.startsWith('diagnostics/'));
  assert.equal(diagnostics.length,1);assert.equal(diagnostics[0][1].requested.homeIdentity,'club:arsenal');
  assert.deepEqual(diagnostics[0][1].unmatchedListings,[{home:'Unknown Albion',away:'Leeds United',unresolved:['Unknown Albion']}]);
  assert.equal([...globalThis.streamTestStore.keys()].some(k=>k.startsWith('match-')),false);
 }finally{globalThis.fetch=original;delete globalThis.streamTestStore;}
});

test('live listings expire and an explicit refresh replaces a still-fresh cache entry',async()=>{
 globalThis.streamTestStore=new Map();
 const original=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>new Response(`<tr><td>12:00</td><td>Arsenal vs Leeds United</td><td><a href="/hd-${++calls}">Watch</a></td></tr>`);
 try{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
  const url='https://app.test/api/match-streams?'+new URLSearchParams({home:'Arsenal',away:'Leeds United',date,id:'4',league:'eng.1',live:'true'});
  const read=async(suffix='')=>(await (await GET(new Request(url+suffix))).json()).streams[0].url;
  assert.match(await read(),/hd-1$/);
  const cached=[...globalThis.streamTestStore.values()][0];
  cached.checkedAt=new Date(Date.now()-121000).toISOString();
  assert.match(await read(),/hd-2$/);
  assert.match(await read('&refresh=1'),/hd-3$/);
  assert.match(await read(),/hd-3$/);
  assert.equal(calls,3);
 }finally{globalThis.fetch=original;delete globalThis.streamTestStore;}
});
