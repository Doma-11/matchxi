'use client';
import {useState,useEffect,useRef,type CSSProperties} from 'react';
import {Dialog} from 'radix-ui';
import {Grid2X2,Plus,X,Maximize,ChevronLeft,ChevronRight,ExternalLink,Play,RefreshCw,ArrowUpRight} from 'lucide-react';
import {liveStreamGames,streamGameKey} from './stream-session';
import {createMultiviewSession,type MultiviewTile} from './stream-multiview-session';
import {streamCompetition} from './stream-competition';
import {LEAGUES,CLUB_CUPS,COMPETITIONS} from './football-model';
import {streamBrowserLink,isAppleMobile} from './stream-browser-link';
import './stream-multiview.css';
export default function StreamMultiview({client,initial,game,fixtures=[],onSingle,onClose}:any){
 const seed:MultiviewTile=initial?.player?.embedAllowed?{...initial,busy:false,error:''}:null;
 const [tiles,setTiles]=useState<MultiviewTile[]>([seed,null,null,null]),[count,setCount]=useState(2),[games,setGames]=useState<any[]>(()=>liveStreamGames([...fixtures,game],game)),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
 const control=useRef<ReturnType<typeof createMultiviewSession>|null>(null),grid=useRef<HTMLDivElement|null>(null);
 const ua=typeof navigator!=='undefined'?navigator.userAgent:'',touch=typeof navigator!=='undefined'?navigator.maxTouchPoints:0,apple=isAppleMobile(ua,touch),href=(url:string)=>streamBrowserLink(url,ua,touch);
 useEffect(()=>{
  const session=createMultiviewSession(client,setTiles,seed);control.current=session;
  if(!seed&&game.state==='in'&&!game.completed)session.select(0,game);
  const abort=new AbortController();setLoading(true);
  client.games(abort.signal).then((snapshot:any)=>{if(abort.signal.aborted)return;setGames(liveStreamGames([...snapshot.games,game],game));session.reconcile(snapshot.games);if(snapshot.failures?.length)setNotice('Some competitions could not refresh.');}).catch(()=>{if(!abort.signal.aborted)setNotice('Showing saved live matches.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>{abort.abort();session.dispose();control.current=null;};
 },[]);
 useEffect(()=>{control.current?.reconcile([...fixtures,game]);},[fixtures,game]);
 const fullscreen=async(element:HTMLElement|null)=>{try{if(element?.requestFullscreen)await element.requestFullscreen();else setNotice('Fullscreen is unavailable in this browser.');}catch{setNotice('Fullscreen is unavailable in this browser.');}};
 const selected=new Set(tiles.filter(Boolean).map(tile=>streamGameKey(tile!.game)));
 const choices=liveStreamGames([...games,...tiles.filter(Boolean).map(tile=>tile!.game)],game);
 return <div className="multiview-workspace"><header className="multiview-header"><div><Grid2X2 size={21}/><Dialog.Title>Multiview</Dialog.Title><span>{tiles.filter(Boolean).length} / 4 matches</span></div><div><button type="button" onClick={()=>fullscreen(grid.current)} aria-label="Fullscreen multiview"><Maximize size={19}/></button><button type="button" onClick={onClose} aria-label="Close multiview"><X size={22}/></button></div></header>
 <div className="multiview-options"><button type="button" onClick={()=>setCount(n=>Math.min(4,n+1))} disabled={count===4}><Plus size={16}/>Add match</button><span>{loading?'Loading match list…':'Select up to four matches. Use each player’s sound controls.'}</span></div>{notice&&<p className="multiview-notice" role="status">{notice}</p>}
 <div ref={grid} className={'multiview-grid multiview-count-'+count}>{tiles.slice(0,count).map((tile,i)=>{
 const theme=streamCompetition(tile?.game.league||game.league,true),competition=[...LEAGUES,...CLUB_CUPS,...COMPETITIONS].find(c=>c.id===tile?.game.league),current=tile?.streams[tile.index],live=tile?.game.state==='in'&&!tile?.game.completed;
 return <section key={i} className="multiview-tile" style={{'--tile-accent':theme.accent,'--tile-surface':theme.surface} as CSSProperties} aria-label={'Match tile '+(i+1)}>
 <header>{competition&&<img src={competition.logo} alt={competition.name}/>}<label><span className="sr-only">Match for tile {i+1}</span><select aria-label={'Match for tile '+(i+1)} disabled={loading} title={tile?`${tile.game.home.name} vs ${tile.game.away.name}`:'Choose a live match'} value={tile?streamGameKey(tile.game):''} onChange={e=>{const choice=choices.find(g=>streamGameKey(g)===e.target.value);if(choice)control.current?.select(i,choice);else control.current?.remove(i);}}><option value="">Choose a live match</option>{tile&&!live&&<option value={streamGameKey(tile.game)} disabled>{tile.game.home.name} vs {tile.game.away.name} · Finished</option>}{choices.map(g=><option key={streamGameKey(g)} value={streamGameKey(g)} disabled={selected.has(streamGameKey(g))&&(!tile||streamGameKey(tile.game)!==streamGameKey(g))}>{g.home.name} vs {g.away.name}</option>)}</select></label>{tile&&<><button type="button" disabled={tile.busy||!tile.player?.embedAllowed||!live} onClick={()=>onSingle(tile)} aria-label={'Watch only '+tile.game.home.name+' vs '+tile.game.away.name} title="Watch only this match"><ArrowUpRight size={17}/></button><button type="button" onClick={()=>control.current?.remove(i)} aria-label={'Remove match from tile '+(i+1)}><X size={18}/></button></>}</header>
 <div className="multiview-video">{tile?.player?.embedAllowed&&tile.player.embedUrl&&live&&!tile.busy?<iframe src={tile.player.embedUrl} title={`${tile.game.home.name} vs ${tile.game.away.name} multiview`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="multiview-placeholder" role="status">{tile?.busy?<><RefreshCw className="spin" size={23}/><span>Finding an embeddable stream…</span></>:tile?<><Play size={24}/><span>{tile.error||'Stream unavailable.'}</span>{live&&<button type="button" onClick={()=>control.current?.retry(i)}>Retry</button>}</>:<><Plus size={25}/><span>Choose a match above</span></>}</div>}</div>
 {tile&&<footer><div className="multiview-sources"><button type="button" disabled={tile.busy||tile.streams.length<2||!live} onClick={()=>control.current?.step(i,-1)} aria-label={'Previous source for tile '+(i+1)}><ChevronLeft size={18}/></button><span>{tile.streams.length?`Stream ${tile.index+1} / ${tile.streams.length}`:'No sources'}</span><button type="button" disabled={tile.busy||tile.streams.length<2||!live} onClick={()=>control.current?.step(i,1)} aria-label={'Next source for tile '+(i+1)}><ChevronRight size={18}/></button></div>{current&&<a href={href(current.url)} target="_blank" rel="noopener noreferrer" aria-label={'Open tile '+(i+1)+' externally'}><ExternalLink size={16}/></a>}{apple&&current&&<a href={current.url} target="_blank" rel="noopener noreferrer">Open normally</a>}</footer>}
 </section>;
 })}</div></div>;
}
