import {createRoot} from 'react-dom/client';
import {InlineTicketCard} from '../app/match-tickets';
import clubs from '../public/data/clubs.json';
const teams = Object.values(clubs).flat();
const fixture = (home: string, away: string, league: string, index: number) => ({
 version:1 as const,id:'qa:'+index,season:'2026/27',national:false,favourite:false,
 countries:[],savedAt:'2026-11-08T12:00:00Z',
 competition:{name:league==='ita.1'?'Serie A':'Premier League',logo:league==='ita.1'?'/logos/serie-a.svg':'/logos/premier-league.svg'},
 game:{id:'qa-'+index,league,date:'2026-11-08T20:00:00Z',completed:true,venue:league==='ita.1'?'San Siro':'Old Trafford',
 home:{...teams.find(t=>t.name===home),name:home,score:2},
 away:{...teams.find(t=>t.name===away),name:away,score:1}},
 highlights:index===2?[]:[{id:'sample',title:'Sample highlights',thumbnail:'/stadium.jpg',url:'https://www.youtube.com/watch?v=MATCHVID001'}]
});
createRoot(document.getElementById('root')!).render(<div className="ticket-grid">
 {(['matchday','current'] as const).flatMap(design=>[
  fixture('Internazionale','Como','ita.1',0),
  fixture('Manchester United','Tottenham Hotspur','eng.1',1),
  fixture('A'.repeat(150),'Brighton & Hove Albion','eng.1',2)
 ].map(ticket=><InlineTicketCard key={design+ticket.id} ticket={ticket} design={design} onFavourite={()=>{}} onDelete={()=>{}} onMatch={()=>{}}/>))}
</div>);
