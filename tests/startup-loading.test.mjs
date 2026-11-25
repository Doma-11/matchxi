import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('qa-temp',{recursive:true});
const boot=await build({entryPoints:['app/app-startup.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {showAppStartup,finishAppStartup}=await import('data:text/javascript;base64,'+Buffer.from(boot.outputFiles[0].text).toString('base64'));
test('startup keeps the same loader node through loading and releases accessibility/interaction on completion',()=>{
 const old=globalThis.document,attrs=new Map(),screen={hidden:false},root={setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 globalThis.document={getElementById:id=>id==='root'?root:screen};
 try{showAppStartup();showAppStartup();assert.equal(screen.hidden,false);assert.equal(attrs.has('inert'),true);assert.equal(attrs.get('aria-hidden'),'true');finishAppStartup();assert.equal(screen.hidden,true);assert.equal(attrs.size,0);finishAppStartup();showAppStartup();assert.equal(screen.hidden,false);}finally{globalThis.document=old;}
});
const hookBuild={entryPoints:['app/match-centre.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'controlled-effects',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'hooks'}));
 b.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:'export const useState=(...a)=>globalThis.__loadingHooks.state(...a),useRef=(...a)=>globalThis.__loadingHooks.ref(...a),useEffect=(...a)=>globalThis.__loadingHooks.effect(...a),useId=()=>"loading-test";'}));
 b.onResolve({filter:/^\.\/foreground-polling$/},()=>({path:'poll',namespace:'poll'}));
 b.onLoad({filter:/.*/,namespace:'poll'},()=>({contents:'export function foregroundPolling(load){globalThis.__homeRequest=load;return {rearm(){},stop(){},refresh(){}}}'}));
}}]};
const built=await build(hookBuild);
await writeFile('qa-temp/startup-home.mjs',built.outputFiles[0].text);
const {MatchHome}=await import('../qa-temp/startup-home.mjs');
function mount(props,Component=MatchHome){
 let cursor=0,dirty=true;const slots=[],pending=[];
 const hooks={state(initial){const n=cursor++;if(!slots[n])slots[n]={value:typeof initial==='function'?initial():initial};return [slots[n].value,v=>{slots[n].value=typeof v==='function'?v(slots[n].value):v;dirty=true;}];},ref(value){return slots[cursor++]??(slots[cursor-1]={current:value});},effect(fn,deps){const n=cursor++,previous=slots[n];if(!previous||deps.some((d,i)=>!Object.is(d,previous.deps[i]))){slots[n]={deps,cleanup:previous?.cleanup};pending.push(()=>{previous?.cleanup?.();slots[n].cleanup=fn();});}}};
 return {setProps(next){props=next;dirty=true;},render(){let tree;for(let n=0;dirty;n++){assert.ok(n<20);dirty=false;cursor=0;globalThis.__loadingHooks=hooks;tree=Component(props);for(const job of pending.splice(0))job();}return tree;},unmount(){slots.forEach(slot=>slot?.cleanup?.());delete globalThis.__loadingHooks;delete globalThis.__homeRequest;}};
}
for(const result of ['success','empty','error','halftime'])test(`startup waits for the existing home request to settle (${result}), even with saved matches`,async()=>{
 const old={sessionStorage:globalThis.sessionStorage,window:globalThis.window,fetch:globalThis.fetch};
 const date=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const game={id:'saved',league:'eng.1',date:date+'T18:00:00Z',state:'pre',completed:false,home:{id:'a',name:'Arsenal'},away:{id:'b',name:'Chelsea'}};
 if(result==='halftime'){game.state='in';game.status='Half-time';}
 globalThis.sessionStorage={getItem:k=>k==='matchxi-match-date'?date:k==='matchxi-match-day'?JSON.stringify({date,games:[game]}):null,setItem(){}};
 globalThis.window={localStorage:{getItem(){return null},setItem(){}},dispatchEvent(){}};
 let resolve,reject,calls=0,ready=0;globalThis.fetch=()=>{calls++;return new Promise((a,b)=>{resolve=a;reject=b;});};
 const ui=mount({onMatch(){},onReady(){ready++;}});
 try{ui.render();assert.equal(ready,0);const request=globalThis.__homeRequest(new AbortController().signal);ui.render();if(result==='halftime'){await request;ui.render();assert.equal(ready,1);assert.equal(calls,0);return;}assert.equal(ready,0);assert.equal(calls,1);
  if(result==='error')reject(Error('offline'));else resolve(Response.json({games:result==='empty'?[]:[game],checkedAt:new Date().toISOString()}));
  await request;ui.render();assert.equal(ready,1);assert.equal(calls,1);
 }finally{ui.unmount();Object.assign(globalThis,old);}
});

const bracketBuilt=await build({...hookBuild,entryPoints:['app/tournament-bracket.tsx']});
await writeFile('qa-temp/standings-loading.mjs',bracketBuilt.outputFiles[0].text);
const {default:TournamentStandings}=await import('../qa-temp/standings-loading.mjs');
test('standings retains one loader until both table and bracket work finish',async()=>{
 const oldFetch=globalThis.fetch;let resolve;globalThis.fetch=()=>new Promise(r=>{resolve=r;});
 const props={game:{id:'one',league:'eng.1',date:'2026-11-25T20:00:00Z',home:{name:'Arsenal'},away:{name:'Chelsea'}},pending:true,children:'table-ready'};
 const ui=mount(props,TournamentStandings);
 try{assert.equal(ui.render().props.label,'Loading standings');resolve(Response.json({rounds:[]}));await new Promise(r=>setImmediate(r));assert.equal(ui.render().props.label,'Loading standings');ui.setProps({...props,pending:false});assert.equal(ui.render().props.children,'table-ready');}
 finally{ui.unmount();globalThis.fetch=oldFetch;}
});
