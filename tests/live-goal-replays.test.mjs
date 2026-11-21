import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
await mkdir('qa-temp',{recursive:true});
async function load(path,name){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',packages:'external',write:false,loader:{'.css':'empty'}});await writeFile(`qa-temp/${name}.mjs`,b.outputFiles[0].text);return import(`../qa-temp/${name}.mjs`);}
const {goalFromPost,mirrorSources,mergeReplaySources,replaySource}=await load('app/replay-discovery.ts','live-replay-matching');
const {createReplayDiscovery,GET}=await load('app/api/match-replays/route.ts','live-replay-api');
const match={id:'replay-1',home:'Arsenal',away:'Chelsea',league:'eng.1',date:new Date().toISOString()};
const post={id:'goal001',title:'Arsenal [2] - 0 Chelsea - Bukayo Saka 60\'',url:'https://streamin.link/v/abcdef12',created_utc:Date.parse(match.date)/1000+60};
const comment=(body,replies=[],extra={})=>({kind:'t1',data:{body,author:'mirror-poster',replies:{data:{children:replies}},...extra}});
const comments=[{}, {data:{children:[comment('unrelated https://streamable.com/wrong'),comment('Mirrors / Alternative Angles',[comment('[Mirror](https://streamable.com/right1)',[comment('https://streamable.com/right2')]),comment('https://evil.example/video'),comment('[deleted]')],{author:'AutoModerator',stickied:true})]}}];
test('match goals use both team identities and fixture time; unsupported original hosts still qualify for mirror discovery',()=>{
 const goal=goalFromPost(post,match);assert.equal(goal.team,'Arsenal');assert.equal(goal.score,'2–0');assert.equal(goal.testOnly,false);assert.equal(goal.sources[0].provider,'Streamin');
 assert.equal(goalFromPost({...post,title:post.title.replace('Chelsea','Liverpool')},match),null);assert.equal(goalFromPost({...post,created_utc:post.created_utc-86400},match),null);assert.equal(goalFromPost({...post,removed_by_category:'copyright'},match),null);
 assert.equal(goalFromPost({...post,url:'https://unknown.example/clip'},match).sources.length,0);assert.equal(goalFromPost({...post,title:'Arsenal [0] - 0 Chelsea - Saka 60\''},match),null);
 assert.equal(goalFromPost({...post,title:'Arsenal 2 - 0 Chelsea - Saka 60\''},match).team,'');
});
test('only bounded mirror-thread replies contribute allowlisted URLs, and an embeddable mirror ranks ahead of original',()=>{
 const mirrors=mirrorSources(comments);assert.deepEqual(mirrors.map(x=>x.url),['https://streamable.com/right1','https://streamable.com/right2']);const result=mergeReplaySources(goalFromPost(post,match),mirrors);assert.equal(result.videoUrl,'https://streamable.com/right1');assert.equal(result.sources.length,3);
 for(const u of ['javascript:alert(1)','http://streamable.com/ab','https://streamable.com.evil/ab','https://u:p@streamable.com/ab','https://streamable.com:444/ab','https://streamable.com/file.mp4','https://streamin.me/v/../../evil'])assert.equal(replaySource(u),null,u);
});
test('unconfigured Reddit access makes zero upstream requests and invalid live parameters fail before discovery',async()=>{
 let calls=0;const discover=createReplayDiscovery({env:()=>undefined,fetcher:async()=>{calls++;throw Error('No access');}});const data=await discover(match);assert.equal(data.code,'REDDIT_NOT_CONFIGURED');assert.equal(calls,0);assert.equal((await GET(new Request('https://app.test/api/match-replays?home=Arsenal'))).status,400);
});
const config={MATCHXI_REDDIT_ENABLED:'true',MATCHXI_REDDIT_USER_AGENT:'test:matchxi:v1 (by /u/test)',MATCHXI_REDDIT_ACCESS_TOKEN:'mock-registered-token'};
test('explicit lookup makes one OAuth search plus matching-post comments, reuses brief cache and never requests hosts or scores',async()=>{
 const calls=[];const discover=createReplayDiscovery({env:key=>config[key],fetcher:async(url,init)=>{calls.push(url);assert.equal(init.headers.Authorization,'Bearer mock-registered-token');return Response.json(url.includes('/search?')?{data:{children:[{data:post}]}}:comments);}});
 const m={...match,id:'replay-cache'};const data=await discover(m);assert.equal(data.replays.length,1);assert.equal(data.replays[0].videoUrl,'https://streamable.com/right1');assert.equal(calls.length,2);assert.ok(calls.every(x=>x.startsWith('https://oauth.reddit.com/r/soccer/')));assert.equal((await discover(m)).cached,true);assert.equal(calls.length,2);
});
test('403 stops immediately without public JSON, alternate domains or retries',async()=>{
 let calls=0;const discover=createReplayDiscovery({env:key=>config[key],fetcher:async()=>{calls++;return new Response('',{status:403});}});const result=await discover({...match,id:'denied'});assert.equal(result.code,'REDDIT_ACCESS_DENIED');assert.equal(calls,1);
});
const {LiveGoalReplays}=await load('app/live-goal-replays.tsx','live-replay-render');
test('live panel starts with no historical clips, no autoplaying players and no requests until Find',()=>{
 const html=renderToStaticMarkup(React.createElement(LiveGoalReplays,{game:{...match,home:{name:'Arsenal'},away:{name:'Chelsea'}},selected:null,onSelect(){}}));assert.match(html,/Find Replays/);assert.match(html,/Arsenal vs Chelsea/);assert.match(html,/Have a video mirror link/);assert.doesNotMatch(html,/Wirtz|Griezmann|<iframe|<video|streamin.me/);
});
test('refresh credentials obtain an OAuth token only during Find and are never returned in metadata',async()=>{
 const secrets={...config,MATCHXI_REDDIT_ACCESS_TOKEN:undefined,MATCHXI_REDDIT_CLIENT_ID:'mock-client',MATCHXI_REDDIT_CLIENT_SECRET:'mock-secret',MATCHXI_REDDIT_REFRESH_TOKEN:'mock-refresh'};const calls=[];
 const discover=createReplayDiscovery({env:key=>secrets[key],fetcher:async(url,init)=>{calls.push(url);if(url.includes('/access_token')){assert.equal(init.method,'POST');assert.equal(init.body.get('grant_type'),'refresh_token');return Response.json({access_token:'mock-new-token',expires_in:3600});}assert.equal(init.headers.Authorization,'Bearer mock-new-token');return Response.json({data:{children:[]}});}});
 assert.equal(calls.length,0);const data=await discover({...match,id:'refresh-auth'});assert.deepEqual(data.replays,[]);assert.equal(calls.length,2);assert.doesNotMatch(JSON.stringify(data),/mock-(?:client|secret|refresh|new-token)/);
});
test('Reddit 429 creates a shared cooldown and causes no retry or anonymous fallback',async()=>{
 let calls=0;const discover=createReplayDiscovery({env:key=>config[key],fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'60'}});}});
 assert.equal((await discover({...match,id:'rate-limit1'})).code,'REDDIT_RATE_LIMITED');assert.equal((await discover({...match,id:'rate-limit2'})).code,'REDDIT_RATE_LIMITED');assert.equal(calls,1);
});
