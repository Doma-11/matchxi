export const SITE='https://touchline-football-hub.netlify.app';
export function slot(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const day=`${parts.year}-${parts.month}-${parts.day}`,time=`${parts.hour}:${parts.minute}`;
 if(time!=='23:30'&&time!=='12:45')return null;
 const date=new Date(day+'T12:00:00Z');if(time==='12:45')date.setUTCDate(date.getUTCDate()-1);
 return {id:day+'/'+time.replace(':',''),date:date.toISOString().slice(0,10)};
}
export async function api(path:string):Promise<any>{
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(SITE+path,{headers:{'x-touchline-refresh':process.env.TOUCHLINE_REFRESH_SECRET||'','Cache-Control':'no-cache'},signal:AbortSignal.timeout(90000),redirect:'error'});
   if(!response.ok){const error:any=new Error('HTTP '+response.status);error.transient=response.status===429||response.status>=500;throw error;}
   return await response.json();
  }catch(error:any){if(attempt||error.transient===false)throw error;}
 }
}
export async function dispatch(id:string){
 const response=await fetch(SITE+'/.netlify/functions/refresh-background',{method:'POST',headers:{'Content-Type':'application/json','x-touchline-refresh':process.env.TOUCHLINE_REFRESH_SECRET||''},body:JSON.stringify({id}),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(response.status!==202)throw new Error('Worker dispatch HTTP '+response.status);
}
