import {NextRequest,NextResponse} from '../../netlify-request';
const leagues:Record<string,number>={'eng.1':39,'esp.1':140,'ita.1':135,'ger.1':78,'cro.1':210};
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,league=p.get('league')||'eng.1',type=p.get('type')||'teams',season=p.get('season')||'2026',id=p.get('id');
 if(!leagues[league]||!/^20\d{2}$/.test(season)||(id&&!/^\d{1,12}$/.test(id)))return NextResponse.json({error:'Invalid request'},{status:400});
 const key=req.headers.get('x-football-key');let url='',headers:Record<string,string>={};
 if(key){headers['x-apisports-key']=key;const root='https://v3.football.api-sports.io/';
 const routes:Record<string,string>={teams:`teams?league=${leagues[league]}&season=${season}`,matches:`fixtures?league=${leagues[league]}&season=${season}`,standings:`standings?league=${leagues[league]}&season=${season}`,squad:`players/squads?team=${id}`,coaches:`coachs?team=${id}`,player:`players?id=${id}&season=${season}`};url=root+(routes[type]||routes.teams);
 }else{const root=`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/`;const routes:Record<string,string>={teams:'teams?limit=1000',matches:`scoreboard?dates=${p.get('date')?.replace(/[^0-9]/g,'')||new Date().toISOString().slice(0,10).replaceAll('-','')}&limit=100`,squad:`teams/${id}/roster`,standings:`standings?season=${Number(season)+1}`};if(!routes[type])return NextResponse.json({error:'Connect API-Football to access managers and historical player statistics.'},{status:422});url=root+routes[type];}
 try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Football provider is currently unavailable.');const data:any=await r.json();if(data.errors&&Object.keys(data.errors).length)throw Error(Object.values(data.errors).join(' '));return NextResponse.json({provider:key?'api-football':'espn',data,fetchedAt:new Date().toISOString()});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to load data'},{status:502});}
}
