import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('qa-temp',{recursive:true});
async function load(entry,name){const b=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false});await writeFile(`qa-temp/${name}.mjs`,b.outputFiles[0].text);return import(`../qa-temp/${name}.mjs`);}
const {oddsivioRecords,oddsivioGoals,oddsivioFixtures,oddsivioRecentMatches,sameReplayFixture}=await load('app/oddsivio-replays.ts','oddsivio-goal-parser');
const {createOddsivioDiscovery}=await load('app/api/match-replays/oddsivio.ts','oddsivio-discovery');
const {replayPlayback}=await load('app/replay-playback.ts','oddsivio-live-playback');
const match={id:'city-napoli',home:'Manchester City',away:'Napoli',league:'uefa.champions',date:'2026-11-24T20:00:00Z'};
const fixture={id:121642,home_team_name:'Manchester City',away_team_name:'Napoli',kickoff_at:match.date};
function flight(props){return '<script>self.__next_f.push('+JSON.stringify([1,'89:'+JSON.stringify(['$','$L8a',null,props])+'\n'])+')</script>';}
const index=flight({todayFixtures:[fixture]}),recent='<a href="/matches/121642">Manchester City 2–2 Napoli<span> — Champions League</span></a>';
const home={id:438,name:'Manchester City'},away={id:488,name:'Napoli'};
const events=[['79a89a60',55,'Rasmus Højlund',488,0,1],['9bdbca82',67,'Ayyoub Bouaddi',438,1,1],['30d59f48',76,'Noa Lang',488,1,2],['77b71472',86,'Rayan Cherki',438,2,2]].map(([clip,minute,name,team_id,h,a],i)=>({clip,id:100+i,event_type:'goal',minute,team_id,player:{name},home_score_after:h,away_score_after:a,detail:'Normal Goal'}));
const videos=events.map((e,i)=>({id:200+i,match_event_id:e.id,platform:'streamin',video_type:'goal_clip',source_url:'https://streamin.link/v/'+e.clip,scorer_name:e.player.name,minute:e.minute,title:`Manchester City ${e.team_id===438?'['+e.home_score_after+']':e.home_score_after} - ${e.team_id===488?'['+e.away_score_after+']':e.away_score_after} Napoli - ${e.player.name} ${e.minute}'`}));
function page(overrides={}){return flight({initialMatch:{id:121642,kickoff_at:match.date,home_team:home,away_team:away},initialVideos:{match_id:121642,videos},initialEvents:{match_id:121642,events},...overrides});}
const response=html=>new Response(html,{headers:{'content-type':'text/html'}});
test('live Flight text records use UTF-8 byte lengths without consuming the following props',()=>{
 const text='Live score — Højlund\nSabah FA vs Barcelona',record='89:'+JSON.stringify(['$','$L8a',null,{todayFixtures:[fixture]}])+'\n';
 const stream='87:T'+Buffer.byteLength(text).toString(16)+','+text+record;
 const html='<script>self.__next_f.push('+JSON.stringify([1,stream])+')</script>';
 assert.equal(oddsivioRecords(html).length,1);assert.equal(oddsivioFixtures(html)[0].id,121642);
});
test('public match metadata yields the four City–Napoli test goals with scorer, scoring team and internal Streamin playback',()=>{
 assert.equal(oddsivioFixtures(index)[0].id,121642);assert.deepEqual(oddsivioRecentMatches(recent,match),[121642]);
 const goals=oddsivioGoals(page(),match,121642);assert.deepEqual(goals.map(g=>[g.minute,g.scorer,g.team,g.score]),[['55′','Rasmus Højlund','Napoli','0–1'],['67′','Ayyoub Bouaddi','Manchester City','1–1'],['76′','Noa Lang','Napoli','1–2'],['86′','Rayan Cherki','Manchester City','2–2']]);
 for(const goal of goals){assert.equal(replayPlayback(goal).kind,'resolve');assert.equal(goal.testOnly,false);assert.equal(goal.postUrl,'');}
});
test('fixture matching requires both teams, kickoff time, and the correct source match ID',()=>{
 const f=oddsivioFixtures(index)[0];assert.equal(sameReplayFixture(f,{...match,home:'Man City'}),true);assert.equal(sameReplayFixture(f,{...match,away:'Chelsea'}),false);assert.equal(sameReplayFixture(f,{...match,date:'2026-11-25T20:00:00Z'}),false);
 assert.throws(()=>oddsivioGoals(page(),{...match,away:'Chelsea'},121642),/MISMATCH/);assert.throws(()=>oddsivioGoals(page(),match,123),/MISMATCH/);assert.throws(()=>oddsivioGoals(page({initialVideos:null}),match,121642),/UNAVAILABLE/);assert.throws(()=>oddsivioFixtures('<html>Layout changed</html>'),/UNAVAILABLE/);
 assert.deepEqual(oddsivioGoals(page({initialVideos:{match_id:121642,videos:[]}}),match,121642),[]);
});
test('only eligible single goals qualify; duplicate links coalesce and added time and own goals retain correct labels',()=>{
 const extra={...events[0],extra_minute:2,minute:45,detail:'Own Goal',team_id:438};
 const clips=[videos[0],{...videos[0],id:999},...['highlight','other'].map(video_type=>({...videos[0],video_type})),{...videos[1],title:'Disallowed goal'},{...videos[2],source_url:'https://evil.test/v/30d59f48'},{...videos[3],embeddable:false}];
 const goals=oddsivioGoals(page({initialEvents:{match_id:121642,events:[extra,...events.slice(1)]},initialVideos:{match_id:121642,videos:clips}}),match,121642);
 assert.equal(goals.length,2);assert.equal(goals[1].sources[0].externalOnly,true);assert.equal(goals[0].sources.length,1);assert.equal(goals[0].minute,'45+2′');assert.equal(goals[0].scorer,'Rasmus Højlund (OG)');assert.equal(goals[0].team,'Napoli');
});
test('Find performs two bounded public-page requests, no Reddit, video or score API requests, and reuses a brief cache',async()=>{
 let clock=0;const calls=[];const discover=createOddsivioDiscovery({now:()=>clock,fetcher:async(url,options)=>{calls.push(url);assert.equal(options.redirect,'error');return response(url.endsWith('/matches')?index:page());}});
 assert.equal(calls.length,0);const [a,b]=await Promise.all([discover(match),discover(match)]);assert.equal(a.replays.length,4);assert.equal(b.replays.length,4);assert.deepEqual(calls,['https://www.oddsivio.com/matches','https://www.oddsivio.com/matches/121642?tab=videos']);assert.equal((await discover(match)).cached,true);assert.equal(calls.length,2);
 clock=45001;await discover(match);assert.equal(calls.length,4);
});
test('clips without an event ID must match both title teams, and preserve title added time',()=>{
 const clip={...videos[0],match_event_id:null,minute:90,title:"Manchester City 0 - [1] Napoli - R. Højlund 90+4'"};
 const data=initialVideos=>page({initialVideos:{match_id:121642,videos:initialVideos}});
 const goals=oddsivioGoals(data([clip]),match,121642);assert.equal(goals[0].minute,'90+4′');assert.equal(goals[0].team,'Napoli');
 assert.equal(oddsivioGoals(data([{...clip,title:clip.title.replace('Manchester City','Arsenal')}]),match,121642).length,0);
});
test('yesterday uses one bounded recent-index fallback and verifies the match date before returning links',async()=>{
 const calls=[];const discover=createOddsivioDiscovery({fetcher:async url=>{calls.push(url);return response(url.endsWith('/matches')?flight({todayFixtures:[]}):url.endsWith('/highlights')?recent:page());}});
 const result=await discover(match);assert.equal(result.replays.length,4);assert.equal(calls.length,3);assert.equal(result.source,'Oddsivio');
 const wrong=await discover({...match,id:'wrong-date',date:'2026-11-25T20:00:00Z'});assert.equal(wrong.code,'REPLAY_MATCH_MISMATCH');assert.equal(wrong.replays.length,0);
});
test('denied, rate-limited, oversized, redirected and changed pages stop without retry or alternate hosts',async()=>{
 for(const status of [403,429]){let calls=0;const discover=createOddsivioDiscovery({fetcher:async()=>{calls++;return new Response('',{status});}});assert.match((await discover(match)).code,/ACCESS_DENIED|RATE_LIMITED/);await discover({...match,id:'other'});assert.equal(calls,1);}
 for(const make of [()=>{throw Error('redirect')},()=>response('x'.repeat(2*1024*1024+1)),()=>response('<html>Unknown layout</html>')]){let calls=0;const discover=createOddsivioDiscovery({fetcher:async()=>{calls++;return make();}});assert.equal((await discover(match)).code,'REPLAY_SOURCE_UNAVAILABLE');assert.equal(calls,1);}
});
test('the live route uses Oddsivio and the visible live controls no longer require Reddit configuration',async()=>{
 const route=await readFile('app/api/match-replays/route.ts','utf8'),ui=await readFile('app/live-goal-replays.tsx','utf8'),settings=await readFile('app/goal-replay-settings.tsx','utf8');
 assert.match(route,/const discover=createOddsivioDiscovery\(\)/);assert.doesNotMatch(ui+settings,/REDDIT_|Reddit/);
});
