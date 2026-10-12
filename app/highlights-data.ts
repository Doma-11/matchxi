export function allowedPublisher(video:any){return !/\bitv\b|itvsport/i.test([video.title,video.publisher,video.publisherUrl,video.name,video.url].join(' '));}
export type HighlightSource={name:string;id:string;league:string;url:string};
export type Highlight={embedAllowed?:boolean;id:string;title:string;competition:string;league:string;publisher:string;publisherUrl:string;thumbnail:string;publishedAt:string|null;publishedText:string;checkedAt:string;season:number;url:string;videos:{title:string;id:string;src:string}[]};
export function getSeason(now=new Date()){return now.getUTCFullYear()-(now.getUTCMonth()<6?1:0);}
export function highlightCandidate(title:string,publishedAt:string|null,publishedText:string,now=new Date()){
 const season=getSeason(now);if(!/(sažet|sazet|SuperSport\s*HNL|highlight|resumen|résumé|resume|best.{0,24}(?:goals?|saves?)|top\s*\d+.{0,24}(?:goals?|saves?)|goals? of the|saves? of the|compilation|najbolj.{0,20}(?:gol|obran)|\bweek\s*\d|\bmatchday\s*\d)/i.test(title))return false;
 if(/classic|pre.?season|friendly|academy|\bpl2\b|women|\bwsl\b|primavera|under.?\d|\bu-?\d{2}s?\b|youth|futsal|segunda|hypermotion|SuperSport\s*1NL|SuperSport\s*HMNL|\bPrva NL\b|DINAMO II|bundesliga 2|\b2\. bundesliga|ligue 2|championship|fa cup|carabao|champions league|europa league|conference league|troph[eé]e des champions/i.test(title))return false;
 const years=Array.from(title.matchAll(/(?:20)?(\d{2})\s*[/-]\s*(?:20)?(\d{2})/g)).filter(m=>Number(m[2])===Number(m[1])+1);if(years.length)return years.some(m=>2000+Number(m[1])===season);
 if(publishedAt)return new Date(publishedAt).getTime()>=Date.UTC(season,6,1)&&new Date(publishedAt).getTime()<Date.UTC(season+1,6,1);
 const age=publishedText.match(/(\d+)\s*(second|minute|min|hour|hr|day|week|wk|month|mo|year)/i);if(!age)return false;const units:Record<string,number>={second:1000,minute:60000,min:60000,hour:3600000,hr:3600000,day:86400000,week:604800000,wk:604800000,month:2678400000,mo:2678400000,year:31536000000};return now.getTime()-Number(age[1])*units[age[2].toLowerCase()]>=Date.UTC(season,6,1);
}
export function nationalCandidate(title:string,publishedAt:string|null,publishedText:string,league:string,now=new Date()){
 if(/classic|socca|futsal|women|zensk|basket|kosark|rukomet|handball|tennis|tenis|odboj|volley|podcast|u.?21|u.?19|u.?17|under.?\d|youth/i.test(title))return false;
 if(league==='archive.media')return /highlight|sa[zž]et|resumen|r[eé]sum[eé]|golov|goals?|\bvs\b|\d+\s*[-:]\s*\d+/i.test(title)&&!/interview|reakcija|reaction|izbornik|trener|press conference|podcast/i.test(title);
 if(['uefa.champions','uefa.europa','uefa.europa.conf'].includes(league))return /highlight|sažet|sazet|resumen|best.{0,24}(?:goals?|saves?)|top\s*\d+.{0,24}(?:goals?|saves?)|goals? of the|saves? of the|compilation/i.test(title)&&({'uefa.champions':/champions league|\bUCL\b/i,'uefa.europa':/europa league|\bUEL\b/i,'uefa.europa.conf':/conference league|\bUECL\b/i} as any)[league].test(title)&&(!publishedAt||new Date(publishedAt).getTime()>=Date.UTC(getSeason(now),6,1));
 if(league==='hr.media')return (/hrvatsk|bilic|modric|vatren/i.test(title)&&/nogomet|lig[auie] nac|bilic|modric|sazetak|sažetak|golov|goal|highlight/i.test(title))||(/lig[auie] nac|nations league/i.test(title)&&/golov|goal|highlight|sažet|sazet|resumen/i.test(title));
 if(!/highlight|resumen|résumé|resume|sažet|sazet/i.test(title))return false;
 if(league==='fifa.world')return /world cup|coupe du monde|copa mundial|svjetsk|FIFA/i.test(title)&&/2026|world cup 26|coupe du monde 26/i.test(title)&&!/2022|2018|2014|club world|clubs|klub|ASEAN/i.test(title);
 if(league==='uefa.euro')return (/euro.*2024|2024.*euro/i.test(title)||/euro/i.test(title)&&!!publishedAt&&new Date(publishedAt).getUTCFullYear()===2024)&&!/qualif|kvalifik/i.test(title);
 if(!/nations league|ligue des nations|lig[auie] nac/i.test(title))return false;
 if(/2025|2024|2023|2022|2021|2020|2019|2018/.test(title))return false;
 if(publishedAt)return new Date(publishedAt).getTime()>=Date.UTC(2026,8,1);
 const age=publishedText.match(/(\d+)\s*(hour|hr|day|week|wk|month|mo|year)/i);if(!age)return /2026|26.?27/.test(title);const n=Number(age[1]),unit=age[2].toLowerCase();return !unit.startsWith('year')&&(unit.startsWith('mo')?n<=1:unit.startsWith('w')?n<=4:true);
}
function clean(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
export function makeHighlight(id:string,title:string,source:HighlightSource,publishedAt:string|null,publishedText:string,checkedAt=new Date().toISOString()):Highlight|null{
 if(!allowedPublisher({...source,title})||!/^[\w-]{11}$/.test(id)||!title||!(source.league.includes('.1')?highlightCandidate(title,publishedAt,publishedText,new Date(checkedAt)):nationalCandidate(title,publishedAt,publishedText,source.league,new Date(checkedAt))))return null;
 const names:Record<string,string>={'eng.1':'Premier League','esp.1':'La Liga','ita.1':'Serie A','ger.1':'Bundesliga','cro.1':'SuperSport HNL','uefa.nations':'UEFA Nations League','fifa.world':'FIFA World Cup 2026','uefa.euro':'UEFA EURO 2024','hr.media':'Croatia · SportKlub'};
 return {id,title,competition:names[source.league],league:source.league,publisher:source.name,publisherUrl:source.url,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,publishedAt,publishedText,checkedAt,season:getSeason(new Date(checkedAt)),url:`https://www.youtube.com/watch?v=${id}`,videos:[{title:'Official highlights',id,src:`https://www.youtube-nocookie.com/embed/${id}`}]};
}
export function parseFeed(xml:string,source:HighlightSource,checkedAt=new Date().toISOString()){
 const out:Highlight[]=[];for(const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)){const tag=(t:string)=>m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1]||'';const v=makeHighlight(tag('yt:videoId'),clean(tag('title')),source,tag('published')||null,'',checkedAt);if(v)out.push(v);}return out;
}
export function parsePage(html:string,source:HighlightSource,checkedAt=new Date().toISOString()){
 const match=html.match(/var ytInitialData\s*=\s*([\s\S]*?);<\/script>/);if(!match)return [];let data:any;try{data=JSON.parse(match[1]);}catch{return [];}const out:Highlight[]=[],seen=new Set<string>();let visited=0;
 function walk(x:any,depth=0){if(!x||depth>45||++visited>180000)return;if(Array.isArray(x)){x.forEach(v=>walk(v,depth+1));return;}if(typeof x!=='object')return;let id='',title='',age='';if(x.videoRenderer){const v=x.videoRenderer;id=v.videoId;title=v.title?.simpleText||v.title?.runs?.map((r:any)=>r.text).join('')||'';age=v.publishedTimeText?.simpleText||'';}if(x.lockupViewModel){const v=x.lockupViewModel,m=v.metadata?.lockupMetadataViewModel;id=v.contentId;title=m?.title?.content||'';const rows=m?.metadata?.contentMetadataViewModel?.metadataRows||[];age=rows.flatMap((r:any)=>r.metadataParts||[]).map((p:any)=>p.text?.content||'').find((s:string)=>/ago|Streamed|Premiered/.test(s))||'';}if(id&&!seen.has(id)){seen.add(id);const v=makeHighlight(id,title,source,null,age,checkedAt);if(v)out.push(v);}for(const v of Object.values(x))walk(v,depth+1);}
 walk(data);return out;
}
export function mergeHighlights(...groups:Highlight[][]){const map=new Map<string,Highlight>();for(const group of groups)for(const v of group){if(!allowedPublisher(v))continue;const old=map.get(v.id);if(!old||v.publishedAt||!old.publishedAt)map.set(v.id,{...old,...v,publishedAt:v.publishedAt||old?.publishedAt||null,embedAllowed:old?.embedAllowed??v.embedAllowed});}return Array.from(map.values()).sort((a,b)=>Number(a.embedAllowed===false)-Number(b.embedAllowed===false)||(b.publishedAt||b.checkedAt).localeCompare(a.publishedAt||a.checkedAt));}
