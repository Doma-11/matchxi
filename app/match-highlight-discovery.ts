import sources from './highlight-sources.json';
import nationals from './national-sources.json';
import {clubTerms,matchVideo,normalize} from './football-model';
import {parseFeed,parsePage,mergeHighlights,type HighlightSource} from './highlights-data';
const arena={name:'ArenaSport TV',id:'UC-SYaiaBb5P-xcNTzcvkqkA',league:'archive.media',url:'https://www.youtube.com/@TVArenaSport/videos'};
export function matchPublishers(game:any){
 const names=[...clubTerms(game.home),...clubTerms(game.away)];
 const clubSources=sources.filter(s=>names.some(n=>normalize(s.name)===n));
 const leagueSources=sources.filter(s=>s.league===game.league).slice(0,2);
 const nationalSources=nationals.filter(s=>s.league===game.league).slice(0,2);
 const sk=nationals.find(s=>s.name==='SportKlub Hrvatska')!;
 return [...new Map([...clubSources,...leagueSources,...nationalSources,sk,arena].map(s=>[s.id,s])).values()].slice(0,6);
}
export async function discoverMatchHighlights(game:any){
 const age=Date.now()-Date.parse(game.date);if(age<0||age>62*86400000)return [];
 const groups=await Promise.all(matchPublishers(game).map(async publisher=>{
  const source:HighlightSource={...publisher,league:'archive.media'};
  const regional=/SportKlub|ArenaSport/.test(publisher.name);
  const term=(team:any)=>regional?(clubTerms(team)[1]||team.name):team.name;
  const query=`${term(game.home)} ${term(game.away)} ${new Date(game.date).getUTCFullYear()}`;
  const results=await Promise.all([
   (async()=>{try{const r=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${source.id}`,{signal:AbortSignal.timeout(5000)});return r.ok?parseFeed(await r.text(),source):[]}catch{return []}})(),
   (async()=>{try{const r=await fetch(`https://www.youtube.com/channel/${source.id}/search?query=${encodeURIComponent(query)}`,{signal:AbortSignal.timeout(6000),headers:{'Accept-Language':'en-US,en;q=0.9'}});return r.ok?parsePage((await r.text()).slice(0,4000000),source):[]}catch{return []}})()
  ]);
  return mergeHighlights(...results).filter(v=>matchVideo(v,game));
 }));const candidates=mergeHighlights(...groups).slice(0,6);return await Promise.all(candidates.map(async v=>{if(v.publishedAt)return v;try{const r=await fetch(v.url,{signal:AbortSignal.timeout(4000)});if(!r.ok)return v;const text=(await r.text()).slice(0,4000000),stamp=text.match(/\"publishDate\":\"([^\"]+)\"/)?.[1]||text.match(/itemprop=\"datePublished\" content=\"([^\"]+)\"/)?.[1];return stamp?{...v,publishedAt:new Date(stamp).toISOString()}:v}catch{return v}}));
}
export function matchesUploadWindow(v:any,game:any){
 let timestamp=Date.parse(v.publishedAt||''),uncertainty=0;
 if(!Number.isFinite(timestamp)){const m=v.publishedText?.match(/(\d+)\s*(second|minute|min|hour|hr|day|week|wk|month|mo)/i);const units:any={second:1000,minute:60000,min:60000,hour:3600000,hr:3600000,day:86400000,week:604800000,wk:604800000,month:2678400000,mo:2678400000};if(m){const unit=units[m[2].toLowerCase()];if(unit>86400000)return false;timestamp=Date.parse(v.checkedAt)-Number(m[1])*unit;uncertainty=unit;}}
 return Number.isFinite(timestamp)&&timestamp+uncertainty>=Date.parse(game.date)-6*3600000&&timestamp-uncertainty<=Date.parse(game.date)+2*86400000;
}
