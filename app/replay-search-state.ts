import type {DiscoveredReplay} from './replay-discovery';

/** A failed refresh must not discard a usable list or pretend it is empty. */
export function replaySearchUpdate(previous:DiscoveredReplay[],ok:boolean,data:any){
 const seconds=Number(data?.retryAfter),retryAfter=Number.isFinite(seconds)&&seconds>0?Math.min(3600,Math.ceil(seconds)):0;
 if(!ok||!Array.isArray(data?.replays))return {goals:previous,retryAfter,message:({REPLAY_SOURCE_ACCESS_DENIED:'Replay source denied access.',REPLAY_SOURCE_RATE_LIMITED:'Please wait before refreshing.',REPLAY_SOURCE_UNAVAILABLE:'Replay search unavailable. Try again.',REPLAY_MATCH_MISMATCH:'No matching replays found.'} as Record<string,string>)[data?.code]||'Replay search unavailable. Try again.'};
 return {goals:data.replays as DiscoveredReplay[],retryAfter,message:typeof data.notice==='string'?data.notice:''};
}
