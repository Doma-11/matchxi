import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const built=await build({entryPoints:['app/goal-replays.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {goalReplaysEnabled,setGoalReplaysEnabled,redditSoccerPost,redditReplayDocument,WIRTZ_TEST_REPLAY,GOAL_REPLAYS_KEY}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('preview defaults off and can be disabled without a request or stored video',()=>{
 const old=globalThis.window,values=new Map(),events=[];
 globalThis.window={localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},dispatchEvent:event=>events.push(event.detail)};
 try{assert.equal(goalReplaysEnabled(),false);setGoalReplaysEnabled(true);assert.equal(goalReplaysEnabled(),true);setGoalReplaysEnabled(false);assert.equal(goalReplaysEnabled(),false);assert.deepEqual([...values],[[GOAL_REPLAYS_KEY,'off']]);assert.deepEqual(events,[true,false]);}finally{globalThis.window=old;}
});
test('only canonical HTTPS soccer post URLs are accepted; credentials, other hosts and arbitrary HTML are rejected',()=>{
 assert.equal(redditSoccerPost(WIRTZ_TEST_REPLAY.postUrl),WIRTZ_TEST_REPLAY.postUrl);
 for(const raw of ['javascript:alert(1)','https://reddit.com.evil.test/r/soccer/comments/abc/goal/','https://evil.test','https://reddit.com:444/r/soccer/comments/abc/goal/','https://user@reddit.com/r/soccer/comments/abc/goal/','http://reddit.com/r/soccer/comments/abc/goal/','https://reddit.com/r/other/comments/abc/goal/','https://reddit.com/r/soccer/comments/abc/goal/extra/'])assert.equal(redditSoccerPost(raw),null,raw);
 assert.equal(redditReplayDocument({...WIRTZ_TEST_REPLAY,postUrl:'https://evil.test'}),null);
});
test('official Reddit embed preserves source attribution and escapes metadata without extracting footage',()=>{
 const doc=redditReplayDocument({...WIRTZ_TEST_REPLAY,scorer:'</script><img src=x onerror=alert(1)>'});
 assert.match(doc,/https:\/\/embed\.reddit\.com\/widgets\.js/);assert.match(doc,/reddit-embed-bq/);assert.match(doc,/https:\/\/www.reddit.com\/r\/soccer\//);assert.match(doc,/&lt;\/script&gt;/);assert.doesNotMatch(doc,/<img src=x/);assert.doesNotMatch(doc,/<video|\.mp4|streamin\.me\/v\/|fetch\(/);
});
