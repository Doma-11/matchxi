import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Ticket,Check,Star,ArrowLeftRight,ArrowUpRight,ExternalLink,Play,Trash2,X,Monitor,ArrowLeft} from 'lucide-react';
import QRCode from 'qrcode';
import {streamCompetition} from './stream-competition';
import {TICKET_KEY,TICKET_EVENT,ticketId,readTickets,saveMatchTicket,removeMatchTicket,favouriteTicket,filterTickets,type MatchTicket} from './match-tickets-store';
import './match-tickets.css';
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
export const ticketQrOptions={width:200,margin:4,errorCorrectionLevel:'M' as const,color:{dark:'#fff2ceff',light:'#00000000'}};
export function HighlightQR({url}:{url:string}){
 const [src,setSrc]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setSrc('');setError(false);QRCode.toDataURL(url,ticketQrOptions).then(data=>{if(active)setSrc(data)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[url]);
 return <div className="ticket-qr">{src?<img src={src} alt="QR code linking to the saved match highlights"/>:<span>{error?'QR unavailable':'Preparing QR…'}</span>}<small>Scan highlights</small></div>;
}
export function InlineTicketCard({ticket,onFavourite,onDelete,onMatch,design='current',autoFlipHint=false,onHintStarted}:{autoFlipHint?:boolean;onHintStarted?:()=>void;design?:TicketDesign;ticket:MatchTicket;onFavourite:()=>void;onDelete:()=>void;onMatch:(g:any)=>void}){
 const [back,setBack]=useState(false),[chosen,setChosen]=useState(''),[confirm,setConfirm]=useState(false);
 const frontFlip=useRef<HTMLButtonElement>(null),backFlip=useRef<HTMLButtonElement>(null),keep=useRef<HTMLButtonElement>(null),didFlip=useRef(false);
 const video=ticket.highlights.find(v=>v.id===chosen)||ticket.highlights[0],g=ticket.game,name=`${g.home.name} vs ${g.away.name}`;
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
 return <article className={"ticket-collection-item ticket-flip-stage ticket-design-"+design} aria-label={name+' match ticket'} onPointerDownCapture={stopHint} onKeyDownCapture={stopHint} onFocusCapture={stopHint} style={palette(ticket)} data-competition={g.league}><div className={'ticket-flip-inner'+(back?' is-flipped':'')}>
 <div className="virtual-ticket ticket-front ticket-compact" aria-hidden={back} inert={back}><div className="ticket-front-content" inert={confirm}><button className="ticket-flip-hit" ref={frontFlip} type="button" onClick={flip} aria-label={'Flip ticket: '+name+' to highlights'} aria-pressed={back}/><div className="ticket-main"><div className="ticket-heading">{ticket.competition.logo&&<span className="ticket-competition-mark"><img src={ticket.competition.logo} alt=""/></span>}<span>{ticket.competition.name}</span>{design==='matchday'&&<small className="ticket-pass-label">MATCHDAY PASS · KEEPSAKE</small>}<time dateTime={g.date}>{dateLabel(g.date)}</time></div><div className="ticket-teams"><div><Badge team={g.home}/><strong>{g.home.name}</strong></div><div className="ticket-score"><b>{score}</b><small>{g.completed?(score==='VS'?'Final score unavailable':'FULL TIME'):'FINAL SCORE PENDING'}</small></div><div><Badge team={g.away}/><strong>{g.away.name}</strong></div></div><div className="ticket-foot"><span className="ticket-watched"><Monitor size={12}/>Watched live</span><button type="button" onClick={()=>onMatch(g)} aria-label={'Return to match: '+name}><ArrowUpRight size={13}/>Return to Match</button><button type="button" className="ticket-remove" onClick={()=>setConfirm(true)} aria-label={'Delete ticket: '+name}><Trash2 size={13}/>Delete ticket</button></div></div><div className="ticket-stub">{video?<HighlightQR url={video.url}/>:<div className="ticket-qr-pending"><Ticket size={27}/><span>QR pending</span></div>}</div><button className={'ticket-favourite'+(ticket.favourite?' is-favourite':'')} type="button" aria-label={'Favourite '+name} aria-pressed={ticket.favourite} onClick={onFavourite}><Star size={16} fill={ticket.favourite?'currentColor':'none'}/></button></div>{confirm&&<div className="ticket-delete-confirm" role="group" aria-label={'Confirm deletion: '+name}><p role="alert">Delete this ticket from this device?</p><div><button type="button" ref={keep} onClick={()=>{setConfirm(false);frontFlip.current?.focus()}}>Keep ticket</button><button type="button" className="ticket-danger" onClick={onDelete}>Delete permanently</button></div></div>}</div>
 <div className="virtual-ticket ticket-back" aria-hidden={!back} inert={!back}><div className="ticket-back-video">{video?<><a className="ticket-highlight-preview" href={video.url} target="_blank" rel="noopener noreferrer" aria-label={'Watch saved highlights on YouTube: '+name}><img src={video.thumbnail} alt="" loading="lazy"/><span className="ticket-play-icon"><Play size={26} fill="currentColor"/></span><strong>{video.title}</strong></a>{ticket.highlights.length>1&&<label className="ticket-video-choice"><span className="sr-only">Saved video</span><select aria-label={'Saved highlight video: '+name} value={video.id} onChange={e=>setChosen(e.target.value)}>{ticket.highlights.map(v=><option key={v.id} value={v.id}>{v.publisher} · {v.title}</option>)}</select></label>}</>:<div className="ticket-highlights-pending"><Play size={28}/><h3>Highlights pending</h3><p>Added from the app’s existing catalogue when available.</p></div>}</div><aside className="ticket-back-details"><span className="ticket-back-round">MATCHDAY<strong>{g.matchday??'—'}</strong>{!g.matchday&&<small>Not available</small>}</span>{video&&<a className="ticket-youtube-link" href={video.url} target="_blank" rel="noopener noreferrer">Open on YouTube<ExternalLink size={13}/></a>}<button type="button" className="ticket-back-flip" ref={backFlip} onClick={flip} aria-label={'Flip ticket: '+name+' to front'}><ArrowLeftRight size={15}/>Ticket front</button><span className="ticket-back-season">{ticket.season}</span></aside></div>
 </div></article>;
}
export default function MatchTickets({onMatch,onBrowse,showFlipHint=false}:any){
 const {tickets,error,act}=useTickets(),[kind,setKind]=useState('all'),[notice,setNotice]=useState('');
 const {design,error:designError}=useTicketDesign();
 const hinted=useRef(false);
 const filtered=filterTickets(tickets,{kind});
 return <section className="ticket-collection"><header className="ticket-collection-heading"><div><h1><Ticket/>My match tickets</h1><p>Your football memories. Yours to keep.</p></div></header><nav className="ticket-kind-filters" aria-label="Ticket collection filters">{[['all','All'],['clubs','Club'],['national','National Teams'],['favourites','Favourites']].map(([id,label])=><button key={id} type="button" aria-pressed={kind===id} onClick={()=>setKind(id)}>{id==='favourites'&&<Star size={14}/>} {label}</button>)}</nav>{(error||designError)&&<p className="ticket-notice ticket-error" role="alert">{error||designError}</p>}{notice&&<p className="ticket-notice" role="status">{notice}<button type="button" aria-label="Dismiss ticket notice" onClick={()=>setNotice('')}><X size={14}/></button></p>}{filtered.length?<div className="ticket-grid">{filtered.map((ticket,index)=><InlineTicketCard key={ticket.id} ticket={ticket} autoFlipHint={showFlipHint&&!hinted.current&&index===0} onHintStarted={()=>{hinted.current=true}} design={design} onMatch={onMatch} onFavourite={()=>act(()=>{favouriteTicket(ticket.id,!ticket.favourite)})} onDelete={()=>{if(act(()=>{removeMatchTicket(ticket.id)}))setNotice('Ticket deleted from this device.');}}/>)}</div>:<div className="ticket-empty"><Ticket size={48}/><h2>{tickets.length?'No tickets in this category':'Your first match belongs here.'}</h2><p>{tickets.length?'Choose another category above.':'Open a live match’s Broadcast tab and mark “I watched this.” Your ticket will be waiting here.'}</p>{!tickets.length&&<button type="button" onClick={onBrowse}><ArrowLeft size={16}/>Browse matches</button>}</div>}</section>;
}
