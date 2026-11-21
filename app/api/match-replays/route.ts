import {goalClipQuery,goalFromPost,mirrorSources,mergeReplaySources,type ReplayMatch} from '../../replay-discovery';
// No public JSON scraping or alternate-domain fallback. Enable only with approved OAuth access.
const cache=new Map<string,{at:number;data:any}>(),pending=new Map<string,Promise<any>>();
let cooldownUntil=0;
const TTL=45000;
export function createReplayDiscovery({fetcher=fetch,env=(key:string)=>process.env[key],now=()=>Date.now()}={}){
 let token:{value:string;expires:number}|null=null;
 return async function discover(match:ReplayMatch){
  if(env('MATCHXI_REDDIT_ENABLED')!=='true'||!env('MATCHXI_REDDIT_USER_AGENT')||!(env('MATCHXI_REDDIT_ACCESS_TOKEN')||(env('MATCHXI_REDDIT_CLIENT_ID')&&env('MATCHXI_REDDIT_CLIENT_SECRET')&&env('MATCHXI_REDDIT_REFRESH_TOKEN'))))return {replays:[],code:'REDDIT_NOT_CONFIGURED',error:'Reddit search isn’t connected.'};
  const key=JSON.stringify(match),saved=cache.get(key);if(saved&&now()-saved.at<TTL)return {...saved.data,cached:true};
  if(now()<cooldownUntil)return {replays:[],code:'REDDIT_RATE_LIMITED',error:'Reddit is limiting requests. Wait a minute before refreshing.'};
  if(pending.has(key))return pending.get(key);
  const work=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
   try{
    let access=env('MATCHXI_REDDIT_ACCESS_TOKEN');
    if(!access){if(!token||token.expires<now()+60000){const r=await fetcher('https://www.reddit.com/api/v1/access_token',{method:'POST',redirect:'error',signal:controller.signal,headers:{Authorization:'Basic '+Buffer.from(env('MATCHXI_REDDIT_CLIENT_ID')+':'+env('MATCHXI_REDDIT_CLIENT_SECRET')).toString('base64'),'User-Agent':env('MATCHXI_REDDIT_USER_AGENT')!,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:env('MATCHXI_REDDIT_REFRESH_TOKEN')!})});if(!r.ok)throw Error('REDDIT_ACCESS_DENIED');const d:any=await r.json();if(typeof d.access_token!=='string'||!d.access_token)throw Error('REDDIT_ACCESS_DENIED');token={value:d.access_token,expires:now()+Math.min(Number(d.expires_in)||3600,3600)*1000};}access=token.value;}
    const get=async(path:string)=>{const r=await fetcher('https://oauth.reddit.com'+path,{redirect:'error',signal:controller.signal,headers:{Authorization:'Bearer '+access,'User-Agent':env('MATCHXI_REDDIT_USER_AGENT')!}});
     if(r.status===429||Number(r.headers.get('x-ratelimit-remaining')??100)<1){cooldownUntil=now()+Math.min(3600,Math.max(60,Number(r.headers.get('retry-after')||r.headers.get('x-ratelimit-reset'))||60))*1000;throw Error('REDDIT_RATE_LIMITED');}if(r.status===401||r.status===403)throw Error('REDDIT_ACCESS_DENIED');if(!r.ok)throw Error('REDDIT_UNAVAILABLE');return r.json() as Promise<any>;};
    const q=new URLSearchParams({q:goalClipQuery(match),restrict_sr:'on',sort:'new',t:'week',limit:'50',raw_json:'1'});
    const listing=await get('/r/soccer/search?'+q);if(!Array.isArray(listing?.data?.children))throw Error('REDDIT_UNAVAILABLE');
    const candidates=listing.data.children.map((x:any)=>goalFromPost(x.data,match)).filter(Boolean).slice(0,8),replays=[];let notice='';
    for(const goal of candidates){try{const comments=await get(`/r/soccer/comments/${goal.id}?limit=40&depth=4&raw_json=1`);const merged=mergeReplaySources(goal,mirrorSources(comments));if(merged.sources.length)replays.push(merged);}catch(e){if(goal.sources.length)replays.push(goal);if((e as Error).message==='REDDIT_RATE_LIMITED'){notice='Some mirrors could not be checked because Reddit limited requests.';break;}throw e;}}
    const data={replays:replays.sort((a,b)=>parseInt(a.minute)-parseInt(b.minute)),checkedAt:new Date(now()).toISOString(),notice};
    if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{at:now(),data});return data;
   }catch(e){const code=(e as Error).message;return {replays:[],code:['REDDIT_ACCESS_DENIED','REDDIT_RATE_LIMITED'].includes(code)?code:'REDDIT_UNAVAILABLE',error:code==='REDDIT_ACCESS_DENIED'?'Reddit access was denied. The owner must connect approved API access.':code==='REDDIT_RATE_LIMITED'?'Reddit is limiting requests. Wait before refreshing.':'Replay search is temporarily unavailable. Try again later or paste a supported video link.'};}finally{clearTimeout(timer);}
  })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
 };
}
const discover=createReplayDiscovery();
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,match={home:p.get('home')||'',away:p.get('away')||'',date:p.get('date')||'',league:p.get('league')||'',id:p.get('id')||''};
 const kickoff=Date.parse(match.date),age=Date.now()-kickoff;
 if(p.get('live')!=='true'||!match.home||!match.away||[match.home,match.away].some(x=>x.length>120||/[\x00-\x1f]/.test(x))||!/^[-\w.]{1,40}$/.test(match.league)||!/^[-\w]{1,80}$/.test(match.id)||!Number.isFinite(kickoff)||age< -2*3600000||age>30*3600000)return Response.json({error:'Choose a current live match before finding replays.'},{status:400});
 const data=await discover(match);return Response.json(data,{status:data.code?503:200,headers:{'Cache-Control':'private, no-store'}});
}
