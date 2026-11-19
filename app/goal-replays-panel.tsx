import {useEffect,useRef,useState} from 'react';
import {ExternalLink,Play,RotateCcw,RefreshCw,X} from 'lucide-react';
import {GOAL_REPLAYS_EVENT,GOAL_REPLAYS_KEY,goalReplaysEnabled,supportedReplayEmbed,WIRTZ_TEST_REPLAY,type GoalReplay} from './goal-replays';
import './goal-replays.css';

export function useGoalReplaysEnabled(){
 const [enabled,setEnabled]=useState(goalReplaysEnabled);
 useEffect(()=>{const update=(event:Event)=>setEnabled((event as CustomEvent<boolean>).detail);const storage=(event:StorageEvent)=>{if(event.key===GOAL_REPLAYS_KEY||event.key===null)setEnabled(goalReplaysEnabled());};window.addEventListener(GOAL_REPLAYS_EVENT,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(GOAL_REPLAYS_EVENT,update);window.removeEventListener('storage',storage);};},[]);
 return enabled;
}
export function GoalReplayList({selected,onSelect,replays=[WIRTZ_TEST_REPLAY]}:{selected:GoalReplay|null;onSelect:(replay:GoalReplay,opener:HTMLButtonElement)=>void;replays?:GoalReplay[]}){
 const [loaded,setLoaded]=useState(false);
 // Fixed local metadata only. Phase 1 has no search or refresh endpoint.
 return <section className="goal-replays" aria-label="Goal Replays preview"><header><div><RotateCcw size={17}/><h3>Goal Replays</h3><small>Preview</small></div><button type="button" onClick={()=>setLoaded(true)}>{loaded?<RefreshCw size={15}/>:<Play size={15}/>}<span>{loaded?'Refresh test list':'Load test replay'}</span></button></header>
 <p className="goal-replays-note">Test clip: Germany vs Netherlands. This is not a replay search for the match you are watching.</p>
 {loaded&&(replays.length?<div className="goal-replays-list" role="list">{replays.map(goal=>{const embed=supportedReplayEmbed(goal.videoUrl),active=selected?.id===goal.id;return <div className={'goal-replay-row'+(active?' is-selected':'')} role="listitem" key={goal.id}><span className="goal-replay-minute">{goal.minute}</span><div className="goal-replay-scorer"><strong>{goal.scorer}</strong><small>{goal.team} · {goal.score}{goal.id===WIRTZ_TEST_REPLAY.id?' vs Netherlands':''}</small>{!embed&&<small>In-app playback unavailable for this host.</small>}</div>{embed?<button type="button" aria-pressed={active} aria-label={`Replay test goal: ${goal.scorer}, ${goal.team}, ${goal.minute}`} onClick={event=>onSelect(goal,event.currentTarget)}><Play size={14}/>{active?'Selected':'Replay'}</button>:<a className="goal-replay-external" href={goal.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open video externally: ${goal.scorer}, ${goal.team}`}><span>Open video</span><ExternalLink size={14}/></a>}</div>;})}</div>:<p className="goal-replays-note" role="status">No replay clips available.</p>)}
 </section>;
}
export function GoalReplayPlayer({replay,onClose}:{replay:GoalReplay;onClose:()=>void}){
 const close=useRef<HTMLButtonElement>(null);
 const embed=supportedReplayEmbed(replay.videoUrl);
 const [state,setState]=useState<'loading'|'loaded'|'failed'|'slow'>(embed?'loading':'failed');
 useEffect(()=>{setState(embed?'loading':'failed');close.current?.focus({preventScroll:true});const timer=setTimeout(()=>setState(previous=>previous==='loading'?'slow':previous),12000);return()=>clearTimeout(timer);},[replay.id,embed?.url]);
 return <section className="goal-replay-stage" aria-label="Goal replay player"><header><div><span className="goal-replay-tag">{replay.kind==='player-test'?'PLAYER TEST':'TEST REPLAY'}</span><strong>{[replay.minute,replay.scorer].filter(Boolean).join(' · ')}</strong></div><button type="button" ref={close} className="goal-replay-close" onClick={onClose} aria-label="Close replay and return to live match"><X size={21}/></button></header>
 <div className="goal-replay-embed" aria-busy={state==='loading'}>{embed&&state!=='failed'?<iframe key={embed.url} src={embed.url} title={`${replay.match}: ${replay.scorer} (${embed.provider} video player)`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation" referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setState('loaded')} onError={()=>setState('failed')}/>:<div className="goal-replay-unavailable" role="status"><Play size={24}/><p>In-app playback is unavailable for this video.</p><a href={replay.videoUrl} target="_blank" rel="noopener noreferrer">Open video<ExternalLink size={15}/></a></div>}</div>
 <footer><div><strong>{[replay.team,replay.score].filter(Boolean).join(' · ')}</strong><span role="status">{!embed||state==='failed'?'Use the external video link.':state==='loading'?'Loading video player…':state==='slow'?'Taking longer than expected. Try the external video link.':'Player loaded. Press Play in the video.'}</span>{embed&&state!=='failed'&&<button type="button" className="goal-replay-report" onClick={()=>setState('failed')}>Video unavailable?</button>}</div><div className="goal-replay-links"><a href={replay.videoUrl} target="_blank" rel="noopener noreferrer">Open video<ExternalLink size={14}/></a></div></footer>
 </section>;
}
