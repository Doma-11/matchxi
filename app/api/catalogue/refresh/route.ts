import {NextRequest} from '../../../netlify-request';
import {GET as highlights} from '../../highlights/route';
import {GET as nationalHighlights} from '../../national-highlights/route';
import {GET as dashboard} from '../../league-dashboard/route';
import {GET as matches} from '../../matches/route';
import clubs from '../../../../public/data/clubs.json';
import countries from '../../../../public/data/national-teams.json';
import {saveCatalogue} from '../../../catalogue-store';
const cups=['uefa.champions','uefa.europa','uefa.europa.conf'];
const national=['uefa.nations','fifa.world','uefa.euro'];
// This POST handler is intentionally NOT registered in the Netlify API dispatcher.\n// Do not expose it without owner authorization, CSRF protection, and a\n// cross-instance write serialization strategy for the single-snapshot store.
export async function POST(request:Request){
 try{const {league,offset=0}=await request.json() as {league:string;offset?:number};if(!(league in clubs)&&!national.includes(league)&&!cups.includes(league))return Response.json({error:'Unknown league'},{status:400});if(!Number.isInteger(offset)||offset<0||offset>60)return Response.json({error:'Invalid offset'},{status:400});
 const origin=new URL(request.url).origin;let videoCount=0,live=false;let statisticsLive:boolean|null=null;let statisticsCheckedAt:string|null=null;const failures:string[]=[];
 if(offset===0){if(league in clubs||cups.includes(league)){const board=await dashboard(new NextRequest(`${origin}/api/league-dashboard?league=${league}`));const b:any=await board.json();statisticsLive=!!b.live;statisticsCheckedAt=b.dashboard?.checkedAt||null;if(!b.live)failures.push('League standings/statistics');}const r=national.includes(league)?await nationalHighlights(new NextRequest(`${origin}/api/national-highlights?competition=${league}`)):await highlights(new NextRequest(`${origin}/api/highlights?league=${league}`));const d:any=await r.json();if(d.matches){await saveCatalogue('video',d.matches);videoCount=d.matches.length;}live=!!d.live;}
 const teams=(league in clubs?(clubs as any)[league]:(countries as any)[league]||[]);const batch=teams.slice(offset,offset+5);let gameCount=0,successfulTeams=0;
 for(const team of batch){const r=await matches(new NextRequest(`${origin}/api/matches?league=${league}&club=${team.id}`));const d:any=await r.json();if(d.games){await saveCatalogue('game',d.games);gameCount+=d.games.length;successfulTeams++;}else failures.push(team.name);}
 const status={id:league+':'+offset,league,checkedAt:new Date().toISOString(),live,statisticsLive,statisticsCheckedAt,videoCount,gameCount,successfulTeams,failures};await saveCatalogue('status',[status]);return Response.json({...status,nextOffset:offset+5<teams.length?offset+5:null});
 }catch(e){console.error('Catalogue refresh failed',e);return Response.json({error:'Refresh could not be saved; existing catalogue retained'},{status:503});}
}
