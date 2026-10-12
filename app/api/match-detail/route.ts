import {MATCH_LEAGUES,sourceJson,parseEspnDetail,hnlFixtures,addPlayerCoverage,refreshMatchPoll} from '../../match-centre-data';
import {getStore} from '@netlify/blobs';
import {readCatalogue} from '../../catalogue-store';
const cache=new Map<string,{at:number;data:any}>();
export function finalCoverage(data:any,now=Date.now()){
 const complete=!!data.game?.completed;
 const players=(data.lineups||[]).flatMap((l:any)=>l.players||[]);
 if(!complete){for(const p of players){p.rating=null;p.stats=[];delete p.ratingSource;delete p.statsSource;}}
 const starters=players.filter((p:any)=>p.starter),rated=starters.filter((p:any)=>p.rating!=null&&Number.isFinite(Number(p.rating))),withStats=starters.filter((p:any)=>p.stats?.length);
 const ready=complete&&starters.length>=22&&rated.length===starters.length&&withStats.length===starters.length;
 const recent=now-Date.parse(data.game?.date)<48*3600000;
 return {...data,playerDataVersion:7,finalPlayerData:{status:!complete?'after-full-time':ready?'saved':'pending',checkedAt:new Date(now).toISOString(),ratedStarters:rated.length,starters:starters.length,playersWithStats:withStats.length,nextCheckAt:complete&&!ready?new Date(now+(recent?15*60000:7*86400000)).toISOString():null,source:data.playerSource||'ESPN',failure:data.playerCoverageFailure||null},playerDataNotice:!complete?'Final player ratings and individual statistics appear after full time.':ready?'Final player ratings and statistics saved.':'Final player data is incomplete or not published by the available source. Saved values are retained; delayed data will be checked again.'};
}
async function savedWithPoll(saved:any,store:any,key:string){await refreshMatchPoll(saved);return saved;}

export async function GET(request:Request){
 const p=new URL(request.url).searchParams,league=p.get('league')||'',id=p.get('id')||'';
 if(![...MATCH_LEAGUES,'fifa.worldq.uefa','fifa.friendly'].includes(league)||!/^\d{1,12}$/.test(id))return Response.json({error:'Invalid match'},{status:400});
 const key=league+':'+id,store=getStore({name:'touchline-match-details',consistency:'strong'});
 const saved:any=await store.get(key,{type:'json'}).catch(()=>null);
 if(saved?.playerDataVersion>=7&&saved.game?.completed&&(saved.finalPlayerData?.status==='saved'||saved.playerDataVersion===7&&Date.parse(saved.finalPlayerData?.nextCheckAt)>Date.now()))return Response.json(await savedWithPoll(saved,store,key));
 if(saved?.game?.completed&&Date.parse(saved.statsUpgradeRetryAt)>Date.now())return Response.json(await savedWithPoll(saved,store,key));
 const old=cache.get(key);if(old&&Date.now()-old.at<20000)return Response.json(old.data);
 try{
  let base:any;
  if(league==='cro.1'){
   const fixtures=await hnlFixtures();let game=fixtures.find((g:any)=>String(g.fotmobId)===id);
   if(!game){const original=(await readCatalogue('game')).find((g:any)=>g.league===league&&String(g.id)===id);if(original){const matches=fixtures.filter((g:any)=>String(g.home.id)===String(original.home.id)&&String(g.away.id)===String(original.away.id)&&Math.abs(Date.parse(g.date)-Date.parse(original.date))<6*3600000);if(matches.length===1)game={...matches[0],id:original.id};}}
   if(!game)return Response.json({error:'Croatian fixture not found in the current source.'},{status:404});
   base={game,lineups:[],statistics:[],events:[],standings:[],source:'FotMob',sourceUrl:game.sourceUrl,checkedAt:new Date().toISOString(),live:true};
  }else base=parseEspnDetail(await sourceJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${id}`),league);
  const enriched=await addPlayerCoverage(base);
  // A failed retry must not erase player values already collected after full time.
  if(base.game.completed&&saved?.game?.completed){for(const l of enriched.lineups||[]){const prior=saved.lineups?.find((x:any)=>x.side===l.side);for(const player of l.players||[]){const oldPlayer=prior?.players?.find((x:any)=>String(x.id)===String(player.id));if(!oldPlayer)continue;if(player.rating==null&&oldPlayer.rating!=null){player.rating=oldPlayer.rating;player.ratingSource=oldPlayer.ratingSource;}if(!player.stats?.length&&oldPlayer.stats?.length){player.stats=oldPlayer.stats;player.statsSource=oldPlayer.statsSource;}}}if(!enriched.lineups?.length&&saved.lineups?.length)enriched.lineups=saved.lineups;}
  const data=finalCoverage(enriched);data.pollLookupCheckedAt=new Date().toISOString();
  if(saved?.game?.completed&&saved.playerDataVersion<7&&!enriched.lineups?.some((l:any)=>l.players?.some((p:any)=>p.stats?.some((s:any)=>Object.hasOwn(s,'total'))))){data.playerDataVersion=saved.playerDataVersion;(data as any).statsUpgradeRetryAt=new Date(Date.now()+86400000).toISOString();}
  cache.set(key,{at:Date.now(),data});if(cache.size>100)cache.delete(cache.keys().next().value!);
  await store.setJSON(key,data).catch(()=>{});return Response.json(data);
 }catch{if(saved?.game?.completed&&saved.playerDataVersion<7){saved.statsUpgradeRetryAt=new Date(Date.now()+86400000).toISOString();await store.setJSON(key,saved).catch(()=>{});}return saved?Response.json({...(saved.game?.completed?saved:finalCoverage(saved)),live:false,notice:'Source unavailable. Showing the saved match data.'}):Response.json({error:'Detailed data has not been published or the source is temporarily unavailable.'},{status:502});}
}
