import {ticketSeating} from './matchday-seating';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Ticket,Check,Star,ArrowUpRight,Play,Trash2,X,Monitor,ArrowLeft} from 'lucide-react';
import QRCode from 'qrcode';
import {streamCompetition} from './stream-competition';
import {TICKET_KEY,TICKET_EVENT,ticketId,readTickets,saveMatchTicket,removeMatchTicket,favouriteTicket,filterTickets,type MatchTicket} from './match-tickets-store';
import './match-tickets.css';
import './matchday-keepsake.css';
import {homeStadiumArt,STADIUMLESS_CUPS} from './stadium-art';
import {useTicketDesign,type TicketDesign} from './match-ticket-design';

export function useTickets(){
 const [tickets,setTickets]=useState<MatchTicket[]>([]),[error,setError]=useState('');
 useEffect(()=>{const refresh=()=>{try{setTickets(readTickets());setError('')}catch(e:any){setError(e.message)}};const changed=(e:StorageEvent)=>{if(e.key===TICKET_KEY||e.key===null)refresh()};refresh();window.addEventListener(TICKET_EVENT,refresh);window.addEventListener('storage',changed);return()=>{window.removeEventListener(TICKET_EVENT,refresh);window.removeEventListener('storage',changed)}},[]);
 const act=(work:()=>void)=>{try{work();setError('');return true}catch(e:any){setError(e.message||'Your ticket could not be saved.');return false}};
 return {tickets,error,act,setError};
}
export function WatchedTicketControl({game,videos=[],onCollection}:any){
 const {tickets,error,act}=useTickets(),saved=tickets.some(t=>t.id===ticketId(game));
 return <div className="watched-ticket-control"><label><input type="checkbox" checked={saved} disabled={saved} onChange={e=>{if(e.target.checked)act(()=>{saveMatchTicket(game,videos)})}}/><span className="watched-ticket-icon"><Ticket size={23}/></span><span><strong>I watched this.</strong><small>{saved?'Saved to My match tickets':game.completed?'Save your virtual match ticket':'Save a ticket now. The final score will follow.'}</small></span>{saved&&<Check size={20}/>}</label>{saved&&<button type="button" onClick={()=>{if(onCollection)onCollection();else window.dispatchEvent(new Event('matchxi-open-tickets'))}}>My match tickets<ArrowUpRight size={15}/></button>}{error&&<p role="alert">{error}</p>}</div>;
}
const dateLabel=(date:string)=>new Date(date).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
function palette(ticket:MatchTicket):CSSProperties{const theme=ticket.national&&['fifa.friendly','fifa.worldq.uefa'].includes(ticket.game.league)?{brand:'#a11232',accent:'#f8c5a0',surface:'#340b21'}:streamCompetition(ticket.game.league,true);return {'--ticket-brand':theme.brand,'--ticket-accent':theme.accent,'--ticket-surface':theme.surface} as CSSProperties;}
function Badge({team}:any){const [failed,setFailed]=useState(false);return team.logo&&!failed?<img src={team.logo} alt="" onError={()=>setFailed(true)}/>:<span className="ticket-crest-fallback">{team.name.slice(0,2)}</span>}
const leagueStadiumTreatments: Record<string, 'panorama' | 'emboss' | 'stub' | 'frame'> = {
 'eng.1': 'panorama',
 'esp.1': 'emboss',
 'ger.1': 'stub',
 'ita.1': 'frame',
};

export function ticketPassArtwork(league: string) {
 if (STADIUMLESS_CUPS.has(league)) return 'competition';
 return leagueStadiumTreatments[league] ?? 'stadium';
}

