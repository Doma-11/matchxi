import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('qa-temp',{recursive:true});
async function load(entry,name){const b=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false});await writeFile(`qa-temp/${name}.mjs`,b.outputFiles[0].text);return import(`../qa-temp/${name}.mjs`);}
const {verifiedReplayFallback}=await load('app/verified-goal-replays.ts','verified-replay-fallback');
const {createOddsivioDiscovery}=await load('app/api/match-replays/oddsivio.ts','replay-backoff');
const {replaySearchUpdate}=await load('app/replay-search-state.ts','replay-search-state');
const {replayPlayback}=await load('app/replay-playback.ts','verified-native-playback');
const match={id:'401915378',home:'Sabah FK',away:'Barcelona',date:'2026-11-25T17:45Z',league:'uefa.champions'};
test('verified fallback belongs only to this exact fixture and keeps the five known native clips',()=>{
 const data=verifiedReplayFallback(match);assert.equal(data.replays.length,5);assert.equal(data.verifiedOn,'2026-11-25');
 for(const goal of data.replays){assert.equal(goal.testOnly,false);assert.equal(replayPlayback(goal).kind,'native');}
 for(const extra of [{home:'Chelsea'},{away:'Napoli'},{date:'2026-11-26T17:45Z'},{date:'2026-11-25T18:45Z'},{league:'eng.1'}])assert.equal(verifiedReplayFallback({...match,...extra}),null);
});
test('access denial keeps its real reason during cooldown and serves labelled verified clips without retries',async()=>{
 let clock=0,calls=0;const discover=createOddsivioDiscovery({now:()=>clock,fetcher:async()=>{calls++;return new Response('',{status:403});}});
 const first=await discover(match);assert.equal(first.replays.length,5);assert.equal(first.sourceError,'REPLAY_SOURCE_ACCESS_DENIED');assert.match(first.notice,/Verified clips.*access denied/);assert.equal(first.retryAfter,60);
 clock=15000;const second=await discover(match);assert.equal(second.sourceError,'REPLAY_SOURCE_ACCESS_DENIED');assert.equal(second.retryAfter,45);assert.equal(calls,1);
 const other=await discover({...match,home:'Chelsea'});assert.equal(other.replays.length,0);assert.equal(other.code,'REPLAY_SOURCE_ACCESS_DENIED');assert.equal(calls,1);
 clock=61000;assert.equal(calls,1);await discover(match);assert.equal(calls,2);
});
test('a real rate limit reports the remaining server cooldown instead of sending more requests',async()=>{
 let calls=0,clock=0;const discover=createOddsivioDiscovery({now:()=>clock,fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'120'}});}});
 assert.equal((await discover(match)).retryAfter,120);clock=30000;const second=await discover(match);assert.equal(second.sourceError,'REPLAY_SOURCE_RATE_LIMITED');assert.equal(second.retryAfter,90);assert.equal(second.replays.length,5);assert.equal(calls,1);
});
test('a failed refresh preserves loaded goals and clearly distinguishes access denial from a rate limit',()=>{
 const previous=verifiedReplayFallback(match).replays;
 const denied=replaySearchUpdate(previous,false,{code:'REPLAY_SOURCE_ACCESS_DENIED',retryAfter:60});assert.equal(denied.goals,previous);assert.match(denied.message,/denied/);assert.equal(denied.retryAfter,60);
 const limited=replaySearchUpdate(previous,false,{code:'REPLAY_SOURCE_RATE_LIMITED',retryAfter:120});assert.equal(limited.goals,previous);assert.match(limited.message,/wait/);assert.equal(limited.retryAfter,120);
 const malformed=replaySearchUpdate(previous,true,{retryAfter:Infinity});assert.equal(malformed.goals,previous);assert.equal(malformed.retryAfter,0);
});
test('fallback status is displayed truthfully, while a successful empty lookup remains empty',()=>{
 const data=verifiedReplayFallback(match),notice='Verified clips · live lookup unavailable.';
 const update=replaySearchUpdate([],true,{...data,notice,retryAfter:60});assert.equal(update.goals.length,5);assert.equal(update.message,notice);
 const empty=replaySearchUpdate(update.goals,true,{replays:[],notice:''});assert.deepEqual(empty.goals,[]);assert.equal(empty.message,'');
});
test('verified fallback does not override a successful source response with no clips',async()=>{
 const flight=props=>'<script>self.__next_f.push('+JSON.stringify([1,'89:'+JSON.stringify(['$','$L8a',null,props])+'\n'])+')</script>';
 const index=flight({todayFixtures:[{id:121770,home_team_id:818,away_team_id:446,home_team_name:'Sabah FA',away_team_name:'Barcelona',kickoff_at:match.date}]}),page=flight({initialMatch:{id:121770,kickoff_at:match.date,home_team:{id:818,name:'Sabah FA',country:'Azerbaijan'},away_team:{id:446,name:'Barcelona'}},initialVideos:{match_id:121770,videos:[]}});
 const discover=createOddsivioDiscovery({fetcher:async url=>new Response(url.endsWith('/matches')?index:page,{headers:{'content-type':'text/html'}})});
 const result=await discover(match);assert.deepEqual(result.replays,[]);assert.equal(result.sourceError,undefined);assert.equal(result.source,'Oddsivio');
});
