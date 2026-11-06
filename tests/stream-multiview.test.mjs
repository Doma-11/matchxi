import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const built=await build({entryPoints:['app/stream-multiview-session.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createMultiviewSession}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const game=id=>({id,league:'eng.1',state:'in',completed:false,date:new Date().toISOString(),home:{name:'Home '+id},away:{name:'Away '+id}}),stream=id=>({url:'https://www.soccerstreams.zone/watch/'+id}),embed=id=>'https://dlive.sx/stream/stream-'+id+'.php';
const tick=()=>new Promise(resolve=>setImmediate(resolve));async function settle(){for(let i=0;i<20;i++)await tick();}
test('Multiview loads only selected games, caps at four, rejects duplicates and keeps other tile players unchanged',async()=>{
 let state,calls=[];const client={async listings(g){calls.push('list:'+g.id);return {streams:[stream(g.id+'a'),stream(g.id+'b')]};},async player(s){calls.push('player:'+s.url);return {embedAllowed:true,embedUrl:embed(s.url.split('/').pop())};}};
 const view=createMultiviewSession(client,s=>state=s);assert.deepEqual(calls,[]);
 for(let i=0;i<4;i++)assert.equal(view.select(i,game(String(i))),true);
 assert.equal(view.select(4,game('5')),false);assert.equal(view.select(1,game('0')),false);await settle();assert.equal(state.filter(t=>t?.player?.embedAllowed).length,4);assert.equal(calls.filter(c=>c.startsWith('list')).length,4);
 const prior=state[1].player;view.step(0,1);await settle();assert.equal(state[0].index,1);assert.strictEqual(state[1].player,prior);assert.equal(calls.filter(c=>c.startsWith('list')).length,4,'source changes do not rediscover games');
 const count=calls.length;await settle();assert.equal(calls.length,count,'no recurring work');view.remove(0);assert.equal(state[0],null);view.dispose();
});
test('Multiview shares at most two discovery jobs; queued/cancelled results cannot restore removed tiles',async()=>{
 let state;const pending=[];let active=0,peak=0;const client={listings(g,signal){active++;peak=Math.max(active,peak);return new Promise(resolve=>pending.push({id:g.id,signal,resolve:value=>{active--;resolve(value);}}));},async player(s){return {embedAllowed:true,embedUrl:embed(s.url.split('/').pop())};}};
 const view=createMultiviewSession(client,s=>state=s);for(let i=0;i<4;i++)view.select(i,game(String(i)));assert.equal(pending.length,2);assert.equal(peak,2);
 view.remove(0);assert.equal(pending[0].signal.aborted,true);pending[0].resolve({streams:[stream('old')]});await settle();assert.equal(state[0],null);assert.equal(pending.length,3);assert.equal(peak,2);
 view.remove(3);pending[1].resolve({streams:[stream('1')]});await settle();assert.equal(pending.length,3,'removed queued selection does not fetch');
 view.dispose();assert.equal(pending[2].signal.aborted,true);pending[2].resolve({streams:[stream('late')]});await settle();assert.equal(view.snapshot()[2].player,null);
});
test('Multiview reuses a seeded player without discovery and stops ended matches without affecting others',async()=>{
 let state,calls=0;const g=game('seed'),seed={game:g,streams:[stream('seed')],index:0,player:{embedAllowed:true,embedUrl:embed('seed')},busy:false,error:''};
 const view=createMultiviewSession({listings(){calls++;throw Error('must not fetch');}},s=>state=s,seed);assert.equal(view.snapshot()[0].player.embedUrl,embed('seed'));assert.equal(calls,0);
 view.reconcile([{...g,state:'post',completed:true}]);assert.equal(state[0].player,null);assert.match(state[0].error,/no longer live/);assert.equal(view.select(1,{...game('done'),completed:true}),false);view.dispose();
});
test('Multiview skips restricted embeds and retains explicit external fallback when none pass',async()=>{
 let state;const client={async listings(g){return {streams:[stream('bad'),stream('ok')]};},async player(s){return s.url.endsWith('bad')?{embedAllowed:false,reason:'Restricted'}:{embedAllowed:true,embedUrl:embed('ok')};}};
 const view=createMultiviewSession(client,s=>state=s);view.select(0,game('one'));await settle();assert.equal(state[0].index,1);assert.equal(state[0].player.embedUrl,embed('ok'));
 view.step(0,-1);await settle();assert.equal(state[0].player.embedAllowed,false);assert.equal(state[0].error,'Restricted');view.dispose();
});
