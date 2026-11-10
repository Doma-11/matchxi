import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
async function load(file){const c=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'))}
const {screenKey,navigationEntry,matchReturnEntry,instantScroll,startMatchBack,resolvedHistoryState,isAppHistoryEntry,canNavigateBack}=await load('app/navigation-history.ts');
const {normalizeMatchFilter,matchesStatusFilter}=await load('app/match-list-filter.ts');
const source={page:'home',league:'eng.1',selectedGame:null,selected:null};
const match={...source,selectedGame:{league:'eng.1',id:'10'}};
test('opening a match saves the source page/scroll and gives the new match a zero scroll position',()=>{
 const result=navigationEntry({touchline:true,screen:source,scrollY:1800,depth:0},match,1800);
 assert.equal(result.push,true);assert.equal(result.entry.depth,1);assert.equal(result.entry.scrollY,0);
 assert.deepEqual(result.entry.matchReturn,{screen:source,scrollY:1800});
 assert.deepEqual(matchReturnEntry(result.entry,match),{matchxi:true,screen:source,scrollY:1800,depth:0});
});
test('background object/score changes cannot add another history entry for the same match',()=>{
 const initial=navigationEntry({screen:source,scrollY:600,depth:0},match,600).entry;
 const refreshed={...match,club:{id:'changed-background'},nation:{id:'new-object'},selectedGame:{...match.selectedGame,home:{score:2}}};
 assert.equal(screenKey(match),screenKey(refreshed));
 const result=navigationEntry(initial,refreshed,80);assert.equal(result.push,false);assert.equal(result.entry.depth,1);assert.deepEqual(result.entry.matchReturn,initial.matchReturn);
 assert.notEqual(screenKey(match),screenKey({...match,selectedGame:{league:'esp.1',id:'10'}}));
});
test('legacy match history without a return snapshot still has an in-app non-match fallback',()=>{
 const result=matchReturnEntry({depth:3},match);assert.equal(result.screen.page,'home');assert.equal(result.screen.selectedGame,null);assert.equal(result.depth,2);
});
test('back requests are debounced and a missing browser event restores the original list',()=>{
 const state=navigationEntry({screen:source,scrollY:950,depth:0},match,950).entry;
 let calls=0,callback,restored;const target={current:null},timer={current:null};
 const history={state,length:2,back(){calls++},replaceState(s){this.state=s}};
 const schedule=(fn,ms)=>{assert.equal(ms,300);callback=fn;return 1};
 startMatchBack(history,match,target,timer,s=>restored=s,schedule);
 startMatchBack(history,match,target,timer,s=>restored=s,schedule);
 assert.equal(calls,1);assert.equal(restored,undefined);
 callback();assert.equal(history.state.screen.selectedGame,null);assert.equal(restored.scrollY,950);assert.equal(target.current,null);
});
test('a match restored as the only browser entry never navigates out of the app',()=>{
 const history={state:{touchline:true,screen:match,depth:2},length:1,back(){throw Error('Would leave app')},replaceState(s){this.state=s}};
 let restored;startMatchBack(history,match,{current:null},{current:null},s=>restored=s);
 assert.equal(restored.screen.selectedGame,null);assert.equal(history.state.screen.page,'home');
});
test('instant scrolling overrides global smooth behaviour and restores the prior style',()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 let value='smooth',priority='',observed;const style={getPropertyValue:()=>value,getPropertyPriority:()=>priority,setProperty:(k,v,p)=>{value=v;priority=p||''},removeProperty:()=>{value='';priority=''}};
 globalThis.document={documentElement:{style}};globalThis.window={scrollTo(options){observed={...options,style:value,priority}}};
 try{instantScroll(0);assert.deepEqual(observed,{top:0,behavior:'auto',style:'auto',priority:'important'});assert.equal(value,'smooth');assert.equal(priority,'')}finally{globalThis.window=oldWindow;globalThis.document=oldDocument}
});
test('Upcoming includes only unstarted, non-cancelled fixtures; All retains finished games',()=>{
 const pre={state:'pre',status:'Scheduled'},live={state:'in'},finished={state:'post',completed:true};
 assert.equal(matchesStatusFilter(pre,'upcoming'),true);assert.equal(matchesStatusFilter(live,'upcoming'),false);assert.equal(matchesStatusFilter(finished,'upcoming'),false);
 for(const status of ['Cancelled','Postponed','Abandoned'])assert.equal(matchesStatusFilter({...pre,status},'upcoming'),false);
 assert.equal(matchesStatusFilter(finished,'all'),true);assert.equal(matchesStatusFilter(live,'live'),true);
 assert.equal(normalizeMatchFilter('finished'),'upcoming');assert.equal(normalizeMatchFilter('unexpected'),'all');
});

test('unusable or duplicate-match popstate still resolves to the requested source screen',()=>{const target=matchReturnEntry(navigationEntry({screen:source,scrollY:1200,depth:0},match,1200).entry,match);assert.equal(resolvedHistoryState(null,target),target);assert.equal(resolvedHistoryState({touchline:true,screen:match},target),target);assert.equal(resolvedHistoryState(target,target),target);assert.equal(resolvedHistoryState(null,null),null)});

test('club, match and legacy entries are recognized by the same Back guard',()=>{
 const root={matchxi:true,screen:source,depth:0,scrollY:55};
 const club={...source,page:'club',club:{id:'club-1'}};
 const clubEntry=navigationEntry(root,club,55).entry;
 const matchEntry=navigationEntry(clubEntry,{...club,selectedGame:match.selectedGame},200).entry;
 assert.equal(canNavigateBack(clubEntry,2),true);
 assert.equal(canNavigateBack(matchEntry,3),true);
 assert.equal(canNavigateBack({...clubEntry,matchxi:undefined,touchline:true},2),true);
 assert.equal(canNavigateBack(clubEntry,1),false);
 assert.equal(canNavigateBack(root,3),false);
 assert.equal(isAppHistoryEntry({depth:5,screen:club}),false);
 assert.strictEqual(resolvedHistoryState(clubEntry,matchReturnEntry(matchEntry,match)),clubEntry);
});
