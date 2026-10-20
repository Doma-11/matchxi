import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
async function load(file){const c=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'))}
const {sharedClockText,sharedMinuteClockText}=await load('app/match-clock.ts');const {swipeDirection,attachSwipeNavigation}=await load('app/swipe-navigation.ts');
const now=Date.parse('2026-10-20T18:00Z');
test('returning after an unseen halftime/full-time never flashes thirty minutes of stoppage',()=>{
 for(const [period,clock,final] of [[1,'45+2′',{state:'in',status:'HT',period:1}],[2,'90+2′',{state:'post',status:'FT',completed:true,period:2}]]){
  const game={id:'resume-'+period,league:'eng.1',state:'in',period,clock,status:clock,clockCheckedAt:new Date(now).toISOString()};assert.match(sharedClockText(game,now),/2:00/);
  const resume=now+30*60000;assert.equal(sharedClockText(game,resume),'Updating…');assert.equal(sharedMinuteClockText(game,resume),'…');
  assert.equal(sharedClockText({...game,...final,clock:final.status,clockCheckedAt:new Date(resume).toISOString()},resume),final.status);
 }
});
test('fresh same-half data restores the uninterrupted anchor; known finals outrank an old live clock',()=>{
 const g={id:'still-playing',league:'eng.1',state:'in',period:1,clock:'20:17',clockCheckedAt:new Date(now).toISOString()};assert.equal(sharedClockText(g,now),'20:17');assert.equal(sharedClockText(g,now+120000),'Updating…');assert.equal(sharedClockText({...g,clock:'23′',clockCheckedAt:new Date(now+120000).toISOString()},now+120000),'22:17');assert.equal(sharedClockText({...g,state:'post',completed:true,status:'FT',clockFresh:false},now+130000),'FT');
});
test('swipes reject browser edges, vertical movement, taps and long presses',()=>{const a={x:160,y:300,at:1000};assert.equal(swipeDirection(a,{x:270,y:310,at:1300},390),'back');assert.equal(swipeDirection(a,{x:50,y:305,at:1300},390),'forward');for(const [start,end] of [[{...a,x:10},{x:180,y:300,at:1300}],[a,{x:170,y:300,at:1300}],[a,{x:270,y:460,at:1300}],[a,{x:280,y:300,at:2000}]])assert.equal(swipeDirection(start,end,390),null);});
test('gesture listener navigates once and cleans up; controls and horizontal rails are excluded',()=>{
 const old=globalThis.Element;class El{constructor(control=null,scroll=false){this.control=control;this.scrollWidth=scroll?500:200;this.clientWidth=200;this.parentElement=null;this.scroll=scroll;}closest(){return this.control;}matches(){return false;}}globalThis.Element=El;
 const handlers=new Map(),host={addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n),querySelector:()=>null},view={innerWidth:390,getSelection:()=>null,getComputedStyle:el=>({overflowX:el.scroll?'auto':'visible'})};let back=0,forward=0;const oldNow=Date.now;let at=1000;Date.now=()=>at;
 try{const stop=attachSwipeNavigation({host,view,back:()=>back++,forward:()=>forward++,canBack:()=>true,canForward:()=>true});const swipe=target=>{at=1000;handlers.get('touchstart')({target,touches:[{clientX:150,clientY:300}]});at=1300;handlers.get('touchend')({touches:[],changedTouches:[{clientX:270,clientY:310}],cancelable:true,preventDefault(){}});};swipe(new El());assert.equal(back,1);at=1000;handlers.get('touchstart')({target:new El(),touches:[{clientX:260,clientY:300}]});at=1300;handlers.get('touchend')({touches:[],changedTouches:[{clientX:140,clientY:300}],cancelable:true,preventDefault(){}});assert.equal(forward,1);swipe(new El(new El()));swipe(new El(null,true));assert.equal(back,1);assert.equal(forward,1);stop();assert.equal(handlers.size,0);}finally{Date.now=oldNow;globalThis.Element=old;}
});
