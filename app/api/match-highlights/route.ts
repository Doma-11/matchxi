import {NextRequest} from '../../netlify-request';
import {GET as leagueVideos} from '../highlights/route';
import {GET as nationalVideos} from '../national-highlights/route';
import {matchVideo,isNationalCompetition,videoMatchDate} from '../../football-model';
import {discoverMatchHighlights,matchesUploadWindow} from '../../match-highlight-discovery';
import {readCatalogue,saveCatalogue} from '../../catalogue-store';
import {recordHighlightCheck} from '../../daily-football-report';
const cache=new Map<string,{at:number,data:any}>();
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,league=p.get('league')||'',home=p.get('home')?.slice(0,90)||'',away=p.get('away')?.slice(0,90)||'',date=p.get('date')||'';
 if(!home||!away||!Number.isFinite(Date.parse(date)))return Response.json({error:'Invalid fixture'},{status:400});
 const game={league,date,completed:p.get('completed')==='true',home:{name:home,score:p.get('homeScore')},away:{name:away,score:p.get('awayScore')}};
 const key=[league,home,away,date,game.home.score,game.away.score].join('|'),old=cache.get(key);
 if(old&&Date.now()-old.at<300000)return Response.json(old.data);
 const eligible=(v:any)=>matchVideo(v,game)&&(videoMatchDate(v)?videoMatchDate(v)===date.slice(0,10):matchesUploadWindow(v,game)||Date.now()-Date.parse(date)>62*86400000&&!v.publishedAt&&v.league===league&&['fifa.world','uefa.euro'].includes(league)&&v.title.includes(String(new Date(date).getUTCFullYear())));
 const saved=await readCatalogue('video').catch(()=>[]);
 let candidates=saved.filter((v:any)=>v.league===league&&eligible(v)),live=true;
 if(!candidates.length){
  const age=Date.now()-Date.parse(date);
  if(age>=0&&age<=62*86400000)candidates=await discoverMatchHighlights(game);
  else{const r=await(isNationalCompetition(league)?nationalVideos(new NextRequest(`https://local/api/national-highlights?competition=${league}&q=${encodeURIComponent(home)}`)):leagueVideos(new NextRequest(`https://local/api/highlights?league=${league}&q=${encodeURIComponent(home)}`)));const d:any=await r.json();candidates=d.matches||[];live=!!d.live;}
 }
 const matches=candidates.filter(eligible).filter((v:any,i:number,a:any[])=>a.findIndex(x=>x.id===v.id)===i).slice(0,12).map((v:any)=>({...v,league,competition:league}));
 let newIds=matches.filter((m:any)=>!saved.some((v:any)=>v.id===m.id)).map((m:any)=>m.id),failure:string|null=null;
 if(newIds.length)try{await saveCatalogue('video',matches)}catch{newIds=[];failure='Highlight metadata could not be saved.'}
 const result={matches,checkedAt:new Date().toISOString(),live,failure};
 await recordHighlightCheck(game,result,newIds).catch(()=>{});
 cache.set(key,{at:Date.now(),data:result});if(cache.size>100)cache.delete(cache.keys().next().value!);
 return Response.json(result);
}