const venueFrames: Record<string, string> = {
 '/stadiums/san-siro-exterior-v2.webp': '/stadiums/frames/san-siro.svg',
 '/stadiums/as-roma-outline-v1.webp': '/stadiums/frames/stadio-olimpico.svg',
};
export function ticketReference(ticket:MatchTicket){
 const codes:Record<string,string>={'eng.1':'PL','esp.1':'LL','ita.1':'SA','ger.1':'BL','cro.1':'HNL','uefa.champions':'UCL','uefa.europa':'UEL','uefa.europa.conf':'UECL','uefa.nations':'UNL','fifa.world':'WC','uefa.euro':'EURO','fifa.friendly':'INT','fifa.worldq.uefa':'WCQ'};
 return `${codes[ticket.game.league]||'MXI'}-${ticket.game.id}`;
}
export function HomeStadiumArt({ticket, art = homeStadiumArt(ticket)}: {
 ticket: MatchTicket;
 art?: ReturnType<typeof homeStadiumArt>;
}) {
 const [failed, setFailed] = useState<string[]>([]);
 if (!art) return null;

 const venueFrame = ticketPassArtwork(ticket.game.league) === 'frame' ? venueFrames[art.src] : undefined;
 const frame = venueFrame && !failed.includes(venueFrame) ? venueFrame : undefined;
 const src = frame ?? art.src;
 if (failed.includes(src)) return null;

 return (
  <div className="ticket-home-stadium-art" data-venue-frame={frame ? 'true' : undefined} aria-hidden="true">
   <img
    src={src}
    alt=""
    width={512}
    height={340}
    loading="lazy"
    decoding="async"
    fetchPriority="low"
    onError={() => setFailed(previous => [...previous, src])}
   />
  </div>
 );
}

export function passCompetitionLogo(ticket:MatchTicket){return ticket.game.league==='uefa.nations'?'/logos/nations-league-ticket.svg':ticket.competition.logo}

