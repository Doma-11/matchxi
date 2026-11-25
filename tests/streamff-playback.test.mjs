import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await mkdir('qa-temp',{recursive:true});
async function load(entry,name){const b=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'}});await writeFile(`qa-temp/${name}.mjs`,b.outputFiles[0].text);return import(`../qa-temp/${name}.mjs`);}
const {streamffMedia}=await load('app/streamff-playback.ts','streamff-media');
const {GoalReplayPlayer}=await load('app/goal-replays-panel.tsx','streamff-player');
const watch='https://streamff.pro/v/8d6071e0',media='https://cdn.hostedhost.top/8d6071e0.mp4';
test('native Streamff playback requires the published media URL for the exact watch clip and CDN',()=>{
 assert.equal(streamffMedia(watch,media),media);assert.equal(streamffMedia(watch,undefined),null);
 for(const url of ['https://evil.test/8d6071e0.mp4','https://cdn.hostedhost.top.evil/8d6071e0.mp4','https://cdn.hostedhost.top/849751b2.mp4','https://cdn.hostedhost.top:444/8d6071e0.mp4','https://user@cdn.hostedhost.top/8d6071e0.mp4','http://cdn.hostedhost.top/8d6071e0.mp4'])assert.equal(streamffMedia(watch,url),null,url);
 for(const url of [watch+'?redirect=1',watch+'#x','https://streamff.pro.evil/v/8d6071e0','https://user@streamff.pro/v/8d6071e0'])assert.equal(streamffMedia(url,media),null,url);
});
test('the current Barcelona goal uses the existing native player without preloading, autoplay or a provider iframe',()=>{
 const goal={id:'barcelona-goal',scorer:'Anthony Gordon',minute:'31′',team:'Barcelona',score:'0–1',match:'Sabah FK vs Barcelona',postUrl:'',videoUrl:watch,mediaUrl:media,testOnly:false};
 const html=renderToStaticMarkup(React.createElement(GoalReplayPlayer,{replay:goal,onClose(){}}));
 assert.match(html,/<video/);assert.match(html,/preload="none"/);assert.match(html,/Play goal replay/);assert.match(html,/Close replay and return to live match/);assert.match(html,/Open video/);assert.doesNotMatch(html,/<iframe|autoPlay|Loading goal replay/);
});
