export function isHalfTime(game:any){
 if(game.completed||game.state==='post')return false;
 return [game.status,game.statusName,game.statusDescription,game.clock].some(v=>typeof v==='string'&&/(?:\bHT\b|half[\s_-]*time)/i.test(v));
}
export function matchClockText(game:any){
 if(isHalfTime(game))return 'HT';
 if(/suspend|interrupt|abandon|postpon|cancel|extra.?time.?break|shootout/i.test([game.status,game.statusName].join(' ')))return game.status||game.statusDescription||'Paused';
 const clock=String(game.clock||game.status||'Live');
 if(/half|break|suspend|delay/i.test(clock))return clock;
 const minutes=clock.match(/^(\d+)(?:[′']\s*\+\s*(\d+)|\s*\+\s*(\d+))?/);
 if(minutes)return `${minutes[1]}${minutes[2]||minutes[3]?`+${minutes[2]||minutes[3]}`:''}′`;
 return game.clockSeconds!=null?`${Math.floor(game.clockSeconds/60)}′`:clock;
}

export type ClockAnchor={phase:string;at:number;seconds:number;observedAt:number;sourceSeconds:number;estimated:boolean;running:boolean};
export function clockPhase(g:any){
 const status=[g.status,g.statusName,g.statusDescription,g.clock].join(' ');
 if(g.completed||g.state==='post')return 'finished';
 if(/abandon|cancel|postpone|suspend|interrupt|delay|penalt(?:y|ies).*shoot|shootout|extra.?time.?break/i.test(status))return 'paused';
 if(isHalfTime(g))return 'halftime';
 if(g.state!=='in')return 'waiting';
 const p=Number(g.period);
 if(p>=3)return 'extra-'+p;
 if(p===2||/second half/i.test(status))return 'second';
 if(p===1||/first half/i.test(status))return 'first';
 // Period unknown: use source elapsed minute, never scheduled kickoff.
 const m=sourceClock(g);return m&&m.seconds>=45*60?'second':'first';
}
export function sourceClock(g:any){
 const start=Date.parse(g.halfStartedAt||''),observed=Date.parse(g.clockCheckedAt||'');
 if(Number.isFinite(start)&&Number.isFinite(observed)&&observed>=start&&observed-start<3*3600000)return {seconds:(Number(g.period)===2?2700:Number(g.period)===3?5400:Number(g.period)===4?6300:0)+(observed-start)/1000,estimated:false};
 const text=String(g.clock||g.status||''),full=text.match(/^(\d+):(\d{2})(?:\s*\+\s*(\d+):(\d{2}))?/);
 if(full)return {seconds:Number(full[1])*60+Number(full[2])+(Number(full[3])||0)*60+(Number(full[4])||0),estimated:false};
 const minute=text.match(/^(\d+)(?:[′']?\s*\+\s*(\d+))?[′']?\s*$/);
 if(minute)return {seconds:(Number(minute[1])+Number(minute[2]||0))*60,estimated:true};
 if(g.clockSeconds!=null&&Number.isFinite(Number(g.clockSeconds)))return {seconds:Number(g.clockSeconds),estimated:Number(g.clockSeconds)%60===0};
 return null;
}
export function clockSeconds(anchor:ClockAnchor,now=Date.now()){return anchor.seconds+(anchor.running?Math.max(0,now-anchor.at)/1000:0)}
// Each half gets one anchor. Score responses confirm phases, never correct a
// running half from whole minutes or reset its seconds.
export function reconcileClock(previous:ClockAnchor|null,g:any,now=Date.now()):ClockAnchor|null{
 const phase=clockPhase(g),running=['first','second'].includes(phase)||phase.startsWith('extra-');
 const observedAt=Date.parse(g.clockCheckedAt||''),source=sourceClock(g);
 const fresh=Number.isFinite(observedAt)&&now-observedAt>=-5000&&now-observedAt<=90000&&g.clockFresh!==false;
 if(previous&&(!fresh||observedAt<previous.observedAt))return previous;
 if(!running){
  if(previous?.phase===phase)return previous;
  return {phase,seconds:previous?clockSeconds(previous,now):0,at:now,observedAt:Number.isFinite(observedAt)?observedAt:now,sourceSeconds:source?.seconds??0,estimated:true,running:false};
 }
 if(previous?.phase===phase&&previous.running)return previous;
 if(!fresh)return previous;
 const base=phase==='second'?2700:phase==='extra-3'?5400:phase==='extra-4'?6300:0;
 const detected=(phase==='first'&&previous?.phase==='waiting'||phase==='second'&&previous?.phase==='halftime')&&(!source||source.seconds<=base+120);
 if(!source&&!detected)return previous;
 const elapsed=detected?base:source!.seconds+Math.max(0,now-observedAt)/1000;
 return {phase,seconds:elapsed,at:now,observedAt,sourceSeconds:source?.seconds??base,estimated:detected||source!.estimated,running:true};
}

// One shared clock per fixture, reused by Home, the match and navigation/reload.
type SharedClock={anchor:ClockAnchor|null;game:any;seenAt:number};
const sharedClocks=new Map<string,SharedClock>();
export function observeMatchClock(game:any,now=Date.now()){
 const key=game.league+':'+game.id;let saved=sharedClocks.get(key);
 if(!saved){try{const raw=JSON.parse(sessionStorage.getItem('touchline-clock-v2-'+key)||'null');if(raw&&Number.isFinite(raw.seenAt)&&now-raw.seenAt<6*3600000)saved=raw;}catch{}}
 const observedAt=Date.parse(game.clockCheckedAt||'');
 if(saved&&(game.clockFresh===false||!Number.isFinite(observedAt)||observedAt<saved.seenAt)){sharedClocks.set(key,saved);return saved.anchor;}
 // Without a period or HT transition, stoppage time cannot start a second half.
 const view=saved?.anchor?.phase==='first'&&saved.anchor.running&&game.state==='in'&&!isHalfTime(game)&&!Number(game.period)?{...game,period:1}:game;
 const anchor=reconcileClock(saved?.anchor||null,view,now);
 if(!saved||anchor!==saved.anchor||observedAt>saved.seenAt){saved={anchor,game:view,seenAt:Number.isFinite(observedAt)?observedAt:now};sharedClocks.set(key,saved);try{sessionStorage.setItem('touchline-clock-v2-'+key,JSON.stringify(saved))}catch{}}
 return saved?.anchor||anchor;
}
export function sharedClockText(game:any,now=Date.now()){
 if(clockPhase(game)==='finished')return game.status||'FT';
 const anchor=observeMatchClock(game,now),saved=sharedClocks.get(game.league+':'+game.id);
 // A restored/foregrounded clock must not extrapolate through an unseen HT/FT.
 // Keep its anchor intact; the existing foreground score request confirms phase.
 if(anchor?.running&&(!saved||now-saved.seenAt>90000))return 'Updating…';
 return localClockText(anchor,saved?.game||game,now);
}
export function minuteClockText(clock:string){
 if(clock==='Updating…')return '…';
 const m=clock.match(/^(\d+)(?:\+(\d+))?(?::\d{2})?[′']?$/);
 return m?`${Number(m[1])}${Number(m[2])>0?'+'+Number(m[2]):''}'`:clock;
}
export function sharedMinuteClockText(game:any,now=Date.now()){return minuteClockText(sharedClockText(game,now));}
export function localClockText(anchor:ClockAnchor|null,g:any,now=Date.now()){
 if(clockPhase(g)==='halftime')return 'HT';
 if(!anchor||!anchor.running||clockPhase(g)!==anchor.phase)return matchClockText(g);
 const seconds=Math.floor(clockSeconds(anchor,now)),minutes=Math.floor(seconds/60),remaining=String(seconds%60).padStart(2,'0');
 const limit=anchor.phase==='first'?45:anchor.phase==='second'?90:anchor.phase==='extra-3'?105:120;
 return minutes>=limit?`${limit}+${minutes-limit}:${remaining}`:`${minutes}:${remaining}`;
}
