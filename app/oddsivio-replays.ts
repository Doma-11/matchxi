import {sameTeamIdentity} from './team-identity';
import {streamffMedia} from './streamff-playback';
import {replaySource,type DiscoveredReplay,type ReplayMatch} from './replay-discovery';

export type ReplayFixture={id:number;home:string;away:string;date:string;homeId?:number;awayId?:number;homeCountry?:string;awayCountry?:string};
/** Oddsivio labels its Azerbaijan club 818 "Sabah FA". Scope this correction
 * to that provider ID and UEFA fixtures, never to similarly named clubs globally. */
function sameSourceTeam(source:string,name:string,league:string,id?:number,country?:string):boolean{
 if(sameTeamIdentity(source,name,{league}))return true;
 return id===818&&/^uefa\./.test(league)&&(!country||country==='Azerbaijan')&&source==='Sabah FA'&&sameTeamIdentity('Sabah FK',name,{league});
}
/** Read public server-rendered data as JSON. Never evaluate page scripts. */
export function oddsivioRecords(html:string):any[]{
 let flight='';const records:any[]=[];
 for(const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)){
  try{const chunk=JSON.parse(match[1]);if(chunk[0]===1&&typeof chunk[1]==='string')flight+=chunk[1];}catch{}
 }
 // Flight text records use byte lengths, and need not end with a newline.
 // Skipping them by lines can swallow the following live-match props record.
 const bytes=new TextEncoder().encode(flight),decoder=new TextDecoder();let cursor=0;
 while(cursor<bytes.length){
  if(bytes[cursor]===10){cursor++;continue;}
  const colon=bytes.indexOf(58,cursor);if(colon<0)break;
  if(colon-cursor>16||!/^\w+$/.test(decoder.decode(bytes.subarray(cursor,colon)))){const end=bytes.indexOf(10,cursor);if(end<0)break;cursor=end+1;continue;}
  if(bytes[colon+1]===84){const comma=bytes.indexOf(44,colon+2);if(comma<0||comma-colon>12)break;
   const hex=decoder.decode(bytes.subarray(colon+2,comma));if(!/^[\da-f]+$/i.test(hex))break;
   const size=parseInt(hex,16);if(size>bytes.length-comma-1)break;cursor=comma+1+size;continue;
  }
  const end=bytes.indexOf(10,colon+1),next=end<0?bytes.length:end;
  try{records.push(JSON.parse(decoder.decode(bytes.subarray(colon+1,next))));}catch{}
  cursor=next+1;
 }
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
  .slice(0,1000).map(x=>({id:x.id,home:x.home_team_name,away:x.away_team_name,date:x.kickoff_at,homeId:x.home_team_id,awayId:x.away_team_id}));
}
export function sameReplayFixture(fixture:ReplayFixture,match:ReplayMatch):boolean{
 return sameSourceTeam(fixture.home,match.home,match.league,fixture.homeId,fixture.homeCountry)&&sameSourceTeam(fixture.away,match.away,match.league,fixture.awayId,fixture.awayCountry)&&Math.abs(Date.parse(fixture.date)-Date.parse(match.date))<=90*60000;
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
 if(!initial||!sameReplayFixture({id,home:initial.home_team?.name||'',away:initial.away_team?.name||'',date:initial.kickoff_at,homeId:initial.home_team?.id,awayId:initial.away_team?.id,homeCountry:initial.home_team?.country,awayCountry:initial.away_team?.country},match))throw Error('REPLAY_MATCH_MISMATCH');
 const payload=properties(records,'initialVideos').find(x=>x?.match_id===id);
 if(!payload||!Array.isArray(payload.videos))throw Error('REPLAY_SOURCE_UNAVAILABLE');
 const events=properties(records,'initialEvents').find(x=>x?.match_id===id)?.events;
 const goals=new Map<string,DiscoveredReplay>();
 for(const video of payload.videos.slice(0,100)){
  if(video?.video_type!=='goal_clip'||video.region_allowed===false||/\b(?:disallowed|offside|miss(?:ed)?|save[ds]?)\b/i.test(video.title||''))continue;
  const watch=replaySource(video.source_url);if(!watch)continue;
  const mediaUrl=video.embeddable!==false&&video.embed_kind==='direct_video'?streamffMedia(watch.url,video.embed_url):null;
  const event=Array.isArray(events)?events.find(e=>e.id===video.match_event_id):null;
  if(event&&(event.event_type!=='goal'||event.shootout_kick||/disallowed|cancelled|offside/i.test(event.detail||'')))continue;
  const title=typeof video.title==='string'?video.title:'';
  if(!event){const names=title.match(/^(.+?)\s*[\[(]?\d{1,2}[\])]?\s*[-–]\s*[\[(]?\d{1,2}[\])]?\s+(.+?)\s+[-–]\s+.+$/);
   if(!names||!sameSourceTeam(names[1].trim(),match.home,match.league,initial.home_team?.id,initial.home_team?.country)||!sameSourceTeam(names[2].trim(),match.away,match.league,initial.away_team?.id,initial.away_team?.country))continue;
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
  const source={...watch,...(mediaUrl?{mediaUrl}:{}),...(video.embeddable===false?{externalOnly:true}:{})};const existing=goals.get(key);
  if(existing){if(!existing.sources.some(s=>s.url===source.url))existing.sources.push(source);continue;}
  goals.set(key,{id:`oddsivio-${id}-${video.id}`,minute:String(minute)+(Number.isInteger(extra)&&extra>0?'+'+extra:'')+'′',scorer:scorer+(/own goal/i.test(event?.detail||'')?' (OG)':''),team,match:`${match.home} vs ${match.away}`,score:`${home}–${away}`,matchDate:initial.kickoff_at.slice(0,10),postUrl:'',videoUrl:watch.url,...(mediaUrl?{mediaUrl}:{}),testOnly:false,kind:'goal',title,sources:[source]});
 }
 return [...goals.values()].sort((a,b)=>{const order=(value:string)=>{const [minute,extra]=value.split('+');return parseInt(minute)*100+(parseInt(extra)||0);};return order(a.minute)-order(b.minute);}).slice(0,20);
}
