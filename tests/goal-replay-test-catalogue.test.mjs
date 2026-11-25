import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await mkdir('qa-temp',{recursive:true});
async function load(entry,name){const result=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'}});await writeFile('qa-temp/'+name+'.mjs',result.outputFiles[0].text);return import('../qa-temp/'+name+'.mjs');}
const {NATIONS_LEAGUE_TEST_REPLAYS:goals}=await load('app/goal-replay-test-catalogue.ts','ten-goals-catalogue');
const {supportedReplayEmbed}=await load('app/goal-replays.ts','ten-goals-provider');
const {GoalReplayList}=await load('app/goal-replays-panel.tsx','ten-goals-list');
const {ODDSIVIO_TEST_REPLAYS:oddsivioGoals}=await load('app/oddsivio-replay-test-catalogue.ts','oddsivio-goals');
test('Oddsivio test offers five native playback attempts without loading media in the list',()=>{
 assert.equal(oddsivioGoals.length,5);
 assert.equal(new Set(oddsivioGoals.map(goal=>goal.videoUrl)).size,5);
 for(const goal of oddsivioGoals){
  assert.equal(goal.matchDate,'2026-11-24');assert.equal(goal.testOnly,true);
  assert.equal(goal.sourceKind,'oddsivio-goal-timeline');assert.equal(goal.postUrl,'');
  assert.equal(new URL(goal.sourceUrl).hostname,'www.oddsivio.com');
  assert.equal(supportedReplayEmbed(goal.videoUrl),null);
 }
 const html=renderToStaticMarkup(React.createElement(GoalReplayList,{replays:oddsivioGoals,initiallyLoaded:true,selected:null,onSelect(){throw Error('Streamin watch pages must not mount a player');}}));
 assert.equal((html.match(/aria-label="Replay test goal:/g)||[]).length,5);
 for(const goal of oddsivioGoals){assert.ok(html.includes(goal.scorer));assert.ok(html.includes(goal.team));}
 assert.match(html,/5 internal playback tests · 0 external-only/);
 assert.doesNotMatch(html,/<iframe|<video|<script|Playing/);
});
test('catalogue contains ten distinct goals from the requested Sunday and Monday with correct score progression',()=>{
 assert.equal(goals.length,10);assert.equal(new Set(goals.map(goal=>goal.id)).size,10);assert.equal(new Set(goals.map(goal=>new URL(goal.videoUrl).pathname)).size,10);
 assert.deepEqual(goals.map(goal=>goal.matchDate),[...Array(5).fill('2026-11-15'),...Array(5).fill('2026-11-16')]);
 assert.deepEqual(goals.slice(0,5).map(goal=>[goal.minute,goal.team,goal.score]),[['11′','Italy','0–1'],['15′','Belgium','1–1'],['22′','Belgium','2–1'],['26′','Belgium','3–1'],['80′','Belgium','4–1']]);
 assert.deepEqual(goals.slice(5).map(goal=>[goal.minute,goal.team,goal.score]),[['41′','Germany','1–0'],['60′','Germany','2–0'],['65′','Germany','3–0'],['71′','Germany','4–0'],['77′','Germany','5–0']]);
});
test('every clip receives an individual provider check; no Streamin watch page is treated as a playable iframe',()=>{
 for(const goal of goals){assert.equal(supportedReplayEmbed(goal.videoUrl),null,goal.id);assert.equal(goal.embedCheck.result,'external-only');assert.equal(goal.embedCheck.playbackVerified,false);assert.equal(goal.embedCheck.checkedOn,'2026-11-19');assert.match(goal.embedCheck.reason,/No supported video-only Streamin embed verified/);}
});
test('source provenance distinguishes known goal posts from match threads instead of inventing post identifiers',()=>{
 assert.equal(goals.filter(goal=>goal.sourceKind==='goal-post').length,5);assert.equal(goals.filter(goal=>goal.sourceKind==='match-thread').length,5);
 for(const goal of goals){const post=new URL(goal.postUrl);assert.equal(post.hostname,'www.reddit.com');assert.match(post.pathname,/^\/r\/soccer\/comments\//);assert.equal(new URL(goal.videoSourceUrl).hostname,'www.oddsivio.com');assert.equal(goal.testOnly,true);if(goal.sourceKind==='match-thread')assert.match(post.pathname,/match_thread/);}
});
test('test screen renders all ten external actions with scorer team, match, date and honest status, without loading video players',()=>{
 const html=renderToStaticMarkup(React.createElement(GoalReplayList,{replays:goals,initiallyLoaded:true,note:'10 historical Nations League test goals',selected:null,onSelect(){throw Error('External-only clips cannot select a player');}}));
 assert.equal((html.match(/role="listitem"/g)||[]).length,10);assert.equal((html.match(/class="goal-replay-external"/g)||[]).length,10);assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,10);
 assert.match(html,/0 internal playback tests/);assert.match(html,/10 historical Nations League test goals/);assert.match(html,/Francesco Pio Esposito/);assert.match(html,/Belgium vs Italy/);assert.match(html,/Germany vs Netherlands/);assert.match(html,/2026-11-15/);assert.match(html,/2026-11-16/);assert.doesNotMatch(html,/<iframe|<script|<video|Playing|widgets\.js/);
});
const {EMBED_TEST_CANDIDATES:candidates,GoalReplayCandidates}=await load('app/goal-replay-candidates.tsx','embed-test-candidates');
test('one-click embed candidates distinguish the historical goal from the provider sample and load no player before selection',()=>{
 assert.equal(candidates.length,2);
 for(const candidate of candidates)assert.equal(supportedReplayEmbed(candidate.videoUrl)?.provider,'Streamable');
 assert.equal(candidates[0].postUrl,'https://www.reddit.com/r/soccer/comments/f9hd7r/');assert.equal(candidates[0].kind,'goal');assert.equal(candidates[1].kind,'player-test');assert.equal(candidates[1].postUrl,'');
 const html=renderToStaticMarkup(React.createElement(GoalReplayCandidates,{selected:null,onSelect(){throw Error('Only clicks may select a player');}}));
 assert.match(html,/Try Griezmann goal internally/);assert.match(html,/Try provider sample internally/);assert.match(html,/Playback has not been verified/);assert.match(html,/not a football goal/);assert.doesNotMatch(html,/<iframe|<video|<script|Playing/);
});
const {replayPlayback}=await load('app/replay-playback.ts','replay-playback');
const {GoalReplayPlayer}=await load('app/goal-replays-panel.tsx','native-goal-player');
test('native playback is restricted to five exact experimental clips, never arbitrary watch pages or production discovery',()=>{
 for(const goal of oddsivioGoals){
  const source=replayPlayback(goal);assert.equal(source.kind,'native');assert.equal(new URL(source.url).origin,'https://c-cdn.streamin.top');
  for(const extra of [{testOnly:false},{id:'other'},{videoUrl:goal.videoUrl+'?redirect=1'},{videoUrl:goal.videoUrl.replace('streamin.link','streamin.link.evil.test')}])assert.equal(replayPlayback({...goal,...extra}),null);
  const html=renderToStaticMarkup(React.createElement(GoalReplayPlayer,{replay:goal,onClose(){}}));
  assert.match(html,/<video/);assert.match(html,/aria-label="Play goal replay"/);assert.doesNotMatch(html,/aria-label="Loading goal replay"/);assert.match(html,/preload="none"/);assert.match(html,/controls=""/);assert.match(html,/playsInline=""/);assert.match(html,/Open video/);
  assert.doesNotMatch(html,/<iframe|autoPlay|Playing replay/);
 }
});
