import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
async function load(file){const c=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'))}
const {reconcileClock,clockSeconds,localClockText,observeMatchClock,sharedClockText}=await load('app/match-clock.ts');const {scorePollInterval,homePollInterval,scorePollingAllowed,startDetection}=await load('app/score-refresh.ts');const {foregroundPolling}=await load('app/foreground-polling.ts');const {fotmobHalfStart}=await load('app/hnl-live.ts');
const now=Date.parse('2026-10-11T14:00:00Z'),g={state:'in',period:1,status:'11′',clockCheckedAt:new Date(now).toISOString()};
test('local elapsed clock progresses without polling, ignores subsequent minute observations without jumping or resetting seconds',()=>{let a=reconcileClock(null,g,now);assert.equal(localClockText(a,g,now+25000),'11:25');const fresh={...g,status:'12′',clockCheckedAt:new Date(now+40000).toISOString()};a=reconcileClock(a,fresh,now+40000);assert.equal(localClockText(a,fresh,now+40000),'11:40');const repeated={...fresh,clockCheckedAt:new Date(now+80000).toISOString()};a=reconcileClock(a,repeated,now+80000);assert.equal(clockSeconds(a,now+80000),740);});
test('neither stale nor fresh observations correct a running half',()=>{const exact={...g,clock:'11:25'};let a=reconcileClock(null,exact,now);assert.equal(clockSeconds(reconcileClock(a,{...exact,clock:'10:00'},now+40000),now+40000),725);const correction={...exact,clock:'12:15',clockCheckedAt:new Date(now+40000).toISOString()};assert.equal(clockSeconds(reconcileClock(a,correction,now+40000),now+40000),725);const stale={...correction,clock:'30:00',clockCheckedAt:new Date(now-120000).toISOString()};assert.equal(clockSeconds(reconcileClock(a,stale,now+40000),now+40000),725)});
test('45/90 do not end halves, confirmed HT freezes and second half gets a new anchor',()=>{let a=reconcileClock(null,{...g,status:'45+2′'},now);assert.equal(localClockText(a,{...g,status:'45+2′'},now+30000),'45+2:30');a=reconcileClock(a,{...g,status:'HT'},now+40000);assert.equal(a.running,false);assert.equal(clockSeconds(a,now+500000),2860);const second={...g,period:2,status:'46′',clockCheckedAt:new Date(now+900000).toISOString()};a=reconcileClock(a,second,now+900000);assert.equal(localClockText(a,second,now+915000),'45:15');assert.equal(reconcileClock(a,{...second,completed:true},now+920000).running,false)});
test('timestamp anchor is actual half start, never scheduled kickoff; Zagreb summer/winter offset works',()=>{assert.equal(fotmobHalfStart('11.10.2026 16:00:00'),'2026-10-11T14:00:00.000Z');assert.equal(fotmobHalfStart('11.12.2026 16:00:00'),'2026-12-11T15:00:00.000Z');const live={...g,halfStartedAt:new Date(now-600000).toISOString(),date:new Date(now-900000).toISOString()};assert.equal(localClockText(reconcileClock(null,live,now),live,now+12000),'10:12')});
test('phase intervals are 40 seconds playing, 15 minute HT pause / 2 minute waiting; finished/historical/empty lists stop',()=>{assert.equal(scorePollInterval(g,now),40000);assert.equal(scorePollInterval({...g,status:'HT'},now),900000);assert.equal(scorePollInterval({...g,completed:true},now),null);assert.equal(scorePollInterval({state:'pre',date:new Date(now+3600000).toISOString()},now),2700000);assert.equal(homePollInterval([g],true,now),40000);assert.equal(homePollInterval([g],false,now),null);assert.equal(homePollInterval([],true,now),null)});
test('foreground requests cannot overlap; hiding aborts and leaving removes timers/listeners',async()=>{const old=globalThis.document;const listeners=new Map();globalThis.document={visibilityState:'visible',addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:(k,f)=>{if(listeners.get(k)===f)listeners.delete(k)}};let calls=0,active=0,max=0,aborts=0;const polling=foregroundPolling(signal=>new Promise(resolve=>{calls++;active++;max=Math.max(max,active);signal.addEventListener('abort',()=>{aborts++;active--;resolve()},{once:true})}),()=>10);try{await polling.refresh();}finally{} // refresh queues rather than opening another request.
 await new Promise(r=>setTimeout(r,15));assert.equal(calls,1);assert.equal(max,1);document.visibilityState='hidden';listeners.get('visibilitychange')();await new Promise(r=>setTimeout(r,15));assert.equal(aborts,1);assert.equal(calls,1);document.visibilityState='visible';listeners.get('visibilitychange')();await new Promise(r=>setTimeout(r,5));assert.equal(calls,2);polling.stop();await new Promise(r=>setTimeout(r,15));assert.equal(listeners.size,0);assert.equal(calls,2);globalThis.document=old;
});
const {fotmobEvents,fotmobLineupUpdates}=await load('app/fotmob-events.ts');
test('FotMob events retain stable IDs, stoppage times, substitutions and non-goal shootouts',()=>{const game={home:{id:'1'},away:{id:'2'}},page={content:{matchFacts:{events:{events:[{eventId:7,type:'Goal',timeStr:'45 + 2',isHome:true,player:{name:'Scorer'}},{reactKey:'sub8',type:'Substitution',time:60,isHome:false,swap:[{name:'In'},{name:'Out'}]},{type:'Goal',time:120,isHome:true,isPenaltyShootoutEvent:true}]}},lineup:{lineupType:'standard',homeTeam:{formation:'4-5-1',starters:[{id:8,name:'Goalie',usualPlayingPositionId:0,shirtNumber:1}],subs:[]}}}};const events=fotmobEvents(page,game);assert.equal(events[0].id,'7');assert.equal(events[0].minute,'45 + 2′');assert.equal(events[0].scoring,true);assert.equal(events[1].text,'In → Out');assert.equal(events[1].teamId,'2');assert.equal(events[2].scoring,false);assert.equal(fotmobLineupUpdates(page,game)[0].players[0].position,'G')});

test('15-minute halftime pause, ten-second detection capped at five minutes, then normal polling',()=>{
 const ht={...g,league:'eng.1',id:'ht-policy-test',status:'HT'};
 assert.equal(scorePollInterval(ht,now),900000);
 assert.equal(scorePollInterval(ht,now+60000),840000);
 assert.equal(scorePollingAllowed(ht,now+14*60000),false);
 assert.equal(scorePollInterval(ht,now+15*60000),10000);
 assert.equal(startDetection(ht,now+15*60000),'second-half');
 assert.equal(scorePollingAllowed(ht,now+15*60000),true);
 assert.equal(scorePollInterval(ht,now+19*60000),10000);
 assert.equal(scorePollInterval(ht,now+20*60000),40000);
 assert.equal(startDetection(ht,now+20*60000),null);
 assert.equal(scorePollInterval({...ht,status:'46′',period:2},now+18*60000),40000);
 assert.equal(scorePollInterval({...ht,completed:true},now+19*60000),null);
});
test('kickoff detection begins one minute before scheduled time, six-second checks are capped',()=>{
 const pre={id:'kickoff',league:'eng.1',state:'pre',date:new Date(now).toISOString()};
 assert.equal(scorePollInterval(pre,now-90000),30000);
 assert.equal(startDetection(pre,now-60000),'kickoff');
 assert.equal(scorePollInterval(pre,now-60000),6000);
 assert.equal(scorePollInterval(pre,now+239000),6000);
 assert.equal(scorePollInterval(pre,now+240000),40000);
 assert.equal(startDetection(pre,now+240000),null);
 assert.equal(scorePollInterval({...pre,state:'in',status:'1′'},now),40000);
});
test('a detected start anchors at zero, shared Home/match clocks do not diverge on newer minutes',()=>{
 const pre={...g,id:'shared-navigation',league:'eng.1',state:'pre',status:'Scheduled'};
 observeMatchClock(pre,now);
 const live={...pre,state:'in',status:'1′',period:1,clockCheckedAt:new Date(now+6000).toISOString()};
 assert.equal(sharedClockText(live,now+6000),'0:00');
 assert.equal(sharedClockText(live,now+21000),'0:15');
 const later={...live,status:'2′',clockCheckedAt:new Date(now+46000).toISOString()};
 assert.equal(sharedClockText(later,now+46000),'0:40');
 // The list still holding the earlier response sees the exact same clock.
 assert.equal(sharedClockText(live,now+46000),'0:40');
});
test('08:47 is never turned into 09:47 by a whole-minute response',()=>{
 const live={...g,id:'no-minute-jump',league:'eng.1',status:'8:47'};
 assert.equal(sharedClockText(live,now),'8:47');
 const response={...live,status:'9′',clockCheckedAt:new Date(now+10000).toISOString()};
 assert.equal(sharedClockText(response,now+10000),'8:57');
 assert.equal(sharedClockText(response,now+20000),'9:07');
});
test('mid-match entry waits for phase confirmation after a stale foreground gap without resetting the anchor',()=>{
 const live={...g,id:'join-midway',league:'eng.1',status:'23′'};
 assert.equal(sharedClockText(live,now),'23:00');
 assert.equal(sharedClockText(live,now+120000),'Updating…');
 const stale={...live,status:'HT',clockCheckedAt:new Date(now-10000).toISOString()};
 assert.equal(sharedClockText(stale,now+120000),'Updating…');
 const fresh={...live,status:'25′',clockCheckedAt:new Date(now+120000).toISOString()};
 assert.equal(sharedClockText(fresh,now+120000),'25:00');
});
test('confirmed HT and second-half start change shared phases; 45 minutes alone does not',()=>{
 const live={...g,id:'shared-halves',league:'eng.1',status:'44′',period:1};
 observeMatchClock(live,now);
 const stillPlaying={...live,status:'45+2′',clockCheckedAt:new Date(now+180000).toISOString()};
 assert.equal(sharedClockText(stillPlaying,now+180000),'45+2:00');
 const ht={...live,status:'HT',clockCheckedAt:new Date(now+180000).toISOString()};
 assert.equal(sharedClockText(ht,now+180000),'HT');
 const second={...ht,status:'46′',period:2,clockCheckedAt:new Date(now+1080000).toISOString()};
 assert.equal(sharedClockText(second,now+1080000),'45:00');
 assert.equal(sharedClockText(second,now+1110000),'45:30');
 const ft={...second,state:'post',completed:true,status:'Full time',clockCheckedAt:new Date(now+4000000).toISOString()};
 assert.equal(sharedClockText(ft,now+4000000),'Full time');
});
const {liveResponseLifetime}=await load('app/live-response-cache.ts');
test('short cache is confined to rapid phase detection, ordinary and final cache remain unchanged',()=>{
 const pre={state:'pre',date:new Date(now).toISOString()};
 assert.equal(liveResponseLifetime(pre,new URL('https://example.test/api/match-live?detection=kickoff'),now),5);
 assert.equal(liveResponseLifetime({...g,status:'HT'},new URL('https://example.test/api/match-live?detection=second-half'),now),8);
 assert.equal(liveResponseLifetime(g,new URL('https://example.test/api/match-live?detection=kickoff'),now),30);
 assert.equal(liveResponseLifetime(pre,new URL('https://example.test/api/match-live?detection=kickoff'),now+300000),30);
 assert.equal(liveResponseLifetime({...g,completed:true},new URL('https://example.test/api/match-live?detection=kickoff'),now),3600);
});
