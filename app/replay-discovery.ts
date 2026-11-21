import {sameTeamIdentity,resolveTeamIdentity} from './team-identity';
import {supportedReplayEmbed,type GoalReplay} from './goal-replays';
export type ReplayMatch={home:string;away:string;date:string;league:string;id:string};
export type ReplaySource={url:string;provider:string};
export type DiscoveredReplay=GoalReplay&{sources:ReplaySource[];title:string};
const hosts=new Set(['streamable.com','streamin.link','streamin.me','dubz.co','dubz.link','streamff.com','streamff.pro','streamja.com','clippituser.tv','cazn.me']);
export function replaySource(raw:unknown):ReplaySource|null{
 try{if(typeof raw!=='string'||raw.length>600)return null;const u=new URL(raw),host=u.hostname.replace(/^www\./,'');if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.has(host))return null;
 if(host==='streamable.com'){const embed=supportedReplayEmbed(raw);return embed?{url:embed.videoUrl,provider:'Streamable'}:null;}
 if(!/^\/(?:v|c)\/[a-z0-9_-]+\/?$/i.test(u.pathname)&&!(['streamja.com','clippituser.tv'].includes(host)&&/^\/(?:c\/)?[a-z0-9_-]+\/?$/i.test(u.pathname)))return null;
 return {url:`https://${host}${u.pathname}`,provider:host.startsWith('streamin.')?'Streamin':host.startsWith('dubz.')?'Dubz':host.startsWith('streamff.')?'Streamff':host};
 }catch{return null;}
}
/** Flair can be plain text with emoji or Reddit rich-text segments. */
export function isGoalClipPost(post:any):boolean{
 const labels=[post?.link_flair_text,(Array.isArray(post?.link_flair_richtext)?post.link_flair_richtext:[]).filter((part:any)=>part.e==='text').map((part:any)=>part.t||'').join(' ')];
 return labels.some(label=>typeof label==='string'&&label.replace(/:[^:\s]+:/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim().toLowerCase()==='goal clip');
}
/** One bounded flair-and-team query; no extra polling or per-alias requests. */
export function goalClipQuery(match:ReplayMatch):string{
 const teamQuery=(name:string)=>{
  const team=resolveTeamIdentity(name,{league:match.league});
  const names=[...new Set([name,team?.name,...(team?.aliases||[])].filter((value):value is string=>typeof value==='string'&&value.length>3).map(value=>value.replace(/["\\\x00-\x1f]/g,' ').trim()))].slice(0,5);
  if(!names.length)names.push(name.replace(/["\\\x00-\x1f]/g,' ').trim());
  return '('+names.map(value=>'title:"'+value+'"').join(' OR ')+')';
 };
 return 'flair:"Goal Clip" AND '+teamQuery(match.home)+' AND '+teamQuery(match.away);
}
export function goalFromPost(post:any,match:ReplayMatch):DiscoveredReplay|null{
 if(!post||post.removed_by_category||!isGoalClipPost(post)||(post.is_self&&['[removed]','[deleted]'].includes(post.selftext))||typeof post.title!=='string'||!/^\w{3,16}$/.test(post.id||''))return null;
 const kickoff=Date.parse(match.date),posted=Number(post.created_utc)*1000;if(!Number.isFinite(kickoff)||!Number.isFinite(posted)||posted<kickoff-2*3600000||posted>kickoff+8*3600000)return null;
 const parts=post.title.match(/^(.+?)\s*([\[(]?\d{1,2}[\])]?)\s*[-–]\s*([\[(]?\d{1,2}[\])]?)\s+(.+?)\s+[-–]\s+(.+)$/);
 if(/\b(?:disallowed|offside|miss(?:ed)?|save[ds]?|chance)\b/i.test(post.title))return null;
 if(!parts||!sameTeamIdentity(parts[1].trim(),match.home,{league:match.league})||!sameTeamIdentity(parts[4].trim(),match.away,{league:match.league}))return null;
 const minute=parts[5].match(/\b(\d{1,3}(?:\s*\+\s*\d{1,2})?)\s*[′'’]/);if(!minute||Number(minute[1].split('+')[0])>130)return null;
 const homeScore=Number(parts[2].replace(/\D/g,'')),awayScore=Number(parts[3].replace(/\D/g,''));if(homeScore+awayScore===0)return null;
 const scorer=parts[5].slice(0,minute.index).replace(/[\s(–-]+$/g,'').trim();if(!scorer||scorer.length>100)return null;
 const homeGoal=/[\[(]/.test(parts[2]),awayGoal=/[\[(]/.test(parts[3]);
 const rawSources=[post.url_overridden_by_dest,post.url,...(String(post.selftext||'').slice(0,20000).match(/https:\/\/[^\s<>\])]+/g)||[])];
 const sources=[...new Map(rawSources.map(raw=>replaySource(raw)).filter((source):source is ReplaySource=>Boolean(source)).map(source=>[source.url,source])).values()].slice(0,12);
 return {id:post.id,minute:minute[1].replace(/\s/g,'')+'′',scorer,team:homeGoal!==awayGoal?(homeGoal?match.home:match.away):'',match:`${match.home} vs ${match.away}`,score:`${homeScore}–${awayScore}`,postUrl:`https://www.reddit.com/r/soccer/comments/${post.id}/`,videoUrl:sources[0]?.url||'',testOnly:false,kind:'goal',matchDate:match.date.slice(0,10),sources,title:post.title};
}
export function mirrorSources(payload:any):ReplaySource[]{
 const comments=payload?.[1]?.data?.children;if(!Array.isArray(comments))return [];
 const root=comments.find((x:any)=>x.kind==='t1'&&x.data?.stickied&&x.data.author==='AutoModerator'&&/mirrors\s*\/\s*alternat(?:e|ive)\s*angles/i.test(x.data.body||''));
 const sources:ReplaySource[]=[];let count=0;
 function visit(children:any,depth:number){if(!Array.isArray(children)||depth>3)return;for(const child of children){if(++count>60)return;const d=child?.data;if(child.kind!=='t1'||!d||d.author==='[deleted]'||['[removed]','[deleted]'].includes(d.body))continue;for(const raw of String(d.body||'').match(/https:\/\/[^\s<>\])]+/g)||[]){const source=replaySource(raw.replace(/[.,;]+$/,''));if(source&&!sources.some(x=>x.url===source.url))sources.push(source);}visit(d.replies?.data?.children,depth+1);}}
 visit(root?.data?.replies?.data?.children,0);return sources.slice(0,12);
}
export function mergeReplaySources(goal:DiscoveredReplay,extra:ReplaySource[]):DiscoveredReplay{
 const sources=[...new Map([...goal.sources,...extra].map(s=>[s.url,s])).values()].sort((a,b)=>Number(Boolean(supportedReplayEmbed(b.url)))-Number(Boolean(supportedReplayEmbed(a.url))));
 return {...goal,sources,videoUrl:sources[0]?.url||''};
}
