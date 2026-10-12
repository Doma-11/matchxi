import {timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {collectMatchPoll} from '../../app/match-centre-data';
import {api,SITE} from '../lib/football-schedule';
export default async function(request:Request){
 const expected=Buffer.from(process.env.TOUCHLINE_REFRESH_SECRET||''),provided=Buffer.from(request.headers.get('x-touchline-refresh')||'');if(!expected.length||expected.length!==provided.length||!timingSafeEqual(expected,provided))return;
 const {id}=await request.json() as any;if(!/^\d{4}-\d{2}-\d{2}\/1200$/.test(id||''))return;
 const store=getStore({name:'touchline-scheduled-runs',consistency:'strong'}),job:any=await store.get(id,{type:'json'});if(!job||job.state==='complete'||job.leaseUntil>Date.now())return;
 job.segments=(job.segments||0)+1;if(job.segments>4){job.state='budget-reached';await store.setJSON(id,job);return;}
 job.state='running';job.leaseUntil=Date.now()+14*60000;await store.setJSON(id,job);const deadline=Date.now()+8*60000;
 try{if(!job.games){const day=await api('/api/match-day?'+new URLSearchParams({date:job.date,tz:'Europe/Zagreb'}));job.games=(day.games||[]).filter((g:any)=>!/cancelled|postponed|abandoned/i.test(g.status||''));job.fixtureFailures=day.failures||[];}
 for(;job.index<job.games.length&&Date.now()<deadline;job.index++){const game=job.games[job.index];try{job.results.push(await collectMatchPoll(game))}catch(e:any){job.results.push({id:game.id,league:game.league,failure:e.message})}await store.setJSON(id,job)}
 job.leaseUntil=0;job.state=job.index<job.games.length?'queued':'complete';job.finishedAt=new Date().toISOString();await store.setJSON(id,job);
 if(job.state==='queued'){const r=await fetch(SITE+'/.netlify/functions/votes-background',{method:'POST',headers:{'Content-Type':'application/json','x-touchline-refresh':process.env.TOUCHLINE_REFRESH_SECRET||''},body:JSON.stringify({id}),signal:AbortSignal.timeout(15000),redirect:'error'});if(r.status!==202)throw Error('Vote continuation failed');}
 }catch(e:any){job.leaseUntil=0;job.state='failed';job.failure=e.message;await store.setJSON(id,job);throw Error('Vote snapshot run failed');}
}
