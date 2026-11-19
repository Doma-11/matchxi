import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const built=await build({entryPoints:['app/goal-replays.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {goalReplaysEnabled,setGoalReplaysEnabled,supportedReplayEmbed,manualReplayTest,WIRTZ_TEST_REPLAY,GOAL_REPLAYS_KEY}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('preview defaults off and can be disabled without a request or stored video',()=>{
 const old=globalThis.window,values=new Map(),events=[];
 globalThis.window={localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},dispatchEvent:event=>events.push(event.detail)};
 try{assert.equal(goalReplaysEnabled(),false);setGoalReplaysEnabled(true);assert.equal(goalReplaysEnabled(),true);setGoalReplaysEnabled(false);assert.equal(goalReplaysEnabled(),false);assert.deepEqual([...values],[[GOAL_REPLAYS_KEY,'off']]);assert.deepEqual(events,[true,false]);}finally{globalThis.window=old;}
});
test('only documented Streamable player paths are accepted and unrelated query parameters are discarded',()=>{
 assert.equal(supportedReplayEmbed('https://streamable.com/5rneah').url,'https://streamable.com/e/5rneah?autoplay=0&loop=0');
 assert.equal(supportedReplayEmbed('https://www.streamable.com/e/5rneah/?autoplay=1&nocontrols=1&redirect=https://evil.test').url,'https://streamable.com/e/5rneah?autoplay=0&loop=0');
 for(const raw of [WIRTZ_TEST_REPLAY.videoUrl,WIRTZ_TEST_REPLAY.postUrl,'javascript:alert(1)','https://streamable.com.evil.test/5rneah','https://streamable.com:444/5rneah','https://user@streamable.com/5rneah','http://streamable.com/5rneah','https://streamable.com/e/abc/extra','https://streamable.com/videos/file.mp4','https://evil.test/e/abc'])assert.equal(supportedReplayEmbed(raw),null,raw);
});
test('manual test never assigns an unknown video to the Wirtz goal or changes the supplied clip',()=>{
 const test=manualReplayTest('https://streamable.com/5rneah');assert.equal(test.kind,'player-test');assert.equal(test.scorer,'Manual video test');assert.equal(test.team,'Streamable');assert.equal(test.minute,'');assert.equal(test.score,'');assert.equal(test.postUrl,'');assert.equal(manualReplayTest(WIRTZ_TEST_REPLAY.videoUrl),null);assert.equal(WIRTZ_TEST_REPLAY.scorer,'Florian Wirtz');
});
const uiBuilt=await build({entryPoints:['app/goal-replays-panel.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'}});
const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('qa-temp',{recursive:true});await writeFile('qa-temp/goal-replays-render.mjs',uiBuilt.outputFiles[0].text);
const {GoalReplayPlayer,GoalReplayList}=await import('../qa-temp/goal-replays-render.mjs');const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
test('supported replay renders only the provider video player; no Reddit post, widgets or extracted footage',()=>{
 const html=renderToStaticMarkup(React.createElement(GoalReplayPlayer,{replay:manualReplayTest('https://streamable.com/5rneah'),onClose(){}}));
 assert.match(html,/streamable.com\/e\/5rneah/);assert.match(html,/PLAYER TEST/);assert.doesNotMatch(html,/reddit|srcDoc|widgets.js|<video|\.mp4/);assert.doesNotMatch(html,/Playing/);
});
test('unsupported clip renders external fallback without a player iframe or false success label',()=>{
 const html=renderToStaticMarkup(React.createElement(GoalReplayPlayer,{replay:WIRTZ_TEST_REPLAY,onClose(){}}));
 assert.doesNotMatch(html,/<iframe|reddit|Playing/);assert.match(html,/In-app playback is unavailable/);assert.match(html,/streamin.me\/v\/cfb904d3/);
 const list=renderToStaticMarkup(React.createElement(GoalReplayList,{selected:null,onSelect(){}}));assert.doesNotMatch(list,/<iframe|widgets.js/);
});
