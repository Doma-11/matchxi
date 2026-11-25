import type {GoalReplay} from './goal-replays';
import {supportedReplayEmbed} from './goal-replays';
import {streaminWatch} from './streamin-playback';
import {streamffMedia} from './streamff-playback';

// Fixed compatibility experiment only. Public sources observed in Streamin's
// own video elements on 25 Nov 2026. No URL guessing, resolver, scraping, mirror
// rotation, proxy, token refresh or runtime discovery. These may stop working.
const STREAMIN_TEST_MEDIA:Record<string,{id:string;src:string}>={
 '79a89a60':{id:'ucl-20261124-hojlund-55',src:'https://c-cdn.streamin.top/uploads/79a89a60.mp4?9hoursago'},
 '9bdbca82':{id:'ucl-20261124-bouaddi-67',src:'https://c-cdn.streamin.top/uploads/9bdbca82.mp4?9hoursago'},
 '30d59f48':{id:'ucl-20261124-lang-76',src:'https://c-cdn.streamin.top/uploads/30d59f48.mp4?9hoursago'},
 '77b71472':{id:'ucl-20261124-cherki-86',src:'https://c-cdn.streamin.top/uploads/77b71472.mp4?9hoursago'},
 '58658f5c':{id:'ucl-20261124-gyokeres-10',src:'https://c-cdn.streamin.top/uploads/58658f5c.mp4?10hoursago'},
};
export type ReplayPlayback={kind:'iframe'|'native'|'resolve';provider:string;url:string};
export function replayPlayback(goal:GoalReplay):ReplayPlayback|null{
 const embed=supportedReplayEmbed(goal.videoUrl);
 if(embed)return {kind:'iframe',provider:embed.provider,url:embed.url};
 const direct=streamffMedia(goal.videoUrl,goal.mediaUrl);
 if(direct)return {kind:'native',provider:'Streamff',url:direct};
 // Retain the five working test sources exactly; live clips resolve only when selected.
 if(!goal.testOnly){const watch=streaminWatch(goal.videoUrl);return watch?{kind:'resolve',provider:'Streamin',url:watch.url}:null;}
 try{
  const watch=new URL(goal.videoUrl);
  if(watch.origin!=='https://streamin.link'||watch.search||watch.hash||watch.username||watch.password)return null;
  const id=watch.pathname.match(/^\/v\/([a-f0-9]{8})$/)?.[1],test=id?STREAMIN_TEST_MEDIA[id]:null;
  return test?.id===goal.id?{kind:'native',provider:'Streamin · experimental',url:test.src}:null;
 }catch{return null;}
}
