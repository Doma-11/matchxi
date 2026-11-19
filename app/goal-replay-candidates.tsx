import {ExternalLink,Play} from 'lucide-react';
import {manualReplayTest,type GoalReplay} from './goal-replays';

// Fixed links only: no provider request until the user chooses a player.
export const EMBED_TEST_CANDIDATES:readonly GoalReplay[]=[
 {id:'griezmann-f9hd7r',minute:'57′',scorer:'Antoine Griezmann',team:'Barcelona',match:'Napoli vs Barcelona',score:'1–1',matchDate:'2020-02-25',postUrl:'https://www.reddit.com/r/soccer/comments/f9hd7r/',videoUrl:'https://streamable.com/jup64',testOnly:true,kind:'goal'},
 {...manualReplayTest('https://streamable.com/5rneah')!,id:'streamable-documentation-sample',scorer:'Streamable documentation sample',match:'Provider compatibility test'},
];
export function GoalReplayCandidates({selected,onSelect}:{selected:GoalReplay|null;onSelect:(goal:GoalReplay,button:HTMLButtonElement)=>void}){
 return <section className="goal-replays" aria-label="Internal playback tests"><header><h3>Try internal playback</h3></header><p className="goal-replays-note">These links use Streamable’s supported video-only player. Playback has not been verified. Press Play inside the player; if a clip is unavailable, try the other test or Open video.</p><div role="list">{EMBED_TEST_CANDIDATES.map(goal=><div className="goal-replay-row" role="listitem" key={goal.id}><div className="goal-replay-scorer"><strong>{goal.scorer}</strong><small>{goal.kind==='goal'?`${goal.team} · ${goal.minute} · ${goal.match} · ${goal.score} · ${goal.matchDate}`:'Provider sample, not a football goal'}</small><small>{goal.kind==='goal'?'Historical Reddit mirror; may have expired or been removed.':'Reference link from Streamable’s embed documentation; availability unverified.'}</small><a href={goal.videoUrl} target="_blank" rel="noopener noreferrer">Open video <ExternalLink size={12}/></a></div><button type="button" aria-pressed={selected?.id===goal.id} aria-label={goal.kind==='goal'?'Try Griezmann goal internally':'Try provider sample internally'} onClick={event=>onSelect(goal,event.currentTarget)}><Play size={14}/>Try player</button></div>)}</div></section>;
}
