/** Phase 1 only: local preference and explicitly labelled handoff test clips.
 * No Reddit search, score API, video fetching, storage, or polling lives here.
 */
export const GOAL_REPLAYS_KEY='matchxi-goal-replays-poc';
export const GOAL_REPLAYS_EVENT='matchxi-goal-replays-change';
export function goalReplaysEnabled(){try{return window.localStorage.getItem(GOAL_REPLAYS_KEY)==='on';}catch{return false;}}
export function setGoalReplaysEnabled(enabled:boolean){
 try{window.localStorage.setItem(GOAL_REPLAYS_KEY,enabled?'on':'off');}catch{}
 window.dispatchEvent(new CustomEvent(GOAL_REPLAYS_EVENT,{detail:enabled}));
}
export type GoalReplay={id:string;minute:string;scorer:string;team:string;match:string;score:string;postUrl:string;videoUrl:string;mediaUrl?:string;testOnly:boolean;kind?:'goal'|'player-test';matchDate?:string};
export const WIRTZ_TEST_REPLAY:GoalReplay={
 id:'wirtz-1xy15gb',minute:'60′',scorer:'Florian Wirtz',team:'Germany',match:'Germany vs Netherlands',score:'2–0',
 postUrl:'https://www.reddit.com/r/soccer/comments/1xy15gb/germany_2_0_netherlands_f_wirtz_60/',
 videoUrl:'https://streamin.me/v/cfb904d3',testOnly:true,
};
/** Only a documented video-player URL is returned. A watch page, Reddit post,
 * arbitrary iframe URL, or extracted media URL is never used as the player.
 * Streamable web apps must use its player, not signed/raw media URLs.
 * https://streamable-support.zendesk.com/hc/en-us/articles/35415648975892
 */
export function supportedReplayEmbed(raw:string){
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||!['streamable.com','www.streamable.com'].includes(url.hostname)||url.username||url.password||url.port)return null;
  const id=url.pathname.match(/^\/(?:e\/)?([a-z0-9]{2,32})\/?$/i)?.[1];
  if(!id)return null;
  return {provider:'Streamable',url:`https://streamable.com/e/${id}?autoplay=0&loop=0`,videoUrl:`https://streamable.com/${id}`};
 }catch{return null;}
}
/** The manual compatibility test does not assign an unverified URL to Wirtz.
 * It remains in component memory only and is never saved or searched for.
 */
export function manualReplayTest(raw:string):GoalReplay|null{
 const embed=supportedReplayEmbed(raw);if(!embed)return null;
 return {id:'manual-'+new URL(embed.videoUrl).pathname.slice(1),minute:'',scorer:'Manual video test',team:embed.provider,match:'Manual video test',score:'',postUrl:'',videoUrl:embed.videoUrl,testOnly:true,kind:'player-test'};
}
