import {reportAccessDenied} from '../lib/report-access';
import {refreshMatchPoll} from '../../app/match-centre-data';
import {needsScoreRefresh} from '../../app/score-refresh';
import {GET as streamPlayer} from '../../app/api/stream-player/route';
import {GET as matchStreams} from '../../app/api/match-streams/route';
import type {Config} from '@netlify/functions';
import {authorize,unauthorized,protectResponse} from '../lib/private-auth';
import {GET as usageReports} from '../../app/api/usage-reports/route';
import {GET as dailyReport} from '../../app/api/daily-report/route';
import {meter} from '../../app/usage-meter';
import {GET as matchLive} from '../../app/api/match-live/route';
import {GET as tournamentBracket} from '../../app/api/tournament-bracket/route';
import {NextRequest} from '../../app/netlify-request';
import {GET as catalogue} from '../../app/api/catalogue/route';
import {GET as highlights} from '../../app/api/highlights/route';
import {GET as nationalHighlights} from '../../app/api/national-highlights/route';
import {GET as nationalTeams} from '../../app/api/national-teams/route';
import {GET as dashboard} from '../../app/api/league-dashboard/route';
import {GET as matches} from '../../app/api/matches/route';
import {GET as matchDay} from '../../app/api/match-day/route';
import {GET as matchHighlights} from '../../app/api/match-highlights/route';
import {GET as matchDetail} from '../../app/api/match-detail/route';
import {liveResponseLifetime} from '../../app/live-response-cache';
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
const pending=new Map<string,Promise<Response>>();
function lifetime(name:string,data:any,url:URL){
 if(name==='daily-report')return 60;
 if(name==='stream-player')return data.embedAllowed?31536000:900;
 if(name==='match-streams')return data.streams?.length?31536000:0;
 if(name==='match-highlights'&&data.matches?.length===0){const age=Date.now()-Date.parse(url.searchParams.get('date')||'');if(age>=0&&age<26*3600000)return 900;}
 if(name==='match-live')return liveResponseLifetime(data.game,url);
 if(name==='match-detail'){if(!data.pollLookupCheckedAt)return 0;if(data.statsUpgradeRetryAt&&data.playerDataVersion<7)return Math.max(60,Math.round((Date.parse(data.statsUpgradeRetryAt)-Date.now())/1000)||60);if(data.playerDataVersion!==7)return 0;if(data.game?.completed)return data.finalPlayerData?.status==='saved'?604800:Math.max(60,Math.min(604800,Math.round((Date.parse(data.finalPlayerData?.nextCheckAt)-Date.now())/1000)||900));return data.game?.state==='in'?300:1800;}
 if(name==='match-day')return needsScoreRefresh(data.games||[])?30:600;
 if(name==='catalogue')return 3600;
 return 21600;
}
async function handle(request:Request){
 const url=new URL(request.url),name=url.pathname.replace(/^.*\/(?:api)\//,'');
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
 const routes:Record<string,any>={'stream-player':streamPlayer,'match-streams':matchStreams,'daily-report':dailyReport,'usage-reports':usageReports,'tournament-bracket':tournamentBracket,'match-highlights':matchHighlights,'match-day':matchDay,'match-detail':matchDetail,'match-live':matchLive,catalogue,highlights,'national-highlights':nationalHighlights,'national-teams':nationalTeams,'league-dashboard':dashboard,matches};
 if(!routes[name])return Response.json({error:'Not found'},{status:404});
 if(['daily-report','usage-reports'].includes(name))return routes[name](new NextRequest(request));
 const params=new URLSearchParams(url.searchParams);params.sort();
 const key=createHash('sha256').update(name+'?'+params.toString()).digest('hex');
 const store=getStore({name:'matchxi-response-cache'});
 const respond=async(entry:any,cached=false)=>{const data=structuredClone(entry.data);if(name==='match-detail')await refreshMatchPoll(data);return Response.json(data,{headers:{'X-MatchXI-Cache':cached?'hit':'miss','Cache-Control':`public, max-age=${Math.min(entry.ttl,120)}`,'Netlify-CDN-Cache-Control':`public, s-maxage=${entry.ttl}`}});};
 try{
  const saved:any=await store.get(key,{type:'json'}).catch(()=>null);
  if(saved)saved.ttl=Math.min(saved.ttl,lifetime(name,saved.data,url));
  if(saved&&Date.now()-saved.at<saved.ttl*1000)return respond(saved,true);
  if(pending.has(key))return (await pending.get(key)!).clone();
  const work=(async()=>{
   const response=await routes[name](new NextRequest(request));
   if(!response.ok)return saved?respond({...saved,data:{...saved.data,live:false,clockFresh:false,...(saved.data.game?{game:{...saved.data.game,clockFresh:false}}:{})},ttl:120},true):response;
   const data=await response.json();
   // Do not cache transient source errors for hours.
   const ttl=data.error||data.failures?.length?120:lifetime(name,data,url);
   const entry={data,ttl,at:Date.now()};await store.setJSON(key,entry).catch(()=>{});
   return respond(entry);
  })();pending.set(key,work);
  try{return (await work).clone()}finally{pending.delete(key)}
 }catch(e){console.error('Public data read failed',e instanceof Error?e.message:'Unknown error');return Response.json({error:'Live source temporarily unavailable; saved data remains available'},{status:503});}
}

export default async function(request:Request){
 if(!await authorize(request))return unauthorized();
 const route=new URL(request.url).pathname.split('/').pop()||'api',isReport=['daily-report','usage-reports'].includes(route);
 if(isReport){const denied=await reportAccessDenied(request);if(denied)return denied;}
 const response=protectResponse(await meter(route,()=>handle(request)));
 if(isReport)response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config:Config={path:['/api/*','/.netlify/functions/api','/.netlify/functions/api/*'],excludedPath:['/api/auth','/api/portrait-image','/api/player-portraits'],rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