export function PassFront({ticket, score, video}: {ticket: MatchTicket; score: string; video?: {url: string}}) {
 const game = ticket.game;
 const stadium = homeStadiumArt(ticket);
 const seating = ticketSeating(ticket);
 const logo = passCompetitionLogo(ticket);
 const art = <HomeStadiumArt ticket={ticket} art={stadium}/>;
 const stadiumOnStub = ticketPassArtwork(game.league) === 'stub';

 return <>
  <div className="ticket-main ticket-pass-main">
   <header className="ticket-pass-heading">
    <div className="ticket-pass-competition">
     {logo ? <img src={logo} alt={ticket.competition.name}/> : <strong>{ticket.competition.name}</strong>}
    </div>
    <div className="ticket-pass-masthead">
     <span>MATCHDAY</span>
     <b>{game.completed ? 'FULL TIME' : 'SCORE PENDING'}</b>
    </div>
   </header>
   <time className="ticket-pass-date" dateTime={game.date}>
    {new Date(game.date).toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short', year:'numeric'})}
   </time>
   <div className="ticket-teams ticket-pass-teams">
    <div><Badge team={game.home}/><strong>{game.home.name}</strong></div>
    <div className="ticket-score"><b>{score}</b></div>
    <div><Badge team={game.away}/><strong>{game.away.name}</strong></div>
   </div>
   <div className="ticket-pass-venue"><span>{game.venue || stadium?.name || 'Virtual matchday ticket'}</span></div>
   <div className="ticket-pass-facts" aria-label="Decorative row and seat">
    <span>ROW <b>{seating.row}</b></span>
    <span>SEAT <b>{seating.seat}</b></span>
   </div>
   {!stadiumOnStub && art}
  </div>
  <aside className="ticket-stub ticket-pass-stub">
   <small className="ticket-pass-reference">REF. {ticketReference(ticket)}</small>
   {video ? <HighlightQR url={video.url}/> : <div className="ticket-qr-pending"><Ticket size={25}/><span>Highlights pending</span></div>}
   <strong className="ticket-pass-stub-title">MATCHDAY</strong>
   {stadiumOnStub && art}
   <span className="ticket-pass-stub-season">{ticket.season}</span>
  </aside>
 </>;
}
export const ticketQrOptions={width:200,margin:4,errorCorrectionLevel:'M' as const,color:{dark:'#fff2ceff',light:'#00000000'}};
export function HighlightQR({url}:{url:string}){
 const [src,setSrc]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setSrc('');setError(false);QRCode.toDataURL(url,ticketQrOptions).then(data=>{if(active)setSrc(data)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[url]);
 return <div className="ticket-qr">{src?<img src={src} alt="QR code linking to the saved match highlights"/>:<span>{error?'QR unavailable':'Preparing QR…'}</span>}<small>Scan highlights</small></div>;
}
export function InlineTicketCard({ticket,onFavourite,onDelete,onMatch,design='current',autoFlipHint=false,onHintStarted}:{autoFlipHint?:boolean;onHintStarted?:()=>void;design?:TicketDesign;ticket:MatchTicket;onFavourite:()=>void;onDelete:()=>void;onMatch:(g:any)=>void}){
 const [back,setBack]=useState(false),[confirm,setConfirm]=useState(false);
 const frontFlip=useRef<HTMLButtonElement>(null),backFlip=useRef<HTMLButtonElement>(null),keep=useRef<HTMLButtonElement>(null),didFlip=useRef(false);
 const video=ticket.highlights[0],g=ticket.game,name=`${g.home.name} vs ${g.away.name}`;
 const score=g.completed&&g.home.score!=null&&g.away.score!=null?`${g.home.score} – ${g.away.score}`:'VS';
 useEffect(()=>{if(didFlip.current)(back?backFlip:frontFlip).current?.focus()},[back]);
 useEffect(()=>{if(confirm)keep.current?.focus()},[confirm]);
 // The hint shares the manual 3D state, but never moves keyboard focus.
 const hintTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const stopHint=()=>{hintTimers.current.forEach(clearTimeout);hintTimers.current=[]};
 useEffect(()=>{
  if(!autoFlipHint)return;
  onHintStarted?.();
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  hintTimers.current=[setTimeout(()=>setBack(true),550),setTimeout(()=>{setBack(false);hintTimers.current=[]},1550)];
  const hidden=()=>{if(hintTimers.current.length&&document.visibilityState==='hidden'){stopHint();setBack(false)}};
  document.addEventListener('visibilitychange',hidden);
  return()=>{stopHint();document.removeEventListener('visibilitychange',hidden)};
 // Each card consumes its entry hint on mount; catalogue updates cannot interrupt it.
 },[]);
 const flip=()=>{stopHint();didFlip.current=true;setBack(b=>!b)};
 return <article className={"ticket-collection-item ticket-flip-stage ticket-design-"+design} aria-label={name+' match ticket'} onPointerDownCapture={stopHint} onKeyDownCapture={stopHint} onFocusCapture={stopHint} style={palette(ticket)} data-competition={g.league} data-pass-art={design==='matchday'?ticketPassArtwork(g.league):undefined} data-ticket-national={ticket.national?'true':'false'}><div className={'ticket-flip-inner'+(back?' is-flipped':'')}>
 <div className="virtual-ticket ticket-front ticket-compact" aria-hidden={back} inert={back}><div className="ticket-front-content" inert={confirm}><button className="ticket-flip-hit" ref={frontFlip} type="button" onClick={flip} aria-label={'Flip ticket: '+name+' to highlights'} aria-pressed={back}/>{design==='matchday'?<PassFront ticket={ticket} score={score} video={video}/>:<><div className="ticket-main"><div className="ticket-heading">{ticket.competition.logo&&<span className="ticket-competition-mark"><img src={ticket.competition.logo} alt=""/></span>}<span>{ticket.competition.name}</span><time dateTime={g.date}>{dateLabel(g.date)}</time></div><div className="ticket-teams"><div><Badge team={g.home}/><strong>{g.home.name}</strong></div><div className="ticket-score"><b>{score}</b><small>{g.completed?(score==='VS'?'Final score unavailable':'FULL TIME'):'FINAL SCORE PENDING'}</small></div><div><Badge team={g.away}/><strong>{g.away.name}</strong></div></div><div className="ticket-foot"><span className="ticket-watched"><Monitor size={12}/>Watched live</span><button type="button" onClick={()=>onMatch(g)} aria-label={'Return to match: '+name}><ArrowUpRight size={13}/>Return to Match</button><button type="button" className="ticket-remove" onClick={()=>setConfirm(true)} aria-label={'Delete ticket: '+name}><Trash2 size={13}/>Delete ticket</button></div></div><div className="ticket-stub">{video?<HighlightQR url={video.url}/>:<div className="ticket-qr-pending"><Ticket size={27}/><span>QR pending</span></div>}</div><button className={'ticket-favourite'+(ticket.favourite?' is-favourite':'')} type="button" aria-label={'Favourite '+name} aria-pressed={ticket.favourite} onClick={onFavourite}><Star size={16} fill={ticket.favourite?'currentColor':'none'}/></button></>}</div>{confirm&&<div className="ticket-delete-confirm" role="group" aria-label={'Confirm deletion: '+name}><p role="alert">Delete this ticket from this device?</p><div><button type="button" ref={keep} onClick={()=>{setConfirm(false);frontFlip.current?.focus()}}>Keep ticket</button><button type="button" className="ticket-danger" onClick={onDelete}>Delete permanently</button></div></div>}</div>
 <div className="virtual-ticket ticket-back" aria-hidden={!back} inert={!back}>
  {video ? (
   <a
    className="ticket-highlight-preview"
    href={video.url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={'Watch saved highlights on YouTube: '+name}
   >
    <img src={video.thumbnail} alt="" loading="lazy"/>
    <span className="ticket-highlight-label">
     <Play size={20} fill="currentColor" aria-hidden="true"/>
     <span>Watch on YouTube</span>
    </span>
   </a>
  ) : (
   <div className="ticket-highlights-pending">Highlights pending</div>
  )}
  <button
   type="button"
   className="ticket-back-flip"
   ref={backFlip}
   onClick={flip}
   aria-label={'Flip ticket: '+name+' to front'}
  >
   <ArrowLeft size={16} aria-hidden="true"/>
   Ticket front
  </button>
 </div>
 </div>{design==='matchday'&&<div className="ticket-pass-actions" aria-hidden={back} inert={back}><button type="button" onClick={()=>onMatch(g)} aria-label={'Return to match: '+name}><ArrowUpRight size={15}/>Return to Match</button><button type="button" onClick={()=>setConfirm(true)} aria-label={'Delete ticket: '+name}><Trash2 size={15}/>Delete Ticket</button><button className={ticket.favourite?'is-favourite':''} type="button" aria-label={'Favourite '+name} aria-pressed={ticket.favourite} onClick={onFavourite}><Star size={16} fill={ticket.favourite?'currentColor':'none'}/></button></div>}</article>;
}
export default function MatchTickets({onMatch,onBrowse,showFlipHint=false}:any){
 const {tickets,error,act}=useTickets(),[kind,setKind]=useState('all'),[notice,setNotice]=useState('');
 const {design,error:designError}=useTicketDesign();
 const hinted=useRef(false);
 const filtered=filterTickets(tickets,{kind});
 return <section className="ticket-collection"><header className="ticket-collection-heading"><div><h1><Ticket/>My match tickets</h1><p>Your football memories. Yours to keep.</p></div></header><nav className="ticket-kind-filters" aria-label="Ticket collection filters">{[['all','All'],['clubs','Club'],['national','National Teams'],['favourites','Favourites']].map(([id,label])=><button key={id} type="button" aria-pressed={kind===id} onClick={()=>setKind(id)}>{id==='favourites'&&<Star size={14}/>} {label}</button>)}</nav>{(error||designError)&&<p className="ticket-notice ticket-error" role="alert">{error||designError}</p>}{notice&&<p className="ticket-notice" role="status">{notice}<button type="button" aria-label="Dismiss ticket notice" onClick={()=>setNotice('')}><X size={14}/></button></p>}{filtered.length?<div className="ticket-grid">{filtered.map((ticket,index)=><InlineTicketCard key={ticket.id} ticket={ticket} autoFlipHint={showFlipHint&&!hinted.current&&index===0} onHintStarted={()=>{hinted.current=true}} design={design} onMatch={onMatch} onFavourite={()=>act(()=>{favouriteTicket(ticket.id,!ticket.favourite)})} onDelete={()=>{if(act(()=>{removeMatchTicket(ticket.id)}))setNotice('Ticket deleted from this device.');}}/>)}</div>:<div className="ticket-empty"><Ticket size={48}/><h2>{tickets.length?'No tickets in this category':'Your first match belongs here.'}</h2><p>{tickets.length?'Choose another category above.':'Open a live match’s Broadcast tab and mark “I watched this.” Your ticket will be waiting here.'}</p>{!tickets.length&&<button type="button" onClick={onBrowse}><ArrowLeft size={16}/>Browse matches</button>}</div>}</section>;
}
