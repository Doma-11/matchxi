import {createRoot} from 'react-dom/client';
import {InlineTicketCard} from '../app/match-tickets';
import clubs from '../public/data/clubs.json';
const clubsByName = Object.values(clubs).flat();
const fixtures = [
 ['eng.1','Premier League','premier-league.svg','Liverpool','Everton',2,1],
 ['eng.1','Premier League','premier-league.svg','Arsenal','Chelsea',3,1],
 ['esp.1','LaLiga','laliga.svg','Real Madrid','Barcelona',2,1],
 ['esp.1','LaLiga','laliga.svg','Atlético Madrid','Sevilla',2,0],
 ['ger.1','Bundesliga','bundesliga.svg','Bayern Munich','Borussia Dortmund',2,1],
 ['ger.1','Bundesliga','bundesliga.svg','Borussia Dortmund','RB Leipzig',3,1],
 ['ita.1','Serie A','serie-a.svg','Internazionale','Como',2,0],
 ['ita.1','Serie A','serie-a.svg','AS Roma','Lazio',1,0],
 ['ita.1','Serie A','serie-a.svg','Napoli','Juventus',1,1],
 ['uefa.champions','Champions League','champions-league.svg','Liverpool','Real Madrid',1,0],
 ['uefa.nations','Nations League','nations-league.svg','Croatia','Spain',1,0],
] as const;
const team=(name:string,score:number)=>({...clubsByName.find(t=>t.name===name),name,score});
const cards=fixtures.map(([league,name,logo,home,away,homeScore,awayScore],i)=>({
 version:1 as const,id:'sample:'+i,countries:[],season:'2026/27',national:league==='uefa.nations',favourite:false,savedAt:'2026-11-08T12:00:00Z',
 competition:{name,logo:'/logos/'+logo},
 game:{id:'sample-'+i,league,date:'2026-11-08T20:00:00Z',completed:true,venue:league==='uefa.nations'?'Poljud, Split':null,home:team(home,homeScore),away:team(away,awayScore)},
 highlights:i===5?[]:[{id:'sample',title:'Sample highlights',thumbnail:'/stadium.jpg',url:'https://www.youtube.com/watch?v=MATCHVID001'}],
}));
createRoot(document.getElementById('root')!).render(<div className="ticket-grid">{cards.map(ticket=><InlineTicketCard key={ticket.id} ticket={ticket} design="matchday" onFavourite={()=>{}} onDelete={()=>{}} onMatch={()=>{}}/>)}</div>);
