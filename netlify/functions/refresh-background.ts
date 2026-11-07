import {timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {readCatalogue} from '../../app/catalogue-store';
import {dailyFootballReport} from '../../app/daily-football-report';
import {matchVideo,videoMatchDate} from '../../app/football-model';
import {matchesUploadWindow} from '../../app/match-highlight-discovery';
import {api,dispatch} from '../lib/football-schedule';
export default async function(request:Request){
 const secret=Buffer.from(process.env.MATCHXI_REFRESH_SECRET||''),provided=Buffer.from(request.headers.get('x-matchxi-refresh')||'');
 if(!secret.length||secret.length!==provided.length||!timingSafeEqual(secret,provided))return;
 const {id}=await request.json() as {id:string};if(!/^\d{4}-\d{2}-\d{2}\/(2330|1245)$/.test(id||''))return;
 const store=getStore({name:'matchxi-scheduled-runs',consistency:'strong'});let job:any=await store.get(id,{type:'json'});
 if(!job||job.state==='complete'||job.leaseUntil>Date.now())return;
 job.segments=(job.segments||0)+1;
 if(job.segments>4){job.state='budget-reached';job.finishedAt=new Date().toISOString();await store.setJSON(id,job);await dailyFootballReport(job.date);return;}
 job.leaseUntil=Date.now()+14*60000;job.state='running';await store.setJSON(id,job);
 // Leave enough room for two 90-second calls plus one retry each, and writes,
 // beneath Netlify's 15-minute background execution limit.
 const deadline=Date.now()+8*60000;
 try{
  if(!job.games){const day=await api('/api/match-day?'+new URLSearchParams({date:job.date,tz:'Europe/Zagreb'}));job.games=(day.games||[]).filter((g:any)=>g.completed);job.fixtureFailures=day.failures||[];job.index=0;job.results=[];await store.setJSON(id,job);}
  // Two HTTP operations at most. Covered highlights are skipped; final player
  // data is requested for every completed match, reusing saved final values.
  for(;job.index<job.games.length;){
   if(Date.now()>deadline)break;
   // Catalogue writes are read/merge/write; serialize highlight discovery so
   // simultaneous saves cannot overwrite another fixture's new clips.
   const videos=await readCatalogue('video'),batch=job.games.slice(job.index,job.index+1);
   const results=await Promise.all(batch.map(async(g:any)=>{
    const row:any={id:g.id,league:g.league,home:g.home.name,away:g.away.name};
    const covered=videos.some(v=>v.league===g.league&&!/itv/i.test(v.publisher+' '+v.title)&&matchVideo(v,g)&&(videoMatchDate(v)?videoMatchDate(v)===g.date.slice(0,10):matchesUploadWindow(v,g)));
    if(!covered)try{const h=await api('/api/match-highlights?'+new URLSearchParams({league:g.league,home:g.home.name,away:g.away.name,date:job.date,completed:'true',homeScore:String(g.home.score??''),awayScore:String(g.away.score??'')}));row.highlights=h.matches?.length||0;row.highlightFailure=h.failure||null;}catch(e:any){row.highlightFailure=e.message;}
    else row.highlights='already-saved';
    const fixtureId=String(g.id).replace(/^fm-/,'');
    if(/^\d+$/.test(fixtureId))try{const d=await api('/api/match-detail?'+new URLSearchParams({league:g.league,id:fixtureId}));row.playerDataVersion=d.playerDataVersion||0;row.finalPlayerData=d.finalPlayerData||null;}catch(e:any){row.playerFailure=e.message;}
    else row.playerFailure='No supported numeric fixture ID';
    return row;
   }));
   job.results.push(...results);job.index+=batch.length;job.updatedAt=new Date().toISOString();await store.setJSON(id,job);
  }
  job.leaseUntil=0;
  if(job.index<job.games.length){job.state='queued';await store.setJSON(id,job);await dispatch(id);return;}
  await api('/api/catalogue');job.state='complete';job.finishedAt=new Date().toISOString();await store.setJSON(id,job);
  const report=await dailyFootballReport(job.date);
  job.reportId=report.id;job.summary=report.summary;await store.setJSON(id,job);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
  if(new Date(today+'T12:00Z').getUTCDay()===1)await api('/api/usage-reports?period=weekly');
  if(today.endsWith('-01'))await api('/api/usage-reports?period=monthly');
 }catch(e:any){job.leaseUntil=0;job.state='failed';job.failure=e.message;await store.setJSON(id,job);throw new Error('Scheduled football run failed');}
}
