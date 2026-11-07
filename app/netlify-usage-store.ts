import {getStore} from '@netlify/blobs';
import {monthRange,usageSeries} from './netlify-usage-model';
import {reportedCharges} from './netlify-usage-model';
const SITE='50f08265-7afe-4542-ad4f-d8a92823d202';
const pending=new Map<string,Promise<any>>();
async function api(path:string,analytics=false):Promise<any>{
 const token=process.env.NETLIFY_USAGE_TOKEN;if(!token)throw Error('Official Netlify usage connection is not configured.');
 const url=(analytics?'https://analytics.services.netlify.com/v2':'https://api.netlify.com/api/v1')+path;
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!r.ok)throw Error('Netlify usage source returned HTTP '+r.status);return r.json();
}
export async function netlifyUsage(date:string){
 const range=monthRange(date),key=range.start,store=getStore({name:'matchxi-netlify-usage'});
 if(pending.has(key))return pending.get(key);
 const work=(async()=>{
  const saved:any=await store.get(key,{type:'json'}).catch(()=>null);
  // At most one external collection per month/range per 12 hours, including failures.
  if(saved&&Date.now()-Date.parse(saved.checkedAt)<12*3600000)return saved;
  const checkedAt=new Date().toISOString(),previous=saved?.data||null;
  try{
   const site=await api('/sites/'+SITE);if(site.id!==SITE||!site.account_slug)throw Error('Netlify project ownership could not be verified.');
   const account=await api('/accounts/'+encodeURIComponent(site.account_slug));if(!account.id)throw Error('Netlify team unavailable.');
   const from=Date.parse(range.start+'T00:00Z'),to=Math.min(Date.now(),Date.parse(range.end+'T00:00Z'));
   const p=new URLSearchParams({from:String(from),to:String(to),resolution:'day',timezone:'Europe/Zagreb'});
   // Keep source concurrency at two. Read-only requests only; no billing mutations.
   const [functions,bandwidth]=await Promise.allSettled([api('/accounts/'+encodeURIComponent(account.id)+'/usage_insights/functions?'+p,true).then(r=>usageSeries(r,'functions')),api('/accounts/'+encodeURIComponent(account.id)+'/bandwidth/timeseries?'+p).then(r=>usageSeries(r,'bandwidth'))]);
   const [counter,subscription]=await Promise.allSettled([api('/accounts/'+encodeURIComponent(site.account_slug)+'/bandwidth'),api('/accounts/'+encodeURIComponent(account.id)+'/subscription')]);
   const costs=await api('/accounts/'+encodeURIComponent(account.id)+'/subscription/usage_costs').catch(()=>null);
   const data={range,team:site.account_slug,scope:'Entire Netlify team, including other projects',checkedAt,
    functions:functions.status==='fulfilled'?{points:functions.value,limit:account.capabilities?.credit_features?.included?null:account.capabilities?.functions?.included??null,checkedAt}:previous?.functions||null,
    bandwidth:bandwidth.status==='fulfilled'?{points:bandwidth.value,checkedAt}:previous?.bandwidth||null,
    billingBandwidth:counter.status==='fulfilled'?{used:counter.value.used,included:counter.value.included,start:counter.value.period_start_date,end:counter.value.period_end_date,updatedAt:counter.value.last_updated_at}:previous?.billingBandwidth||null,
    charges:subscription.status==='fulfilled'?reportedCharges(subscription.value,costs):null,
    failures:[...(functions.status==='rejected'?['Function usage: '+functions.reason.message]:[]),...(bandwidth.status==='rejected'?['Bandwidth: '+bandwidth.reason.message]:[]),...(counter.status==='rejected'?['Current bandwidth counter unavailable.']:[]),...(subscription.status==='rejected'||costs===null?['Current subscription charges unavailable.']:[])]};
   const result={checkedAt,data,failure:null};await store.setJSON(key,result);return result;
  }catch(e){const result={checkedAt,data:previous,failure:e instanceof Error?e.message:'Netlify usage unavailable'};await store.setJSON(key,result).catch(()=>{});return result;}
 })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
}

export async function netlifyUsageForPeriod(start:string,end:string){
 const last=new Date(Date.parse(end+'T12:00Z')-86400000).toISOString().slice(0,10),months=[await netlifyUsage(start)];
 if(last.slice(0,7)!==start.slice(0,7))months.push(await netlifyUsage(last));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
 if(!months.some(m=>m.data?.range?.start?.startsWith(today.slice(0,7))))months.push(await netlifyUsage(today));
 return {start,end,months};
}
