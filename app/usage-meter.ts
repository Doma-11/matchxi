import {getStore} from '@netlify/blobs';
import {randomUUID} from 'node:crypto';
const instance=randomUUID(),days=new Map<string,any>();
const dayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Batched snapshots minimise metering overhead. They are observed lower bounds,
// not a substitute for Netlify's complete team billing counters.
export async function meter(route:string,handler:()=>Promise<Response>){
 const start=performance.now();let response:Response;
 try{response=await handler()}catch(e){throw e}
 if(route==='usage-reports')return response;
 const day=dayKey(),old=days.get(day)||{day,firstSeen:new Date().toISOString(),requests:0,durationMs:0,responseBytes:0,errors:0,cacheHits:0,routes:{},flushed:0};
 old.requests++;old.cacheHits+=(response.headers.get('X-Touchline-Cache')==='hit'?1:0);old.durationMs+=performance.now()-start;old.errors+=response.status>=400?1:0;
 const length=Number(response.headers.get('Content-Length'));
 // Only count explicitly known bytes; avoid copying large image/JSON bodies.
 if(length>0)old.responseBytes+=length;
 old.routes[route]=(old.routes[route]||0)+1;old.lastSeen=new Date().toISOString();days.set(day,old);
 if(Date.now()-old.flushed>=60000){old.flushed=Date.now();await getStore({name:'matchxi-usage'}).setJSON(`${day}/${instance}`,old).catch(()=>{});}
 return response;
}
