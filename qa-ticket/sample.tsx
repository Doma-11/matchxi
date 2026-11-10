import {useLayoutEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {InlineTicketCard} from '../app/match-tickets';
import BackButton from '../app/back-button';
import {canNavigateBack,isAppHistoryEntry,navigationEntry,startMatchBack,resolvedHistoryState} from '../app/navigation-history';
const fixture = {
 version:1 as const,id:'sample:8',season:'2026/27',national:false,favourite:false,countries:[],savedAt:'2026-11-08T12:00:00Z',
 competition:{name:'LaLiga',logo:'/logos/laliga.svg'},
 game:{id:'sample-8',league:'esp.1',date:'2026-11-08T20:00:00Z',completed:true,venue:null,
 home:{name:'Atlético Madrid',score:1,logo:'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png'},
 away:{name:'Barcelona',score:2,logo:'https://a.espncdn.com/i/teamlogos/soccer/500/83.png'}},
 highlights:[{id:'sample',title:'Sample highlights',thumbnail:'/stadium.jpg',url:'https://www.youtube.com/watch?v=MATCHVID001'}]
};
const root={page:'sample',selectedGame:null};
const club={page:'club',selectedGame:null};
const match={page:'club',selectedGame:fixture.game};
function Demo(){
 const [screen,setScreen]=useState<any>(root);
 const target=useRef<any>(null),timer=useRef<any>(null);
 const restore=(state:any)=>{
  const next=resolvedHistoryState(state,target.current);
  if(next!==state)history.replaceState(next,'');
  target.current=null;clearTimeout(timer.current);
  if(isAppHistoryEntry(next))setScreen(next.screen);
 };
 useLayoutEffect(()=>{
  history.replaceState({matchxi:true,screen:root,depth:0,scrollY:0},'');
  const pop=(e:PopStateEvent)=>restore(e.state);
  addEventListener('popstate',pop);
  return()=>removeEventListener('popstate',pop);
 },[]);
 const go=(next:any)=>{
  const {entry}=navigationEntry(history.state,next,0);
  history.pushState(entry,'');setScreen(next);
 };
 const goBack=()=>{
  if(screen.selectedGame)startMatchBack(history,screen,target,timer,restore);
  else if(canNavigateBack(history.state,history.length))history.back();
 };
 return <>
  <section aria-label="Sample navigation" style={{color:'#f4f5ff',marginBottom:16}}>
   {screen.page==='sample'?<button onClick={()=>go(club)}>Open sample club</button>:<>
    <BackButton onClick={goBack} label={screen.selectedGame?'Back to sample club':'Back to sample collection'}/>
    {screen.selectedGame?<span>Sample match</span>:<button onClick={()=>go(match)}>Open sample match</button>}
   </>}
  </section>
  <div className="ticket-grid">{(['current','matchday'] as const).map((design,index)=><InlineTicketCard key={design} ticket={fixture} design={design} autoFlipHint={index===0} onFavourite={()=>{}} onDelete={()=>{}} onMatch={()=>go(match)}/>)}</div>
 </>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
