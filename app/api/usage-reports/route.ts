import {getStore} from '@netlify/blobs';
import {readCatalogue} from '../../catalogue-store';
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function reportPeriod(kind:string,today=localDay()){
 const now=new Date(today+'T12:00:00Z');let start:Date,end:Date;
 if(kind==='monthly'){end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1,12));start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1,12));}
 else{end=new Date(now);end.setUTCDate(end.getUTCDate()-(end.getUTCDay()+6)%7);start=new Date(end);start.setUTCDate(start.getUTCDate()-7);}
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export async function GET(request:Request){
 const url=new URL(request.url),kind=url.searchParams.get('period')||'weekly';if(!['weekly','monthly'].includes(kind))return Response.json({error:'Invalid report period'},{status:400});
 const requested=url.searchParams.get('start');
 const period=reportPeriod(kind),reportStore=getStore({name:'touchline-reports'}),key=`${kind}/${period.start}`;
 const history=await reportStore.list({prefix:kind+'/'}).catch(()=>({blobs:[]}));const dates=history.blobs.map((b:any)=>b.key.split('/')[1]).filter(Boolean).sort().reverse().slice(0,24);
 if(requested){if(!/^\d{4}-\d{2}-\d{2}$/.test(requested))return Response.json({error:'Invalid report date'},{status:400});const archived=await reportStore.get(kind+'/'+requested,{type:'json'}).catch(()=>null);return archived?Response.json({...archived as any,history:dates}):Response.json({error:'Report unavailable'},{status:404});}
 const existing=await reportStore.get(key,{type:'json'}).catch(()=>null);if(existing)return Response.json({...existing as any,history:dates});
 const usage=getStore({name:'touchline-usage'}),records:any[]=[];let truncated=false;
 // Bounded report scan: never read unlimited records just to produce a report.
 for(let day=new Date(period.start+'T12:00Z');day.toISOString().slice(0,10)<period.end;day.setUTCDate(day.getUTCDate()+1)){
  const prefix=day.toISOString().slice(0,10)+'/';const listing=await usage.list({prefix}).catch(()=>({blobs:[]}));
  const keys=listing.blobs.map((b:any)=>b.key);if(records.length+keys.length>500){truncated=true;break;}
  for(let i=0;i<keys.length;i+=8){const rows=await Promise.all(keys.slice(i,i+8).map(k=>usage.get(k,{type:'json'}).catch(()=>null)));records.push(...rows.filter(Boolean));}
 }
 const counts:Record<string,number>={};let requests=0,durationMs=0,errors=0,cacheHits=0;
 for(const r of records){requests+=r.requests||0;cacheHits+=r.cacheHits||0;durationMs+=r.durationMs||0;errors+=r.errors||0;for(const [route,n] of Object.entries(r.routes||{}))counts[route]=(counts[route]||0)+Number(n);}
 const [videos,status]=await Promise.all([readCatalogue('video').catch(()=>[]),readCatalogue('status').catch(()=>[])]);
 const endInclusive=new Date(period.end+'T12:00Z');endInclusive.setUTCDate(endInclusive.getUTCDate()-1);
 const daysCovered=new Set(records.map(r=>r.day)).size;
 const report={id:key,kind,start:period.start,end:endInclusive.toISOString().slice(0,10),generatedAt:new Date().toISOString(),requests,cacheHits,durationSeconds:Math.round(durationMs/1000),errors,daysCovered,truncated,counts,
  checks:[
   {ok:true,title:'Paid data services',value:'None configured',explanation:'This app uses public sources and embedded videos.'},
   {ok:true,title:'Background work',value:'Two targeted highlight checks daily',explanation:'Skip covered games. One daily noon fan-vote snapshot. Live polling stops when hidden or inactive.'},
   {ok:errors===0,title:'Recorded API failures',value:String(errors),explanation:'Only failures captured by app metering; publisher availability may vary.'},
   {ok:requests<(kind==='weekly'?2500:10000),title:'Recorded origin calls',value:requests.toLocaleString(),explanation:'Compared with a personal-use budget of '+(kind==='weekly'?'2,500 per week.':'10,000 per month.')+' Counts are incomplete lower bounds.'},
   {ok:true,title:'Response caching',value:cacheHits+' recorded cache hits',explanation:'Saved responses avoid repeated source searches. CDN-served calls are not included here.'},
   {ok:false,title:'Bandwidth and image delivery',value:'Not measured',explanation:'Includes assets, image downloads and function responses. Cached images still use delivery bandwidth.'},
   {ok:false,title:'Billed compute and build minutes',value:'Not verified',explanation:'Recorded handler time excludes cold starts and metering. Hosted builds and all other projects are absent.'},
   {ok:false,title:'Shared Netlify allowance',value:'Not verified',explanation:'Actual bandwidth, billed compute, CDN requests, builds and other projects require Netlify Usage & billing.'},
   {ok:false,title:'Measurement coverage',value:daysCovered+' days with recorded activity',explanation:truncated?'Scan cap reached; totals are incomplete.':'Batched origin snapshots can miss final requests. No activity before metering began is recoverable.'}
  ],savedHighlights:videos.length,lastRefresh:status.find((s:any)=>s.id==='refresh-run')?.checkedAt||null,
  note:'Green marks describe measured checks or configured savings. They do not guarantee remaining quota. Red marks mean high usage, an error or information needing verification. No report enables paid services.'};
 await reportStore.setJSON(key,report);return Response.json({...report,history:[period.start,...dates.filter((d:string)=>d!==period.start)]});
}
