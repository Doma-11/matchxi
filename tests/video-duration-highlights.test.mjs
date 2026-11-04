import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
async function load(path){const r=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const duration=await load('app/video-duration.ts'),{parsePage,mergeHighlights}=await load('app/highlights-data.ts');
await mkdir('qa-temp',{recursive:true});const compiled=await build({entryPoints:['app/match-highlight-list.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'},jsx:'automatic'});await writeFile('qa-temp/highlight-list-render.mjs',compiled.outputFiles[0].text);const {default:List}=await import('../qa-temp/highlight-list-render.mjs');
test('durations accept source seconds, clocks and ISO values without guessing from LIVE or dates',()=>{
 for(const [input,seconds,label] of [[563,563,'9:23'],['9:23',563,'9:23'],['1:02:03',3723,'1:02:03'],['PT1H2M3S',3723,'1:02:03'],['563',563,'9:23']]){assert.equal(duration.parseVideoDuration(input),seconds);assert.equal(duration.formatVideoDuration(seconds),label);}
 for(const input of ['LIVE','3 days ago','2026-11-04','0:00','1:80:32',null,NaN,'Home 2:1 Away'])assert.equal(duration.parseVideoDuration(input),null);
});
test('existing YouTube discovery payloads yield duration for renderer and lockup cards; title numbers do not count',()=>{
 const source={name:'Official club',id:'channel',league:'archive.media',url:'https://www.youtube.com/@official'},at='2026-11-04T12:00:00Z';
 const data={contents:[{videoRenderer:{videoId:'abcdefghijk',title:{simpleText:'Home vs Away highlights'},publishedTimeText:{simpleText:'1 day ago'},lengthText:{simpleText:'9:23'}}},{lockupViewModel:{contentId:'12345678901',metadata:{lockupMetadataViewModel:{title:{content:'Home vs Away highlights'},metadata:{contentMetadataViewModel:{metadataRows:[{metadataParts:[{text:{content:'1 day ago'}}]}]}}}},contentImage:{thumbnailViewModel:{overlays:[{thumbnailOverlayBadgeViewModel:{thumbnailBadges:[{thumbnailBadgeViewModel:{text:'5:34'}}]}}]}}}},{videoRenderer:{videoId:'zyxwvutsrqp',title:{simpleText:'4:02 highlights | Home vs Away'},publishedTimeText:{simpleText:'1 day ago'}}}]};
 const result=parsePage('<script>var ytInitialData = '+JSON.stringify(data)+';</script>',source,at);assert.equal(result.length,3);assert.equal(result[0].durationSeconds,563);assert.equal(result[1].durationSeconds,334);assert.equal(result[2].durationSeconds,undefined);
 const merged=mergeHighlights([result[0]],[{...result[0],durationSeconds:undefined,publishedAt:at}]);assert.equal(merged[0].durationSeconds,563);
});
test('actual player duration is saved locally and publishes one update per changed value, without requests',()=>{
 const old={localStorage:globalThis.localStorage,window:globalThis.window};const records=new Map(),events=[];globalThis.localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};globalThis.window={dispatchEvent:e=>events.push(e)};
 try{duration.rememberVideoDuration('abcdefghijk',563.9);duration.rememberVideoDuration('abcdefghijk',563);assert.equal(duration.cachedVideoDuration('abcdefghijk'),563);assert.equal(events.length,1);assert.equal(events[0].detail.id,'abcdefghijk');duration.rememberVideoDuration('abcdefghijk',0);assert.equal(events.length,1);}finally{Object.assign(globalThis,old);}
});
test('completed-match highlights render one horizontal row per video, readable durations and an external-only restricted card',()=>{
 const base={id:'abcdefghijk',title:'Home vs Away extended official match highlights with a deliberately long descriptive title',publisher:'Official club',thumbnail:'/thumbnail.jpg',url:'https://www.youtube.com/watch?v=abcdefghijk',durationSeconds:563};
 const html=renderToStaticMarkup(React.createElement(List,{game:{league:'uefa.europa'},videos:[base,{...base,id:'12345678901',embedAllowed:false,durationSeconds:undefined}],onPlay(){}}));
 assert.equal((html.match(/role="listitem"/g)||[]).length,2);assert.match(html,/9:23/);assert.match(html,/Duration unavailable/);assert.match(html,/--highlight-accent:#ff6900/);assert.equal((html.match(/<button /g)||[]).length,1);assert.match(html,/Watch on YouTube:/);assert.doesNotMatch(html,/video-grid/);
});
