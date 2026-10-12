import {getStore} from '@netlify/blobs';
import {SITE} from '../lib/football-schedule';
export default async function(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 if(parts.hour!=='12'||parts.minute!=='00')return new Response(null,{status:204});
 const date=`${parts.year}-${parts.month}-${parts.day}`,store=getStore({name:'touchline-scheduled-runs',consistency:'strong'}),id=date+'/1200';
 const prior:any=await store.get(id,{type:'json'});if(prior?.state==='complete'||prior?.leaseUntil>Date.now())return new Response(null,{status:204});
 if(!prior)await store.setJSON(id,{id,date,state:'queued',index:0,results:[],createdAt:new Date().toISOString()});
 const response=await fetch(SITE+'/.netlify/functions/votes-background',{method:'POST',headers:{'Content-Type':'application/json','x-touchline-refresh':process.env.TOUCHLINE_REFRESH_SECRET||''},body:JSON.stringify({id}),signal:AbortSignal.timeout(15000),redirect:'error'});if(response.status!==202)throw Error('Vote snapshot dispatch failed');
 return new Response(null,{status:204});
}
export const config={schedule:'0 10,11 * * *'};
