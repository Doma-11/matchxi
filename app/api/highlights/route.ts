import {NextRequest,NextResponse} from '../../netlify-request';
import sources from '../../highlight-sources.json';
import clubs from '../../../public/data/clubs.json';
import {mentionsClub,normalize,clubTerms} from '../../football-model';
import snapshot from '../../../public/data/highlights.json';
import {getSeason,mergeHighlights,parseFeed,parsePage,type Highlight,type HighlightSource} from '../../highlights-data';
const valid=new Set(['eng.1','esp.1','ita.1','ger.1','cro.1','uefa.champions','uefa.europa','uefa.europa.conf']);
const cache=new Map<string,{at:number;response:any}>();
export async function GET(req:NextRequest){
 const league=req.nextUrl.searchParams.get('league')||'eng.1',query=(req.nextUrl.searchParams.get('q')||'').trim().slice(0,100);if(!valid.has(league))return NextResponse.json({error:'Unknown league'},{status:400});
 const key=league+':'+query.toLowerCase(),cached=cache.get(key);if(cached&&Date.now()-cached.at<300000)return NextResponse.json(cached.response);
 const publishers=sources.filter(s=>s.league===league),checkedAt=new Date().toISOString();let successes=0;
 const picked=(clubs as Record<string,any[]>)[league]?.find(c=>normalize(c.name)===normalize(query));const searchTerm=picked?(clubTerms(picked)[1]||picked.name):query;
 const feedJobs=query?[]:publishers.map(async s=>{try{const r=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${s.id}`,{signal:AbortSignal.timeout(7000)});if(!r.ok)return [];const xml=await r.text();if(!xml.includes('<feed'))return [];successes++;return parseFeed(xml,s,checkedAt);}catch{return [];}});
 const searchSources=query?publishers.slice(0,6):[publishers[0]];
 const pageJobs=searchSources.map(async s=>{try{const r=await fetch(`https://www.youtube.com/channel/${s.id}/search?query=${encodeURIComponent((searchTerm?searchTerm+' ':'')+(league==='cro.1'?`SuperSportHNL ${String(getSeason()).slice(-2)}/${String(getSeason()+1).slice(-2)}`:'highlights '+getSeason()))}`,{signal:AbortSignal.timeout(9000),headers:{'Accept-Language':'en-US,en;q=0.9'}});if(!r.ok)return [];const html=(await r.text()).slice(0,4000000);const v=parsePage(html,s,checkedAt);if(v.length)successes++;return v;}catch{return [];}});
 const groups=await Promise.all([...feedJobs,...pageJobs]);const saved=(snapshot.matches as Highlight[]).filter(v=>v.league===league&&v.season===getSeason());
 const matches=mergeHighlights(saved,...groups).filter(v=>!query||(picked?mentionsClub(v,picked):normalize(v.title+' '+v.publisher).includes(normalize(query))));
 const response={matches,checkedAt,source:'Official league and club YouTube channels',live:successes>0,snapshotAt:snapshot.checkedAt,notice:successes?'Official public highlights · no account or keys required.':'Live refresh is temporarily unavailable. Showing saved official highlights.',publishers:publishers.map(s=>({name:s.name,url:s.url}))};
 if(cache.size>100)cache.clear();cache.set(key,{at:Date.now(),response});return NextResponse.json(response,{headers:{'Cache-Control':'private, max-age=60'}});
}
