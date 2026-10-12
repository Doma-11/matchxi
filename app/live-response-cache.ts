import {isHalfTime} from './match-clock';
// Narrow source-cache shortening to phase-detection requests. Ordinary score
// responses keep their existing cache, and finished fixtures keep long reuse.
export function liveResponseLifetime(game:any,url:URL,now=Date.now()){
 if(game?.completed)return 3600;
 const detection=url.searchParams.get('detection'),age=now-Date.parse(game?.date||'');
 if(detection==='kickoff'&&game?.state==='pre'&&age>=-60000&&age<240000)return 5;
 if(detection==='second-half'&&isHalfTime(game))return 8;
 return 30;
}
