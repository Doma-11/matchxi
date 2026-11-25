import {sameTeamIdentity} from './team-identity';
import type {DiscoveredReplay,ReplayMatch} from './replay-discovery';

// Metadata verified on Oddsivio's public Goal Timeline on 25 Nov 2026.
// A match-specific fallback, not a claim that live discovery succeeded.
const kickoff='2026-11-25T17:45:00Z';
const clips=[
 {id:40278,minute:'31′',scorer:'Anthony Gordon',team:'Barcelona',score:'0–1',url:'https://streamff.pro/v/8d6071e0',mediaUrl:'https://cdn.hostedhost.top/8d6071e0.mp4'},
 {id:40280,minute:'51′',scorer:'Anthony Gordon',team:'Barcelona',score:'0–2',url:'https://streamff.pro/v/849751b2',mediaUrl:'https://cdn.hostedhost.top/849751b2.mp4'},
 {id:40281,minute:'55′',scorer:'Karim Adeyemi',team:'Barcelona',score:'0–3',url:'https://streamff.pro/v/5813223c',mediaUrl:'https://cdn.hostedhost.top/5813223c.mp4'},
 {id:40282,minute:'60′',scorer:'Gabriel Jesus',team:'Barcelona',score:'0–4',url:'https://streamff.pro/v/c66211c9',mediaUrl:'https://cdn.hostedhost.top/c66211c9.mp4'},
 {id:40283,minute:'63′',scorer:'Joy-Lance Mickels',team:'Sabah FK',score:'1–4',url:'https://streamff.pro/v/289c5d2f',mediaUrl:'https://cdn.hostedhost.top/289c5d2f.mp4'},
];
export function verifiedReplayFallback(match:ReplayMatch):{replays:DiscoveredReplay[];source:string;sourceUrl:string;verifiedOn:string}|null{
 if(match.league!=='uefa.champions'||Date.parse(match.date)!==Date.parse(kickoff)||!sameTeamIdentity(match.home,'Sabah FK',{league:match.league})||!sameTeamIdentity(match.away,'Barcelona',{league:match.league}))return null;
 return {source:'Verified Oddsivio clips',sourceUrl:'https://www.oddsivio.com/matches/121770?tab=videos',verifiedOn:'2026-11-25',replays:clips.map(clip=>({id:`oddsivio-121770-${clip.id}`,minute:clip.minute,scorer:clip.scorer,team:clip.team==='Barcelona'?match.away:match.home,score:clip.score,match:`${match.home} vs ${match.away}`,matchDate:'2026-11-25',postUrl:'',videoUrl:clip.url,mediaUrl:clip.mediaUrl,testOnly:false,kind:'goal',title:`${clip.scorer} ${clip.minute}`,sources:[{url:clip.url,provider:'Streamff',mediaUrl:clip.mediaUrl}]}))};
}
