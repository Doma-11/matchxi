import {getStore} from '@netlify/blobs';
export async function observedUsage(start:string,end:string){
 const store=getStore({name:'matchxi-usage'}),records:any[]=[];let truncated=false,sourceFailures=0;
 for(let day=new Date(start+'T12:00Z');day.toISOString().slice(0,10)<end;day.setUTCDate(day.getUTCDate()+1)){
  const listing=await store.list({prefix:day.toISOString().slice(0,10)+'/'}).catch(()=>{sourceFailures++;return {blobs:[]};});
  const keys=listing.blobs.map((b:any)=>b.key);if(records.length+keys.length>500){truncated=true;break;}
  for(let i=0;i<keys.length;i+=8)records.push(...(await Promise.all(keys.slice(i,i+8).map(k=>store.get(k,{type:'json'}).catch(()=>{sourceFailures++;return null;})))).filter(Boolean));
 }
 const counts:Record<string,number>={},daily:Record<string,number>={};let requests=0,cacheHits=0,durationMs=0,errors=0;
 for(const r of records){requests+=r.requests||0;cacheHits+=r.cacheHits||0;durationMs+=r.durationMs||0;errors+=r.errors||0;daily[r.day]=(daily[r.day]||0)+(r.requests||0);for(const [route,n] of Object.entries(r.routes||{}))counts[route]=(counts[route]||0)+Number(n);}
 return {requests,cacheHits,durationSeconds:Math.round(durationMs/1000),errors,counts,daily,daysCovered:Object.keys(daily).length,truncated,sourceFailures};
}
