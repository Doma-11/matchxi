import {fotmobEvents,fotmobLineupUpdates} from '../../fotmob-events';
import {MATCH_LEAGUES,sourceJson,parseEspnDetail,hnlFixtures,providerPage} from '../../match-centre-data';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,league=p.get('league')||'',id=p.get('id')||'';
 if(![...MATCH_LEAGUES,'fifa.worldq.uefa','fifa.friendly'].includes(league)||!/^\d{1,12}$/.test(id))return Response.json({error:'Invalid match'},{status:400});
 if(league==='cro.1'){const game=(await hnlFixtures()).find((g:any)=>String(g.fotmobId)===id);if(!game)return Response.json({error:'Fixture unavailable'},{status:404});let events=null,lineupUpdates=null;try{const url=new URL(game.sourceUrl);url.hash='';url.searchParams.set('matchId',id);const page=await providerPage(url.toString(),p.get('detection')==='kickoff'?5000:p.get('detection')==='second-half'?8000:35000);events=fotmobEvents(page,game);lineupUpdates=fotmobLineupUpdates(page,game)}catch{}return Response.json({game,events:events||[],eventsAvailable:events!==null,lineupUpdates,checkedAt:new Date().toISOString()});}
 const d=parseEspnDetail(await sourceJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${id}`),league);
 return Response.json({game:d.game,events:d.events,eventsAvailable:true,lineupUpdates:d.lineups,checkedAt:d.checkedAt});
}
