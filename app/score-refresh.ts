import {isHalfTime} from './match-clock';

// Remember the first confirmed halftime across navigation and page reloads.
const halftimeStarts=new Map<string,number>();
export function halftimePauseRemaining(game:any,now=Date.now()):number{
 const key=game.league+':'+game.id;
 if(!isHalfTime(game))return 0;
 let start=halftimeStarts.get(key);
 if(start==null){try{const saved=Number(sessionStorage.getItem('touchline-halftime-'+key));if(saved>0&&saved<=now&&now-saved<6*3600000)start=saved;}catch{}
 start??=now;halftimeStarts.set(key,start);try{sessionStorage.setItem('touchline-halftime-'+key,String(start))}catch{}}
 return Math.max(0,start+15*60000-now);
}
export function halftimeStart(game:any,now=Date.now()){halftimePauseRemaining(game,now);return halftimeStarts.get(game.league+':'+game.id)??now;}
export function startDetection(game:any,now=Date.now()):'kickoff'|'second-half'|null{
 if(game.completed||game.state==='post'||game.clockFresh===false)return null;
 if(isHalfTime(game))return halftimePauseRemaining(game,now)===0&&now-halftimeStart(game,now)<20*60000?'second-half':null;
 const age=now-Date.parse(game.date);
 return game.state==='pre'&&game.timeConfirmed!==false&&age>=-60000&&age<240000?'kickoff':null;
}
export function scorePollingAllowed(game:any,now=Date.now()){return scorePollInterval(game,now)!==null&&halftimePauseRemaining(game,now)===0;}

// Keep checking a delayed scheduled fixture through the normal match window.
// This controls freshness only; it never infers a live score or status.
export function needsScoreRefresh(games:any[],now=Date.now()){
 return games.some(g=>{
  if(g.completed||/cancelled|postponed|abandoned/i.test(g.status||''))return false;
  if(g.state==='in')return true;
  const age=now-Date.parse(g.date);
  return g.timeConfirmed!==false&&Number.isFinite(age)&&age>=-15*60000&&age<=3*3600000;
 });
}

export function scorePollInterval(game:any,now=Date.now()):number|null{
 if(game.completed||game.state==='post'||/cancelled|postponed|abandoned/i.test(game.status||''))return null;
 if(/suspend|interrupt|delay/i.test(game.status||''))return 120000;
 const pause=halftimePauseRemaining(game,now);
 if(isHalfTime(game))return pause||(now-halftimeStart(game,now)<20*60000?10000:40000);
 if(/extra.?time.?break/i.test([game.status,game.statusName,game.clock].join(' ')))return 120000;
 if(game.state==='in')return 40000;
 const age=now-Date.parse(game.date);
 if(!Number.isFinite(age)||game.timeConfirmed===false||age>3*3600000)return null;
 // Wait locally until the existing 15-minute freshness window; no new
 // periodic API calls are introduced hours before kickoff.
 if(age<-15*60000)return Math.min(-age-15*60000,2147483647);
 if(startDetection(game,now)==='kickoff')return 6000;
 if(age<-60000)return Math.min(120000,-age-60000);
 return 40000;
}
export function homePollInterval(games:any[],today:boolean,now=Date.now()):number|null{
 if(!today)return null;
 const intervals=games.map(g=>scorePollInterval(g,now)).filter((n):n is number=>n!=null);
 return intervals.length?Math.min(...intervals):null;
}
