/** Phase 1 only: local preference and one explicitly labelled handoff test clip.
 * No Reddit search, score API, video fetching, storage, or polling lives here.
 */
export const GOAL_REPLAYS_KEY='matchxi-goal-replays-poc';
export const GOAL_REPLAYS_EVENT='matchxi-goal-replays-change';
export function goalReplaysEnabled(){try{return window.localStorage.getItem(GOAL_REPLAYS_KEY)==='on';}catch{return false;}}
export function setGoalReplaysEnabled(enabled:boolean){
 try{window.localStorage.setItem(GOAL_REPLAYS_KEY,enabled?'on':'off');}catch{}
 window.dispatchEvent(new CustomEvent(GOAL_REPLAYS_EVENT,{detail:enabled}));
}
export type GoalReplay={id:string;minute:string;scorer:string;team:string;match:string;score:string;postUrl:string;videoUrl:string;testOnly:true};
export const WIRTZ_TEST_REPLAY:GoalReplay={
 id:'wirtz-1xy15gb',minute:'60′',scorer:'Florian Wirtz',team:'Germany',match:'Germany vs Netherlands',score:'2–0',
 postUrl:'https://www.reddit.com/r/soccer/comments/1xy15gb/germany_2_0_netherlands_f_wirtz_60/',
 videoUrl:'https://streamin.me/v/cfb904d3',testOnly:true,
};
/** Strictly accept post links, never arbitrary HTML or video/page iframes. */
export function redditSoccerPost(raw:string){
 try{const url=new URL(raw);if(url.protocol!=='https:'||!['www.reddit.com','reddit.com'].includes(url.hostname)||url.username||url.password||url.port||!/^\/r\/soccer\/comments\/[a-z0-9]+\/[a-z0-9_]+\/?$/i.test(url.pathname))return null;
 return 'https://www.reddit.com'+url.pathname.replace(/\/?$/,'/');}catch{return null;}
}
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
/** Reddit's documented blockquote/widgets.js format. It runs in an isolated
 * srcDoc frame only after Replay is pressed; required branding is untouched.
 * The load message reports an embed frame loading, never successful playback.
 */
export function redditReplayDocument(replay:GoalReplay){
 const post=redditSoccerPost(replay.postUrl);if(!post)return null;
 const title=escapeHtml(`${replay.match} · ${replay.scorer} ${replay.minute}`);
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank"><style>body{margin:0;padding:8px;background:#0b111b;color:#edf3fb;font:14px Arial,sans-serif}a{color:#8dccff}blockquote{margin:0 auto;max-width:740px}</style></head><body><blockquote class="reddit-embed-bq" data-embed-theme="dark"><a href="${escapeHtml(post)}">${title}</a><br>in <a href="https://www.reddit.com/r/soccer/">r/soccer</a></blockquote><script>const report=state=>parent.postMessage({type:'matchxi-replay-embed',state},'*');new MutationObserver(()=>{for(const frame of document.querySelectorAll('iframe')){if(frame.dataset.observed)continue;frame.dataset.observed='true';frame.addEventListener('load',()=>report('loaded'));}}).observe(document.body,{childList:true,subtree:true});<\/script><script async src="https://embed.reddit.com/widgets.js" charset="UTF-8" onerror="report('failed')"><\/script></body></html>`;
}
