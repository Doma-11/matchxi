'use client';
import {useState,useEffect,useRef,useId,type CSSProperties} from 'react';
import {ExternalLink,Play,X,ChevronLeft,ChevronRight,ListVideo,Maximize,Minimize,RefreshCw} from 'lucide-react';
import {Dialog} from 'radix-ui';
import {LEAGUES,CLUB_CUPS,COMPETITIONS,isNationalCompetition} from './football-model';
import flags from './national-flags.json';
import {streamBrowserLink,isAppleMobile} from './stream-browser-link';
import {croatianCommentaryDestination} from './croatian-commentary';
import {createStreamSession,liveStreamGames,streamGameKey,streamMinute,streamStep} from './stream-session';
import './stream-switcher.css';

function StreamTeam({team,national=false}:any){const src=national?(flags as any)[team.name]||team.logo:team.logo;return src?<img className={'stream-team-badge'+(national?' flag-circle':'')} src={src} alt="" loading="lazy"/>:<span className="stream-team-badge stream-badge-fallback" aria-hidden="true">{team.name.slice(0,2)}</span>;}
export default function MatchStreamPanel({game,fixtures=[]}:any){
 const [result,setResult]=useState<any>(null),[busy,setBusy]=useState(false);
 const [modalOpen,setModalOpen]=useState(false),[watched,setWatched]=useState<any>(game),[streams,setStreams]=useState<any[]>([]),[index,setIndex]=useState(0),[player,setPlayer]=useState<any>(null),[opening,setOpening]=useState(false);
 const [gamesOpen,setGamesOpen]=useState(false),[games,setGames]=useState<any[]>([]),[gamesBusy,setGamesBusy]=useState(false),[gamesNotice,setGamesNotice]=useState(''),[gamesChecked,setGamesChecked]=useState(''),[fullscreen,setFullscreen]=useState(false),[fullscreenNotice,setFullscreenNotice]=useState('');
 const panel=useRef<HTMLElement|null>(null);
 const session=useRef(createStreamSession()),opener=useRef<HTMLButtonElement|null>(null),popup=useRef<HTMLDivElement|null>(null),action=useRef<AbortController|null>(null),gamesRequest=useRef<AbortController|null>(null),generation=useRef(0),drawerId=useId();
 const competition=[...LEAGUES,...CLUB_CUPS,...COMPETITIONS].find(c=>c.id===watched?.league);
 const modalStyle={'--accent':competition?.accent||'#5cd49d'} as CSSProperties;
 const live=game.state==='in'&&!game.completed,watchedLive=watched?.state==='in'&&!watched?.completed,currentStream=streams[index];
 const ua=typeof navigator!=='undefined'?navigator.userAgent:'',touch=typeof navigator!=='undefined'?navigator.maxTouchPoints:0;
 const apple=isAppleMobile(ua,touch),mobile=apple||/Android/i.test(ua),href=(url:string)=>streamBrowserLink(url,ua,touch),croatian=croatianCommentaryDestination(game);
 const cancelPlayback=()=>{generation.current++;action.current?.abort();action.current=null;};
 const close=()=>{cancelPlayback();gamesRequest.current?.abort();gamesRequest.current=null;setModalOpen(false);setGamesOpen(false);setGamesBusy(false);setOpening(false);setPlayer(null);setFullscreenNotice('');if(popup.current&&document.fullscreenElement===popup.current)void document.exitFullscreen?.().catch(()=>{});};
 useEffect(()=>{
  const abort=new AbortController();setResult(null);
  if(!live){setBusy(false);return;}
  setBusy(true);session.current.listings(game,abort.signal).then(setResult).catch(e=>{if(!abort.signal.aborted)setResult({error:e.message||'Streams could not be checked. Please try again.'});}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
  return()=>abort.abort();
 },[game.league,game.id,game.date,live]);
 useEffect(()=>{close();setWatched(game);return()=>{cancelPlayback();gamesRequest.current?.abort();};},[game.league,game.id,game.date]);
 useEffect(()=>{if(streamGameKey(watched)===streamGameKey(game))setWatched(game);},[game]);
 useEffect(()=>{const changed=()=>setFullscreen(!!popup.current&&document.fullscreenElement===popup.current);document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
 useEffect(()=>{if(modalOpen&&!watchedLive){cancelPlayback();setPlayer(null);setOpening(false);}},[modalOpen,watchedLive]);

 const play=async(target:any,list:any[],selected:number)=>{
  cancelPlayback();const controller=new AbortController(),id=generation.current;action.current=controller;
  setWatched(target);setStreams(list);setIndex(selected);setPlayer(null);setOpening(true);setModalOpen(true);setFullscreenNotice('');
  try{const next=await session.current.player(list[selected],controller.signal);if(!controller.signal.aborted&&generation.current===id)setPlayer(next);}
  catch(e:any){if(!controller.signal.aborted&&generation.current===id)setPlayer({error:e.message||'Could not open this player. Use the external link.'});}
  finally{if(!controller.signal.aborted&&generation.current===id){setOpening(false);action.current=null;}}
 };
 const chooseStream=(next:number)=>{if(opening||!watchedLive||!streams[next]||next===index&&player?.embedAllowed)return;void play(watched,streams,next);};
 const move=(direction:number)=>{if(streams.length>1)chooseStream(streamStep(index,direction,streams.length));};
 const chooseGame=async(target:any,force=false)=>{
  if(!force&&streamGameKey(target)===streamGameKey(watched)){setGamesOpen(false);gamesRequest.current?.abort();setGamesBusy(false);return;}
  cancelPlayback();const controller=new AbortController(),id=generation.current;action.current=controller;
  gamesRequest.current?.abort();gamesRequest.current=null;setGamesBusy(false);setGamesOpen(false);setWatched(target);setStreams([]);setIndex(0);setPlayer(null);setOpening(true);setModalOpen(true);
  try{const found=await session.current.listings(target,controller.signal,force);if(controller.signal.aborted||generation.current!==id)return;setStreams(found.streams);
   if(!found.streams.length){setPlayer({reason:'No stream found for this match yet.'});return;}
   const next=await session.current.player(found.streams[0],controller.signal);if(!controller.signal.aborted&&generation.current===id)setPlayer(next);
  }catch(e:any){if(!controller.signal.aborted&&generation.current===id)setPlayer({error:e.message||'Streams could not be checked. Please try again.'});}
  finally{if(!controller.signal.aborted&&generation.current===id){setOpening(false);action.current=null;}}
 };
 const toggleGames=async()=>{
  if(gamesOpen){setGamesOpen(false);gamesRequest.current?.abort();gamesRequest.current=null;setGamesBusy(false);return;}
  setGamesOpen(true);setGamesNotice('');setGames(liveStreamGames([...fixtures,...games],watched));
  const controller=new AbortController();gamesRequest.current?.abort();gamesRequest.current=controller;setGamesBusy(true);
  try{const snapshot=await session.current.games(controller.signal);if(controller.signal.aborted)return;
   const latest=snapshot.games.find((g:any)=>streamGameKey(g)===streamGameKey(watched))||watched;
   setWatched(latest);setGames(liveStreamGames(snapshot.games,latest));setGamesChecked(snapshot.checkedAt||'');setGamesNotice(snapshot.failures?.length?'Some competitions could not refresh.':'');
  }catch{if(!controller.signal.aborted)setGamesNotice('Could not refresh. Showing the saved match list.');}
  finally{if(!controller.signal.aborted){setGamesBusy(false);gamesRequest.current=null;}}
 };
 const check=async()=>{if(busy||!live||result?.streams?.length)return;const controller=new AbortController();action.current?.abort();action.current=controller;setBusy(true);try{setResult(await session.current.listings(game,controller.signal,true));}catch(e:any){if(!controller.signal.aborted)setResult({error:e.message});}finally{if(!controller.signal.aborted)setBusy(false);}};
 const toggleFullscreen=async()=>{setFullscreenNotice('');try{if(document.fullscreenElement===popup.current)await document.exitFullscreen();else if(popup.current?.requestFullscreen)await popup.current.requestFullscreen();else setFullscreenNotice('Fullscreen is unavailable in this browser.');}catch{setFullscreenNotice('Fullscreen is unavailable in this browser.');}};
 const otherGames=liveStreamGames(games,watched);
 return <section className="match-stream-panel" ref={panel} tabIndex={-1}><header className="stream-section-heading"><h2>Livestream</h2><span className="stream-live-badge">LIVE</span></header>{live?<>
 {croatian&&<aside className="croatian-commentary-option"><a className="croatian-commentary-action" href={href(croatian.url)} target={mobile?undefined:'_blank'} rel="noopener noreferrer"><span className="croatian-commentary-flag" role="img" aria-label="Croatia">🇭🇷</span><strong>Croatian commentary stream</strong><ExternalLink size={17}/></a><p>{croatian.kind==='match-page'?'Opens this match on BHLiga. Select Broadcast → HR, if available.':'Opens BHLiga listings. Select this match → Broadcast → HR, if available.'}</p>{apple&&<a className="croatian-commentary-source" href={croatian.url} target="_blank" rel="noopener noreferrer">Open normally<ExternalLink size={12}/></a>}</aside>}
 {busy&&<p role="status">Finding streams…</p>}{result?.error&&<p role="status">{result.error}</p>}
 {result?.streams?.length>0?<div className="stream-links">{result.streams.map((s:any,i:number)=><article className="stream-link-choice" key={s.url}>
 <span className="stream-card-label">Stream {i+1}</span><button className="stream-play" onClick={e=>{opener.current=e.currentTarget;setGamesOpen(false);void play(game,result.streams,i);}} disabled={opening} aria-label={'Play stream '+(i+1)+' in app'}><span className="stream-play-icon"><Play size={26} fill="currentColor"/></span><strong>Play in app</strong></button>
 <div className="stream-card-footer"><a href={href(s.url)} target={mobile?undefined:'_blank'} rel="noopener noreferrer">Open link<ExternalLink size={14}/></a>{apple&&<a className="stream-normal-link" href={s.url} target="_blank" rel="noopener noreferrer">Open normally</a>}</div></article>)}</div>:!busy&&result&&<><p role="status">{result.error?'':'No stream found for this match yet.'}</p><button className="stream-check" onClick={check}>Try again</button></>}
 </>:<p>Livestreams are available while the match is live.</p>}
 <Dialog.Root open={modalOpen} onOpenChange={open=>{if(!open)close();}}>{modalOpen&&<Dialog.Portal><Dialog.Overlay className="stream-popup-overlay"/><Dialog.Content ref={popup} className={'stream-popup stream-switch-popup'+(gamesOpen?' stream-games-expanded':'')} style={modalStyle} aria-describedby={undefined} onCloseAutoFocus={e=>{e.preventDefault();if(opener.current?.isConnected)opener.current.focus();else panel.current?.focus();}}>
 <header className="stream-popup-toolbar"><div>{watchedLive&&<span className="stream-live-badge">LIVE</span>}<Dialog.Title>{watched.home.name} vs {watched.away.name}</Dialog.Title></div><div className="stream-window-actions">{currentStream&&<a href={href(currentStream.url)} target={mobile?undefined:'_blank'} rel="noopener noreferrer" aria-label="Open current stream externally" title="Open externally"><ExternalLink size={19}/></a>}<button type="button" onClick={toggleFullscreen} aria-label={fullscreen?'Exit fullscreen':'Fullscreen player'} title={fullscreen?'Exit fullscreen':'Fullscreen'}>{fullscreen?<Minimize size={19}/>:<Maximize size={19}/>}</button><Dialog.Close className="stream-popup-close" aria-label="Close livestream"><X size={22}/></Dialog.Close></div></header>
 <div className="stream-switch-body"><div className="stream-video-pane"><div className="stream-viewport" aria-busy={opening}>
 {watchedLive&&player?.embedAllowed&&player.embedUrl&&!opening?<iframe key={player.embedUrl} src={player.embedUrl} title={`${watched.home.name} vs ${watched.away.name} live stream`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="stream-player-message" role="status">{opening?<><RefreshCw className="spin" size={25}/><span>Loading stream…</span></>:<><Play size={28}/><p>{!watchedLive?'This match is no longer live.':player?.error||player?.reason||'This stream is unavailable.'}</p><div className="stream-recovery-actions">{watchedLive&&streams.length>1&&<button onClick={()=>move(1)}>Next stream<ChevronRight size={16}/></button>}{currentStream&&<a href={href(currentStream.url)} target={mobile?undefined:'_blank'} rel="noopener noreferrer">Open externally<ExternalLink size={15}/></a>}{apple&&currentStream&&<a href={currentStream.url} target="_blank" rel="noopener noreferrer">Open normally<ExternalLink size={15}/></a>}{watchedLive&&!streams.length&&<button onClick={()=>chooseGame(watched,true)}>Try again</button>}</div></>}
 </div>}</div>
 <div className="stream-switch-controls" onKeyDown={e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||(e.target as Element).closest('select,a'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}><div className="stream-source-switch"><button type="button" onClick={()=>move(-1)} disabled={opening||streams.length<2||!watchedLive} aria-label="Previous stream"><ChevronLeft size={22}/></button><label><span className="sr-only">Stream source</span><select aria-label="Stream source" value={streams.length?index:''} disabled={opening||!streams.length||!watchedLive} onChange={e=>chooseStream(Number(e.target.value))}>{streams.length?streams.map((s:any,i:number)=><option key={s.url} value={i}>Stream {i+1} of {streams.length}</option>):<option value="">No streams</option>}</select></label><button type="button" onClick={()=>move(1)} disabled={opening||streams.length<2||!watchedLive} aria-label="Next stream"><ChevronRight size={22}/></button></div><button type="button" className="stream-games-toggle" onClick={toggleGames} aria-expanded={gamesOpen} aria-controls={drawerId}><ListVideo size={18}/><span>Other games</span></button></div>{fullscreenNotice&&<p className="stream-fullscreen-notice" role="status">{fullscreenNotice}</p>}</div>
 {gamesOpen&&<aside id={drawerId} className="stream-other-games" aria-label="Other live games"><span className="stream-sheet-handle" aria-hidden="true"/><header><h3>Other games</h3><button onClick={toggleGames} aria-label="Close other games"><X size={19}/></button></header><div className="stream-games-meta">{gamesBusy?'Updating…':gamesChecked?'Checked '+new Date(gamesChecked).toLocaleTimeString(undefined,{hourCycle:'h23',hour:'2-digit',minute:'2-digit'}):'Saved live matches'}</div><div className="stream-games-list">{otherGames.map(target=>{const watching=streamGameKey(target)===streamGameKey(watched),national=isNationalCompetition(target.league);return <button className={'stream-game-option'+(watching?' is-watching':'')} key={streamGameKey(target)} onClick={()=>chooseGame(target)} aria-label={`${target.home.name} ${target.home.score??'–'} to ${target.away.score??'–'} ${target.away.name}${watching?', watching':''}`} aria-current={watching?'true':undefined}><StreamTeam team={target.home} national={national}/><span className="stream-game-summary"><span className="stream-game-teams"><strong>{target.home.name}</strong><b>{target.home.score??'–'}–{target.away.score??'–'}</b><strong>{target.away.name}</strong></span><small>{watching?'Watching':streamMinute(target)}</small></span><StreamTeam team={target.away} national={national}/><ChevronRight size={15}/></button>;})}</div>{!otherGames.length&&!gamesBusy&&<p className="stream-games-empty">No other live matches found.</p>}{gamesNotice&&<p className="stream-games-notice" role="status">{gamesNotice}</p>}</aside>}
 </div></Dialog.Content></Dialog.Portal>}</Dialog.Root>
 </section>;
}
