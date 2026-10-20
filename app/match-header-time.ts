/** Match-header labels use the same local timezone as the match calendar. */
export function matchHeaderTime(date:string,now=Date.now(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Zagreb'){
 const kickoff=new Date(date),current=new Date(now);
 if(!Number.isFinite(kickoff.getTime()))return {time:'TBC',day:'Date to be confirmed'};
 const dayKey=(value:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone,hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).format(kickoff);
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',month:'short',day:'numeric'}).formatToParts(kickoff);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 return {time,day:dayKey(kickoff)===dayKey(current)?'Today':`${part('weekday')} ${part('month')} ${part('day')}`};
}
