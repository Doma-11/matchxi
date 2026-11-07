import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {readCatalogue} from './catalogue-store';
import {matchVideo,videoMatchDate,LEAGUES,CLUB_CUPS,COMPETITIONS} from './football-model';
import {matchesUploadWindow} from './match-highlight-discovery';
export const zagrebDay=(value:string|Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const cacheKey=(route:string,params:Record<string,string>)=>{const q=new URLSearchParams(params);q.sort();return createHash('sha256').update(route+'?'+q).digest('hex')};
const fixtureKey=(game:any)=>createHash('sha256').update([game.league,game.home.name,game.away.name].join('|')).digest('hex');
export async function recordHighlightCheck(game:any,result:any,newIds:string[]){
 if(!game.completed)return;
 const day=zagrebDay(game.date),store=getStore({name:'matchxi-daily-highlight-checks',consistency:'strong'}),key=day+'/'+fixtureKey(game);
 const previous:any=await store.get(key,{type:'json'});
 await store.setJSON(key,{checkedAt:result.checkedAt,available:result.matches.length,newIds:[...new Set([...(previous?.newIds||[]),...newIds])],failure:result.failure||null});
}
export function summarizeDaily(rows:any[]){return {completed:rows.length,highlightChecks:rows.filter(r=>r.highlightCheckedAt).length,covered:rows.filter(r=>r.highlights.length).length,newMatches:rows.filter(r=>r.newVideoIds.length).length,newVideos:new Set(rows.flatMap(r=>r.newVideoIds)).size,alreadyCovered:rows.filter(r=>r.highlights.length&&!r.newVideoIds.length).length,missing:rows.filter(r=>!r.highlights.length).length,ratingsComplete:rows.filter(r=>r.playerDataVersion>=2&&r.finalPlayerData?.status==='saved').length,ratingsPending:rows.filter(r=>r.playerDataVersion>=2&&r.finalPlayerData?.status==='pending').length,ratingsUnchecked:rows.filter(r=>!(r.playerDataVersion>=2)).length,sourceFailures:rows.filter(r=>r.failure||r.finalPlayerData?.failure).length}}
export async function dailyFootballReport(day:string){
 const responses=getStore({name:'matchxi-response-cache'});
 const cached:any=await responses.get(cacheKey('match-day',{date:day,tz:'Europe/Zagreb'}),{type:'json'});
 const [savedGames,videos]=await Promise.all([readCatalogue('game'),readCatalogue('video')]);
 const dayGames=cached?.data?.games||savedGames.filter(g=>zagrebDay(g.date)===day);
 const supported=new Set([...LEAGUES,...CLUB_CUPS,...COMPETITIONS].map(c=>c.id));
 const details=getStore({name:'matchxi-match-details',consistency:'strong'}),checks=getStore({name:'matchxi-daily-highlight-checks',consistency:'strong'});
 const rows:any[]=[];
 // Sequential bounded batches keep report reads light and never fetch public sources.
 for(let i=0;i<dayGames.length;i+=2){
  const batch=await Promise.all(dayGames.slice(i,i+2).filter((g:any)=>supported.has(g.league)).map(async(g:any)=>{
   const id=String(g.id).replace(/^fm-/,''),detail:any=await details.get(g.league+':'+id,{type:'json'});
   const game=detail?.game?.completed?detail.game:g;if(!game.completed||zagrebDay(game.date)!==day)return null;
   let check:any=await checks.get(day+'/'+fixtureKey(game),{type:'json'});
   if(!check){const oldCheck:any=await responses.get(cacheKey('match-highlights',{league:game.league,home:game.home.name,away:game.away.name,date:day,completed:'true',homeScore:String(game.home.score??''),awayScore:String(game.away.score??'')}),{type:'json'});if(oldCheck?.data?.checkedAt)check={checkedAt:oldCheck.data.checkedAt,newIds:[],failure:oldCheck.data.failure||null};}
   const clips=videos.filter((v:any)=>v.league===game.league&&!/itv/i.test(v.publisher+' '+v.title)&&matchVideo(v,game)&&(videoMatchDate(v)?videoMatchDate(v)===game.date.slice(0,10):matchesUploadWindow(v,game)));
   return {id:game.id,league:game.league,competition:[...LEAGUES,...CLUB_CUPS,...COMPETITIONS].find(c=>c.id===game.league)?.name,home:game.home.name,away:game.away.name,homeScore:game.home.score,awayScore:game.away.score,highlights:clips.map((v:any)=>({id:v.id,title:v.title,url:v.url,publisher:v.publisher})),newVideoIds:(check?.newIds||[]).filter((id:string)=>clips.some((v:any)=>v.id===id)),highlightCheckedAt:check?.checkedAt||null,failure:check?.failure||null,playerDataVersion:detail?.playerDataVersion||0,finalPlayerData:detail?.finalPlayerData||null};
  }));rows.push(...batch.filter(Boolean));
 }
 const tomorrow=new Date(day+'T12:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 const runStore=getStore({name:'matchxi-scheduled-runs',consistency:'strong'});
 const runs=(await Promise.all([day+'/2330',tomorrow.toISOString().slice(0,10)+'/1245'].map(id=>runStore.get(id,{type:'json'})))).filter(Boolean).map((r:any)=>({id:r.id,state:r.state,createdAt:r.createdAt,finishedAt:r.finishedAt,failure:r.failure||null,processed:r.index||0,total:r.games?.length||0,failures:(r.results||[]).filter((v:any)=>v.highlightFailure||v.playerFailure).length}));
 const report={id:'daily/'+day,date:day,generatedAt:new Date().toISOString(),scheduledRuns:runs,fixturesCheckedAt:cached?.data?.checkedAt||null,fixtureCoverage:cached?.data?.live?'checked':cached?'saved':'unverified',fixtureFailures:cached?.data?.failures||[],rows,summary:summarizeDaily(rows),note:'Netlify checks finished games at 23:30 and rechecks at 12:45 the next day (Zagreb time), independently of ChatGPT. This report reads saved results only; missing source data is never invented.'};
 await getStore({name:'matchxi-daily-reports'}).setJSON(day,report);
 return report;
}
