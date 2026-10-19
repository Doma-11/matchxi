import {reportAccessDenied} from '../../../netlify/lib/report-access';
import {getStore} from '@netlify/blobs';
import {observedUsage} from '../../observed-usage';
import {netlifyUsageForPeriod} from '../../netlify-usage-store';
import {readCatalogue} from '../../catalogue-store';
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function reportPeriod(kind:string,today=localDay()){
 const now=new Date(today+'T12:00:00Z');let start:Date,end:Date;
 if(kind==='monthly'){end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1,12));start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1,12));}
 else{end=new Date(now);end.setUTCDate(end.getUTCDate()-(end.getUTCDay()+6)%7);start=new Date(end);start.setUTCDate(start.getUTCDate()-7);}
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export async function GET(request:Request){
 const denied=await reportAccessDenied(request);if(denied)return denied;
 const url=new URL(request.url),kind=url.searchParams.get('period')||'weekly';if(!['weekly','monthly'].includes(kind))return Response.json({error:'Invalid report period'},{status:400});
 const requested=url.searchParams.get('start');
 const period=reportPeriod(kind),reportStore=getStore({name:'touchline-reports'}),key=`${kind}/${period.start}`;
 const history=await reportStore.list({prefix:kind+'/'}).catch(()=>({blobs:[]}));const dates=history.blobs.map((b:any)=>b.key.split('/')[1]).filter(Boolean).sort().reverse().slice(0,24);
 if(requested){if(!/^\d{4}-\d{2}-\d{2}$/.test(requested))return Response.json({error:'Invalid report date'},{status:400});const archived=await reportStore.get(kind+'/'+requested,{type:'json'}).catch(()=>null);return archived?Response.json({...cleanArchived(archived),netlifyUsage:await netlifyUsageForPeriod((archived as any).start,nextDay((archived as any).end)),history:dates}):Response.json({error:'Report unavailable'},{status:404});}
 const existing:any=await reportStore.get(key,{type:'json'}).catch(()=>null);if(existing?.reportVersion===2)return Response.json({...existing,netlifyUsage:await netlifyUsageForPeriod(period.start,period.end),history:dates});
 const measured=await observedUsage(period.start,period.end);
 const {requests,cacheHits,durationSeconds,errors,counts,daysCovered,truncated,sourceFailures}=measured;
 const [videos,status]=await Promise.all([readCatalogue('video').catch(()=>[]),readCatalogue('status').catch(()=>[])]);
 const endInclusive=new Date(period.end+'T12:00Z');endInclusive.setUTCDate(endInclusive.getUTCDate()-1);

 const report={reportVersion:2,id:key,kind,start:period.start,end:endInclusive.toISOString().slice(0,10),generatedAt:new Date().toISOString(),requests,cacheHits,durationSeconds,errors,daysCovered,truncated,counts,daily:measured.daily,
  checks:[
   {ok:errors===0,title:'Recorded API failures',value:String(errors),explanation:'Observed failures in the app meter. This is not a complete audit of all Netlify invocations.'},
   {ok:true,title:'Recorded response cache hits',value:String(cacheHits),explanation:'Measured cache hits reuse saved responses. They still invoke a Function.'},
   ...(truncated||sourceFailures?[{ok:false,title:'Report data coverage',value:truncated?'Scan limit reached':sourceFailures+' read failures',explanation:'Observed totals are incomplete.'}]:[])
  ],savedHighlights:videos.length,lastRefresh:status.find((s:any)=>s.id==='refresh-run')?.checkedAt||null,
  note:'App activity counts are incomplete lower bounds. Official Netlify charts are separate team-wide measurements, including other projects. No billing or plan changes are made.'};
 await reportStore.setJSON(key,report);return Response.json({...report,netlifyUsage:await netlifyUsageForPeriod(period.start,period.end),history:[period.start,...dates.filter((d:string)=>d!==period.start)]});
}

function nextDay(day:string){return new Date(Date.parse(day+'T12:00Z')+86400000).toISOString().slice(0,10);}
function cleanArchived(report:any){return {...report,checks:(report.checks||[]).filter((c:any)=>['Recorded API failures','Recorded response cache hits','Report data coverage'].includes(c.title))};}
