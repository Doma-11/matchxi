import {useEffect,useRef,useState} from 'react';
import {ExternalLink,Play,RotateCcw,RefreshCw,X} from 'lucide-react';
import {GOAL_REPLAYS_EVENT,GOAL_REPLAYS_KEY,goalReplaysEnabled,redditReplayDocument,WIRTZ_TEST_REPLAY,type GoalReplay} from './goal-replays';
import './goal-replays.css';

export function useGoalReplaysEnabled(){
 const [enabled,setEnabled]=useState(goalReplaysEnabled);
 useEffect(()=>{const update=(event:Event)=>setEnabled((event as CustomEvent<boolean>).detail);const storage=(event:StorageEvent)=>{if(event.key===GOAL_REPLAYS_KEY||event.key===null)setEnabled(goalReplaysEnabled());};window.addEventListener(GOAL_REPLAYS_EVENT,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(GOAL_REPLAYS_EVENT,update);window.removeEventListener('storage',storage);};},[]);
 return enabled;
}
export function GoalReplayList({selected,onSelect}:{selected:GoalReplay|null;onSelect:(replay:GoalReplay,opener:HTMLButtonElement)=>void}){
 const [loaded,setLoaded]=useState(false);
 // Phase 1 deliberately has no search/refresh endpoint. Loading this fixed
 // fixture reads local metadata; only selecting Replay contacts Reddit.
 return <section className="goal-replays" aria-label="Goal Replays preview"><header><div><RotateCcw size={17}/><h3>Goal Replays</h3><small>Preview</small></div><button type="button" onClick={()=>setLoaded(true)}>{loaded?<RefreshCw size={15}/>:<Play size={15}/>}<span>{loaded?'Refresh test list':'Load test replay'}</span></button></header>
 <p className="goal-replays-note">Test clip: Germany vs Netherlands. This is not a replay search for the match you are watching.</p>
 {loaded&&<div className="goal-replays-list" role="list"><div className={'goal-replay-row'+(selected?.id===WIRTZ_TEST_REPLAY.id?' is-selected':'')} role="listitem"><span className="goal-replay-minute">{WIRTZ_TEST_REPLAY.minute}</span><div className="goal-replay-scorer"><strong>{WIRTZ_TEST_REPLAY.scorer}</strong><small>{WIRTZ_TEST_REPLAY.team} · {WIRTZ_TEST_REPLAY.score} vs Netherlands</small></div><button type="button" aria-pressed={selected?.id===WIRTZ_TEST_REPLAY.id} aria-label="Replay test goal: Florian Wirtz, Germany, 60 minutes" onClick={event=>onSelect(WIRTZ_TEST_REPLAY,event.currentTarget)}><Play size={14}/>{selected?.id===WIRTZ_TEST_REPLAY.id?'Playing':'Replay'}</button></div></div>}
 </section>;
}
export function GoalReplayPlayer({replay,onClose}:{replay:GoalReplay;onClose:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),close=useRef<HTMLButtonElement>(null);
 const [state,setState]=useState<'loading'|'loaded'|'failed'|'slow'>('loading');
 const doc=redditReplayDocument(replay);
 useEffect(()=>{setState('loading');close.current?.focus({preventScroll:true});const message=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow||event.data?.type!=='matchxi-replay-embed')return;if(event.data.state==='loaded')setState('loaded');else if(event.data.state==='failed')setState('failed');};window.addEventListener('message',message);const timer=setTimeout(()=>setState(previous=>previous==='loading'?'slow':previous),12000);return()=>{window.removeEventListener('message',message);clearTimeout(timer);};},[replay.id]);
 return <section className="goal-replay-stage" aria-label="Goal replay player"><header><div><span className="goal-replay-tag">TEST REPLAY</span><strong>{replay.minute} · {replay.scorer}</strong></div><button type="button" ref={close} className="goal-replay-close" onClick={onClose} aria-label="Close replay and return to live match"><X size={21}/></button></header>
 <div className="goal-replay-embed" aria-busy={state==='loading'}>{doc&&state!=='failed'?<iframe key={replay.id} ref={frame} srcDoc={doc} title={`${replay.match}: ${replay.scorer} goal replay (Reddit embed)`} allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation" referrerPolicy="strict-origin-when-cross-origin" onError={()=>setState('failed')}/>:<div className="goal-replay-unavailable" role="status"><Play size={24}/><p>This replay could not be embedded.</p><a href={replay.videoUrl} target="_blank" rel="noopener noreferrer">Open video<ExternalLink size={15}/></a></div>}</div>
 <footer><div><strong>{replay.team} · {replay.score}</strong><span role="status">{!doc||state==='failed'?'Use the external video link.':state==='loading'?'Loading Reddit embed…':state==='slow'?'Taking longer than expected. Try the external video link.':'Reddit post loaded; video playback is not verified.'}</span></div><div className="goal-replay-links"><a href={replay.videoUrl} target="_blank" rel="noopener noreferrer">Open video<ExternalLink size={14}/></a><a href={replay.postUrl} target="_blank" rel="noopener noreferrer">Reddit post<ExternalLink size={14}/></a></div></footer>
 </section>;
}
