import {supportedStreamPlayer} from './stream-embed';

export const streamGameKey=(game:any)=>`${game.league}:${String(game.id).replace(/^fm-/,'')}`;
export function streamDay(date=new Date().toISOString(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Zagreb'){
 return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone}).format(new Date(date));
}
export function streamStep(index:number,direction:number,count:number){return count>0?(index+direction+count)%count:0;}
export function liveStreamGames(records:any[],current?:any){
 const today=streamDay(),games=new Map<string,any>();
 for(const game of records||[]){if(!game?.home?.name||!game?.away?.name||!game.league||game.id==null||game.completed||game.state!=='in')continue;try{if(streamDay(game.date)!==today)continue;}catch{continue;}games.set(streamGameKey(game),game);}
 if(current?.state==='in'&&!current.completed)games.set(streamGameKey(current),current);
 // Watching state never participates in ordering; ties use a stable fixture identity.
 return [...games.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))||streamGameKey(a).localeCompare(streamGameKey(b)));
}
export function streamMinute(game:any){
 const raw=[game.statusName,game.statusDescription,game.status,game.clock].filter(Boolean).join(' ');
 if(/half[\s_-]*time|\bHT\b/i.test(raw))return 'HT';
 const minute=String(game.clock||game.status||'').match(/^(\d+)(?:[′']?\s*\+\s*(\d+))?/);
 return minute?`${minute[1]}${minute[2]?'+'+minute[2]:''}′`:'Live';
}
function read(storage:Storage|undefined,key:string){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
function write(storage:Storage|undefined,key:string,value:any){try{storage?.setItem(key,JSON.stringify(value));}catch{}}
function browserStorage(type:'localStorage'|'sessionStorage'):Storage|undefined{try{return typeof window!=='undefined'?window[type]:undefined;}catch{return undefined;}}
function streamsFrom(data:any){
 const seen=new Set<string>();return (Array.isArray(data?.streams)?data.streams:[]).filter((s:any)=>{try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||seen.has(u.href))return false;seen.add(u.href);return true;}catch{return false;}});
}
function aborted(signal:AbortSignal){if(signal.aborted)throw new DOMException('Aborted','AbortError');}
export function createStreamSession({fetcher=(...args:Parameters<typeof fetch>)=>fetch(...args),local=browserStorage('localStorage'),session=browserStorage('sessionStorage'),now=()=>Date.now()}={}){
 return {
  async listings(game:any,signal:AbortSignal,force=false){
   aborted(signal);const key='touchline-streams-'+game.league+'-'+game.id+'-'+game.date,saved=read(local,key);
   if(!force&&streamsFrom(saved).length)return {...saved,streams:streamsFrom(saved)};
   const date=streamDay(game.date,'Europe/Zagreb'),p=new URLSearchParams({home:game.home.name,away:game.away.name,date,live:'true',id:String(game.id),league:game.league});
   const r=await fetcher('/api/match-streams?'+p,{signal});const data:any=await r.json();aborted(signal);
   if(!r.ok||data.error)throw Error(data.error||'Streams could not be checked. Please try again.');
   const result={...data,streams:streamsFrom(data)};if(result.streams.length)write(local,key,result);return result;
  },
  async player(stream:any,signal:AbortSignal){
   aborted(signal);const key='touchline-stream-player-v2-'+stream.url,saved=read(local,key);
   if(saved?.embedAllowed&&supportedStreamPlayer(saved.embedUrl))return {...saved,embedUrl:supportedStreamPlayer(saved.embedUrl)};
   const r=await fetcher('/api/stream-player?'+new URLSearchParams({url:stream.url,playerVersion:'2'}),{signal});const data:any=await r.json();aborted(signal);
   if(!r.ok)throw Error(data.error||'Could not open this player. Use the external link.');
   const url=data.embedAllowed&&supportedStreamPlayer(data.embedUrl),result=url?{...data,embedUrl:url}:{...data,embedAllowed:false,embedUrl:undefined};
   if(url)write(local,key,result);return result;
  },
  async games(signal:AbortSignal){
   aborted(signal);const date=streamDay(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Zagreb';
   const candidates=[read(session,'touchline-match-day'),read(session,'touchline-stream-match-day')].filter(s=>s?.date===date&&Array.isArray(s.games)).sort((a,b)=>Date.parse(b.checkedAt||'')-Date.parse(a.checkedAt||''));
   const saved=candidates[0],age=now()-Date.parse(saved?.checkedAt||'');if(saved&&age>=0&&age<60000)return saved;
   const r=await fetcher('/api/match-day?'+new URLSearchParams({date,tz:zone}),{signal,cache:'no-store'});const data:any=await r.json();aborted(signal);
   if(!r.ok||data.error||!Array.isArray(data.games))throw Error(data.error||'Live matches could not refresh.');
   const result={...data,date};write(session,'touchline-stream-match-day',result);return result;
  }
 };
}

/** On an explicit game change, stop at the first source passing provider embed checks.
 * One request at a time; cancellation stops the scan. Existing successful player checks are reused by the session. */
export async function firstEmbeddableStream(streams:any[],player:(stream:any,signal:AbortSignal)=>Promise<any>,signal:AbortSignal,onChecking?:(index:number)=>void){
 let last:any={reason:'No stream found for this match yet.'};
 for(let index=0;index<streams.length;index++){
  aborted(signal);onChecking?.(index);
  try{const result=await player(streams[index],signal);aborted(signal);last=result;if(result?.embedAllowed&&supportedStreamPlayer(result.embedUrl))return {index,player:result};}
  catch(e:any){aborted(signal);last={error:e.message||'This source could not be checked.'};}
 }
 return {index:0,player:{...last,embedAllowed:false,embedUrl:undefined,reason:'No embeddable source could be verified for this match. Open externally or try another source.',error:undefined}};
}

/** Stable supported-first order for the explicitly opened Broadcast list.
 * At most two provider checks in flight; cancelled views schedule no more work. */
export async function rankStreamSources(streams:any[],player:(stream:any,signal:AbortSignal)=>Promise<any>,signal:AbortSignal){
 const checked:any[]=new Array(streams.length);let cursor=0;
 async function worker(){while(cursor<streams.length){aborted(signal);const index=cursor++;let status='unverified';try{const result=await player(streams[index],signal);aborted(signal);status=result?.embedAllowed&&supportedStreamPlayer(result.embedUrl)?'supported':'unsupported';}catch{aborted(signal);}checked[index]={...streams[index],embedStatus:status};}}
 await Promise.all([worker(),worker()]);aborted(signal);
 return [...checked.filter(s=>s.embedStatus==='supported'),...checked.filter(s=>s.embedStatus!=='supported')];
}
