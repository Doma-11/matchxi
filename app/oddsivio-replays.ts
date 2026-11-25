import {sameTeamIdentity} from './team-identity';
import {streaminWatch} from './streamin-playback';
import type {DiscoveredReplay,ReplayMatch} from './replay-discovery';

export type ReplayFixture={id:number;home:string;away:string;date:string};
/** Read public server-rendered data as JSON. Never evaluate page scripts. */
export function oddsivioRecords(html:string):any[]{
 let flight='';const records:any[]=[];
 for(const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)){
  try{const chunk=JSON.parse(match[1]);if(chunk[0]===1&&typeof chunk[1]==='string')flight+=chunk[1];}catch{}
 }
 for(const line of flight.split('\n')){const colon=line.indexOf(':');if(colon<1)continue;try{records.push(JSON.parse(line.slice(colon+1)));}catch{}}
 return records;
}
function properties(records:any[],key:string):any[]{
 const found:any[]=[];let visited=0;
 function visit(value:any,depth:number){if(++visited>50000||depth>30||!value||typeof value!=='object')return;
  if(!Array.isArray(value)&&Object.prototype.hasOwnProperty.call(value,key))found.push(value[key]);
  for(const child of Object.values(value))visit(child,depth+1);
 }
 for(const record of records)visit(record,0);return found;
}
export function oddsivioFixtures(html:string):ReplayFixture[]{
 const arrays=properties(oddsivioRecords(html),'todayFixtures');
 if(!arrays.some(Array.isArray))throw Error('REPLAY_SOURCE_UNAVAILABLE');
 return arrays.flat().filter(x=>Number.isSafeInteger(x?.id)&&x.id>0&&typeof x.home_team_name==='string'&&typeof x.away_team_name==='string'&&Number.isFinite(Date.parse(x.kickoff_at)))
  .slice(0,1000).map(x=>({id:x.id,home:x.home_team_name,away:x.away_team_name,date:x.kickoff_at}));
}
export function sameReplayFixture(fixture:ReplayFixture,match:ReplayMatch):boolean{
 return sameTeamIdentity(fixture.home,match.home,{league:match.league})&&sameTeamIdentity(fixture.away,match.away,{league:match.league})&&Math.abs(Date.parse(fixture.date)-Date.parse(match.date))<=90*60000;
}
function plain(raw:string):string{return raw.replace(/<[^>]*>/g,' ').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,hex,dec)=>{const n=parseInt(hex||dec,hex?16:10);return n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
/** Bounded fallback to the public recent-highlights index, including yesterday. */
export function oddsivioRecentMatches(html:string,match:ReplayMatch):number[]{
 const ids=new Set<number>();
 for(const anchor of html.matchAll(/<a\b[^>]*href=["']\/matches\/(\d{1,9})["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const label=plain(anchor[2].split(/<span\b/i)[0]);
  const names=label.match(/^(.+?)\s+(?:\d{1,2}\s*[–-]\s*\d{1,2}|vs?\.?)\s+(.+)$/i);
  if(names&&sameTeamIdentity(names[1],match.home,{league:match.league})&&sameTeamIdentity(names[2],match.away,{league:match.league}))ids.add(Number(anchor[1]));
 }
 return [...ids].filter(id=>id>0).slice(0,3);
}
export function oddsivioGoals(html:string,match:ReplayMatch,id:number):DiscoveredReplay[]{
 const records=oddsivioRecords(html),initial=properties(records,'initialMatch').find(x=>x?.id===id);
 if(!initial||!sameReplayFixture({id,home:initial.home_team?.name||'',away:initial.away_team?.name||'',date:initial.kickoff_at},match))throw Error('REPLAY_MATCH_MISMATCH');
 const payload=properties(records,'initialVideos').find(x=>x?.match_id===id);
 if(!payload||!Array.isArray(payload.videos))throw Error('REPLAY_SOURCE_UNAVAILABLE');
 const events=properties(records,'initialEvents').find(x=>x?.match_id===id)?.events;
 const goals=new Map<string,DiscoveredReplay>();
 for(const video of payload.videos.slice(0,100)){
  if(video?.platform!=='streamin'||video.video_type!=='goal_clip'||video.region_allowed===false||/\b(?:disallowed|offside|miss(?:ed)?|save[ds]?)\b/i.test(video.title||''))continue;
  const watch=typeof video.source_url==='string'?streaminWatch(video.source_url):null;if(!watch)continue;
  const event=Array.isArray(events)?events.find(e=>e.id===video.match_event_id):null;
  if(event&&(event.event_type!=='goal'||event.shootout_kick||/disallowed|cancelled|offside/i.test(event.detail||'')))continue;
  const title=typeof video.title==='string'?video.title:'';
  if(!event){const names=title.match(/^(.+?)\s*[\[(]?\d{1,2}[\])]?\s*[-–]\s*[\[(]?\d{1,2}[\])]?\s+(.+?)\s+[-–]\s+.+$/);
   if(!names||!sameTeamIdentity(names[1].trim(),match.home,{league:match.league})||!sameTeamIdentity(names[2].trim(),match.away,{league:match.league}))continue;
  }
  const score=title.match(/([\[(]?\d{1,2}[\])]?)\s*[-–]\s*([\[(]?\d{1,2}[\])]?)/);
  const home=event?.home_score_after??(score?Number(score[1].replace(/\D/g,'')):null),away=event?.away_score_after??(score?Number(score[2].replace(/\D/g,'')):null);
  const minute=event?.minute??video.minute,titleMinute=title.match(/\b(\d{1,3})\s*\+\s*(\d{1,2})\s*[′'’]/);
  const extra=event?.extra_minute??(titleMinute&&Number(titleMinute[1])===minute?Number(titleMinute[2]):null);
  if(!Number.isInteger(minute)||minute<1||minute>130||!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home+away===0)continue;
  const scorer=event?.player?.name||video.scorer_name;if(typeof scorer!=='string'||!scorer.trim()||scorer.length>100)continue;
  const homeGoal=Boolean(score&&/[\[(]/.test(score[1])),awayGoal=Boolean(score&&/[\[(]/.test(score[2]));
  const team=homeGoal!==awayGoal?(homeGoal?match.home:match.away):/own goal/i.test(event?.detail||'')?'':event?.team_id===initial.home_team?.id?match.home:event?.team_id===initial.away_team?.id?match.away:'';
  const key=event?String(event.id):`${minute}:${home}:${away}:${scorer}`;
  const source={url:watch.url,provider:'Streamin',...(video.embeddable===false?{externalOnly:true}:{})};const existing=goals.get(key);
  if(existing){if(!existing.sources.some(s=>s.url===source.url))existing.sources.push(source);continue;}
  goals.set(key,{id:`oddsivio-${id}-${video.id}`,minute:String(minute)+(Number.isInteger(extra)&&extra>0?'+'+extra:'')+'′',scorer:scorer+(/own goal/i.test(event?.detail||'')?' (OG)':''),team,match:`${match.home} vs ${match.away}`,score:`${home}–${away}`,matchDate:initial.kickoff_at.slice(0,10),postUrl:'',videoUrl:watch.url,testOnly:false,kind:'goal',title,sources:[source]});
 }
 return [...goals.values()].sort((a,b)=>{const order=(value:string)=>{const [minute,extra]=value.split('+');return parseInt(minute)*100+(parseInt(extra)||0);};return order(a.minute)-order(b.minute);}).slice(0,20);
}
