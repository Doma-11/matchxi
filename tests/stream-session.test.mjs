import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const built=await build({entryPoints:['app/stream-session.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createStreamSession,streamGameKey,streamDay,streamStep,liveStreamGames,streamMinute}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const storage=()=>{const records=new Map();return {getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};};
const fixture=(id='1',extra={})=>({id,league:'eng.1',state:'in',completed:false,date:new Date().toISOString(),home:{name:'Home',score:1},away:{name:'Away',score:0},...extra});
const signal=()=>new AbortController().signal;
const stream={url:'https://www.soccerstreams.zone/watch/live.htm'},embed='https://dlive.sx/stream/stream-31.php';
test('manual source arrows wrap and live-game menu excludes finals, upcoming, other days and duplicates',()=>{
 assert.equal(streamStep(0,-1,4),3);assert.equal(streamStep(3,1,4),0);assert.equal(streamStep(0,1,1),0);assert.equal(streamStep(0,1,0),0);
 const a=fixture('fm-7'),b=fixture('8'),old=fixture('old',{date:'2020-01-01T18:00:00Z'}),done=fixture('done',{completed:true}),pre=fixture('pre',{state:'pre'});
 assert.equal(streamGameKey(a),streamGameKey({...a,id:'7'}));assert.deepEqual(liveStreamGames([b,a,{...a,id:'7'},old,done,pre],a).map(streamGameKey),[streamGameKey(a),streamGameKey(b)]);
 assert.equal(streamMinute({...a,status:'45+2′'}),'45+2′');assert.equal(streamMinute({...a,statusName:'STATUS_HALFTIME'}),'HT');
});
test('stream listings and verified players are fetched only on demand and reused, without warming other streams',async()=>{
 const calls=[],local=storage(),session=storage();const client=createStreamSession({local,session,fetcher:async(url)=>{calls.push(String(url));return Response.json(String(url).startsWith('/api/match-streams')?{streams:[stream,stream,{url:'javascript:bad'}, {url:'https://www.soccerstreams.zone/watch/another.htm'}]}:{embedAllowed:true,embedUrl:embed});}});
 assert.equal(calls.length,0);const game=fixture();const list=await client.listings(game,signal());assert.equal(list.streams.length,2);assert.equal(calls.length,1);
 await client.listings(game,signal());assert.equal(calls.length,1);
 await client.player(list.streams[0],signal());assert.equal(calls.length,2);await client.player(list.streams[0],signal());assert.equal(calls.length,2);
 assert.ok(!calls.some(c=>c.includes('another.htm')));assert.match(calls[0],/live=true/);
});
test('negative results are not saved as working players; forbidden or untrusted embeds never become playable',async()=>{
 const local=storage();let calls=0;const client=createStreamSession({local,session:storage(),fetcher:async()=>{calls++;return Response.json({embedAllowed:false,reason:'This provider restricts playback.'});}});
 for(let i=0;i<2;i++){const result=await client.player(stream,signal());assert.equal(result.embedAllowed,false);assert.equal(result.embedUrl,undefined);assert.match(result.reason,/restricts/);}
 assert.equal(calls,2);const unsafe=createStreamSession({local,session:storage(),fetcher:async()=>Response.json({embedAllowed:true,embedUrl:'https://ads.example/player'})});assert.equal((await unsafe.player(stream,signal())).embedAllowed,false);
});
test('Other games reuses fresh Home data and only refreshes stale snapshots on explicit opening',async()=>{
 const session=storage(),local=storage(),at=Date.now(),game=fixture();let calls=0;
 const client=createStreamSession({local,session,now:()=>at,fetcher:async(url)=>{calls++;assert.match(String(url),/^\/api\/match-day\?/);return Response.json({games:[game],checkedAt:new Date(at).toISOString()});}});
 session.setItem('touchline-match-day',JSON.stringify({date:streamDay(),games:[game],checkedAt:new Date(at-30000).toISOString()}));
 await client.games(signal());assert.equal(calls,0);
 session.setItem('touchline-match-day',JSON.stringify({date:streamDay(),games:[game],checkedAt:new Date(at-90000).toISOString()}));
 await client.games(signal());assert.equal(calls,1);await client.games(signal());assert.equal(calls,1);
 assert.equal(JSON.parse(session.getItem('touchline-match-day')).checkedAt,new Date(at-90000).toISOString(),'stream menu does not overwrite Home history cache');
});
test('late cancelled requests cannot publish a player or write a saved working result',async()=>{
 const local=storage(),controller=new AbortController();let respond;const client=createStreamSession({local,session:storage(),fetcher:()=>new Promise(resolve=>{respond=resolve;})});
 const request=client.player(stream,controller.signal);controller.abort();respond(Response.json({embedAllowed:true,embedUrl:embed}));
 await assert.rejects(request,{name:'AbortError'});assert.equal(local.getItem('touchline-stream-player-v2-'+stream.url),null);
 const before=new AbortController();before.abort();await assert.rejects(client.listings(fixture(),before.signal),{name:'AbortError'});
});
test('empty listing cache can be retried explicitly and a source failure does not discard existing stored coverage',async()=>{
 const local=storage(),game=fixture();let calls=0;const client=createStreamSession({local,session:storage(),fetcher:async()=>{calls++;return calls===1?Response.json({streams:[]}):calls===2?Response.json({streams:[stream]}):Response.json({error:'Source unavailable'},{status:503});}});
 assert.equal((await client.listings(game,signal())).streams.length,0);assert.equal((await client.listings(game,signal(),true)).streams.length,1);
 await assert.rejects(client.listings(game,signal(),true),/Source unavailable/);assert.equal((await client.listings(game,signal())).streams.length,1);assert.equal(calls,3);
});

test('explicit game switching skips rejected and failed sources, stops on a verified embed, and respects cancellation',async()=>{
 const {firstEmbeddableStream}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const sources=[1,2,3,4].map(id=>({id})),seen=[],checked=[];
 const found=await firstEmbeddableStream(sources,async source=>{seen.push(source.id);if(source.id===1)return {embedAllowed:false};if(source.id===2)throw Error('Source unavailable');return {embedAllowed:true,embedUrl:embed};},signal(),index=>checked.push(index));
 assert.equal(found.index,2);assert.equal(found.player.embedUrl,embed);assert.deepEqual(seen,[1,2,3]);assert.deepEqual(checked,[0,1,2]);
 const missing=await firstEmbeddableStream(sources,async()=>({embedAllowed:false}),signal());assert.equal(missing.player.embedAllowed,false);assert.equal(missing.player.embedUrl,undefined);
 const controller=new AbortController();let count=0;
 await assert.rejects(firstEmbeddableStream(sources,async()=>{count++;controller.abort();return {embedAllowed:false};},controller.signal),{name:'AbortError'});assert.equal(count,1);
});

test('Broadcast ranking is stable, checks at most two sources concurrently, and keeps failures after supported sources',async()=>{
 const {rankStreamSources}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));let active=0,peak=0;
 const sources=[0,1,2,3,4].map(id=>({id}));const ranked=await rankStreamSources(sources,async source=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setImmediate(resolve));active--;if(source.id===2)throw Error('Source unavailable');return source.id===1||source.id===4?{embedAllowed:true,embedUrl:embed}:{embedAllowed:false};},signal());
 assert.equal(peak,2);assert.deepEqual(ranked.map(s=>s.id),[1,4,0,2,3]);assert.deepEqual(ranked.map(s=>s.embedStatus),['supported','supported','unsupported','unverified','unsupported']);
 const controller=new AbortController();let calls=0;
 await assert.rejects(rankStreamSources(sources,async()=>{calls++;controller.abort();return {embedAllowed:false};},controller.signal),{name:'AbortError'});assert.equal(calls,1,'no subsequent source checks after cancellation');
});


test('switching watched games leaves fixture order fixed, including equal kickoff times',()=>{
 const date=new Date().toISOString(),a=fixture('20',{date}),b=fixture('3',{date}),c=fixture('1',{date});
 const records=[b,a,c],expected=liveStreamGames(records,a).map(streamGameKey);
 for(const current of [b,c,a])assert.deepEqual(liveStreamGames(records,current).map(streamGameKey),expected);
 assert.deepEqual(liveStreamGames([...records].reverse(),c).map(streamGameKey),expected,'source order changes cannot shuffle equal-time fixtures');
});
