import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await mkdir('qa-temp',{recursive:true});
async function load(entry,name){const b=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'}});await writeFile(`qa-temp/${name}.mjs`,b.outputFiles[0].text);return import(`../qa-temp/${name}.mjs`);}
const {streaminWatch,streaminMedia,streaminMediaFromHtml}=await load('app/streamin-playback.ts','streamin-validation');
const {createStreaminResolver,GET}=await load('app/api/replay-source/route.ts','streamin-resolver');
const {replayPlayback}=await load('app/replay-playback.ts','streamin-playback-policy');
const {GoalReplayPlayer}=await load('app/goal-replays-panel.tsx','streamin-live-player');
const watch='https://streamin.link/v/79a89a60',src='https://c-cdn.streamin.top/uploads/79a89a60.mp4?15hoursago';
const html=`<video id="video"><source src="${src}" type="video/mp4"></video>`;
const response=body=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}});
test('live Streamin links select on-demand resolution, not a guessed media URL or an immediate player',()=>{
 const goal={id:'live-goal',scorer:'Scorer',minute:'55′',videoUrl:watch,testOnly:false};
 assert.equal(replayPlayback(goal).kind,'resolve');assert.equal(replayPlayback(goal).url,'https://streamin.me/v/79a89a60');
 const rendered=renderToStaticMarkup(React.createElement(GoalReplayPlayer,{replay:goal,onClose(){}}));
 assert.match(rendered,/Loading goal replay/);assert.doesNotMatch(rendered,/<video|<iframe|In-app playback is unavailable/);
});
test('watch URLs and returned media cannot escape the provider or change clip identity',()=>{
 assert.equal(streaminWatch(watch).embed,'https://streamin.me/embed/79a89a60');
 for(const url of ['http://streamin.me/v/79a89a60','https://streamin.me.evil/v/79a89a60','https://streamin.me:444/v/79a89a60','https://user@streamin.me/v/79a89a60',watch+'?url=http://localhost',watch+'#x','https://streamin.me/v/../admin'])assert.equal(streaminWatch(url),null,url);
 for(const url of ['https://evil.test/uploads/79a89a60.mp4','https://c-cdn.streamin.top.evil/uploads/79a89a60.mp4','https://c-cdn.streamin.top/uploads/abcdef12.mp4','https://u@c-cdn.streamin.top/uploads/79a89a60.mp4','http://c-cdn.streamin.top/uploads/79a89a60.mp4'])assert.equal(streaminMedia(url,'79a89a60'),null,url);
 assert.equal(streaminMediaFromHtml(html,'79a89a60'),src);
 assert.equal(streaminMediaFromHtml(`<script>const src='${src}'</script>`,'79a89a60'),null);
 assert.equal(streaminMediaFromHtml(html,'abcdef12'),null);
});
test('resolver fetches metadata only, coalesces requests and expires its short cache',async()=>{
 let calls=0,clock=0;const resolve=createStreaminResolver({now:()=>clock,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://streamin.me/v/79a89a60');assert.equal(options.redirect,'error');return response(html);}});
 assert.equal(await resolve('https://evil.test'),null);assert.equal(calls,0);
 assert.deepEqual(await Promise.all([resolve(watch),resolve(watch)]),[src,src]);assert.equal(calls,1);
 assert.equal(await resolve(watch),src);assert.equal(calls,1);clock=180001;assert.equal(await resolve(watch),src);assert.equal(calls,2);
});
test('access denial, redirects, missing media and oversized HTML do not retry or probe a CDN',async()=>{
 for(const make of [()=>new Response('',{status:403}),()=>{throw Error('redirect')},()=>response('<video></video>'),()=>response('x'.repeat(262145)),()=>new Response(src,{headers:{'content-type':'video/mp4'}})]){
  let calls=0;const resolve=createStreaminResolver({fetcher:async()=>{calls++;return make();}});assert.equal(await resolve(watch),null);assert.equal(calls,1);
 }
 assert.equal((await GET(new Request('https://app.test/api/replay-source?url=https://localhost/'))).status,400);
});
