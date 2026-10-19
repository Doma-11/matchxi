export type UsagePoint={date:string;at:string;value:number};
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function usageSeries(raw:any,metric:'functions'|'bandwidth'):UsagePoint[]{
 if(!Array.isArray(raw?.data))throw Error('Unexpected Netlify metrics response');
 return raw.data.map((r:any)=>{const at=new Date(r.start),value=metric==='functions'?r.values?.count:r.accountBandwidth;if(!Number.isFinite(at.getTime())||!number(value))throw Error('Invalid Netlify metric');return {date:at.toISOString().slice(0,10),at:at.toISOString(),value};}).sort((a:UsagePoint,b:UsagePoint)=>a.at.localeCompare(b.at));
}
export function sumUsage(rows:UsagePoint[],start:string,end:string){return rows.filter(r=>r.date>=start&&r.date<end).reduce((n,r)=>n+r.value,0);}
export function reportedCharges(subscription:any,costs:any){
 // Empty usage-cost rows are a real API result, not a substitute for a failed fetch.
 if(subscription?.amount!==0||!Array.isArray(costs))return null;
 if(costs.length)return null; // Unknown line-item schemas must not silently undercount charges.
 return {plan:subscription.title||'Netlify plan',planAmount:subscription.amount,usageAmount:0,total:subscription.amount,currency:'USD',scope:'Current subscription plan and reported usage charges; excludes domains, tax and finalized invoices.'};
}
export function monthRange(date:string){const start=date.slice(0,7)+'-01',d=new Date(start+'T12:00Z');d.setUTCMonth(d.getUTCMonth()+1);return {start,end:d.toISOString().slice(0,10)};}
