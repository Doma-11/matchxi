'use client';
import {useState,useEffect,useRef,type CSSProperties} from 'react';
import {ExternalLink,Play,X} from 'lucide-react';
import {Dialog} from 'radix-ui';
import {LEAGUES,CLUB_CUPS,COMPETITIONS} from './football-model';
import {streamBrowserLink,isAppleMobile} from './stream-browser-link';
export default function MatchStreamPanel({game}:any){
 const [result,setResult]=useState<any>(null),[busy,setBusy]=useState(false),[player,setPlayer]=useState<any>(null),[opening,setOpening]=useState(false);
 const opener=useRef<HTMLButtonElement|null>(null),competition=[...LEAGUES,...CLUB_CUPS,...COMPETITIONS].find(c=>c.id===game.league);
 const modalStyle={'--accent':competition?.accent||'#5cd49d'} as CSSProperties;
 const savedKey='touchline-streams-'+game.league+'-'+game.id+'-'+game.date;
 const live=game.state==='in'&&!game.completed;
 const fetchListings=async(signal?:AbortSignal)=>{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date(game.date));
  const p=new URLSearchParams({home:game.home.name,away:game.away.name,date,live:'true',id:String(game.id),league:game.league});
  const r=await fetch('/api/match-streams?'+p,{signal});const found:any=await r.json();
  if(signal?.aborted)return;
  setResult(found);if(found?.streams?.length)try{localStorage.setItem(savedKey,JSON.stringify(found));}catch{}
 };
 useEffect(()=>{
  const abort=new AbortController();setPlayer(null);setResult(null);
  if(!live){setBusy(false);return;}
  try{const saved=JSON.parse(localStorage.getItem(savedKey)||'null');if(saved?.streams?.length){setResult(saved);setBusy(false);return;}}catch{}
  setBusy(true);
  fetchListings(abort.signal).catch(()=>{if(!abort.signal.aborted)setResult({error:'Streams could not be checked. Please try again.'});}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
  return()=>abort.abort();
 },[savedKey,live]);
 const play=async(stream:any)=>{if(opening||!live)return;setOpening(true);setPlayer(null);try{const key='touchline-stream-player-'+stream.url;let saved:any=null;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}if(!saved){const r=await fetch('/api/stream-player?'+new URLSearchParams({url:stream.url}));saved=await r.json();if(saved.embedAllowed)try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}setPlayer(saved);}catch{setPlayer({error:'Could not open this player. Use the external link.'});}finally{setOpening(false);}};
 const check=async()=>{if(busy||!live||result?.streams?.length)return;setBusy(true);try{await fetchListings();}catch{setResult({error:'Streams could not be checked. Please try again.'});}finally{setBusy(false);}};
 const ua=typeof navigator!=='undefined'?navigator.userAgent:'',touch=typeof navigator!=='undefined'?navigator.maxTouchPoints:0;
 const apple=isAppleMobile(ua,touch),mobile=apple||/Android/i.test(ua);
 const href=(url:string)=>streamBrowserLink(url,ua,touch);

 return <section className="match-stream-panel"><header className="stream-section-heading"><h2>Livestream</h2><span className="stream-live-badge">LIVE</span></header>{live?<>
 {busy&&<p role="status">Finding streams…</p>}
 {result?.error&&<p role="status">{result.error}</p>}
 {result?.streams?.length>0?<>
 <div className="stream-links">{result.streams.map((s:any,i:number)=><article className="stream-link-choice" key={s.url}>
 <span className="stream-card-label">Stream {i+1}</span>
 <button className="stream-play" onClick={e=>{opener.current=e.currentTarget;play(s)}} disabled={opening} aria-label={'Play stream '+(i+1)+' in app'}><span className="stream-play-icon"><Play size={26} fill="currentColor"/></span><strong>Play in app</strong></button>
 <div className="stream-card-footer"><a href={href(s.url)} target={mobile?undefined:'_blank'} rel="noopener noreferrer">Open link<ExternalLink size={14}/></a>{apple&&<a className="stream-normal-link" href={s.url} target="_blank" rel="noopener noreferrer">Open normally</a>}</div>
 </article>)}</div>
 <Dialog.Root open={!!(live&&player?.embedAllowed&&player.embedUrl)} onOpenChange={open=>{if(!open)setPlayer(null)}}>
 {live&&player?.embedAllowed&&player.embedUrl&&<Dialog.Portal><Dialog.Overlay className="stream-popup-overlay"/><Dialog.Content className="stream-popup" style={modalStyle} aria-describedby={undefined} onCloseAutoFocus={e=>{e.preventDefault();opener.current?.focus();}}>
 <header className="stream-popup-toolbar"><div><span className="stream-live-badge">LIVE</span><Dialog.Title>{game.home.name} vs {game.away.name}</Dialog.Title></div><Dialog.Close className="stream-popup-close" aria-label="Close livestream"><X size={21}/></Dialog.Close></header>
 <iframe src={player.embedUrl} title={`${game.home.name} vs ${game.away.name} live stream`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" referrerPolicy="strict-origin-when-cross-origin"/>
 </Dialog.Content></Dialog.Portal>}
 </Dialog.Root>
 {player&&!player.embedAllowed&&<p role="status">{player.error||player.reason}</p>}

 </>:!busy&&result&&<><p role="status">{result.error?'':'No stream found for this match yet.'}</p><button className="stream-check" onClick={check}>Try again</button></>}
 </>:<p>Livestreams are available while the match is live.</p>}</section>;
}
