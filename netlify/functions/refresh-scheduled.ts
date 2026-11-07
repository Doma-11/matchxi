import {getStore} from '@netlify/blobs';
import {slot,dispatch} from '../lib/football-schedule';
export default async function(){
 if(process.env.MATCHXI_ENABLE_SCHEDULES!=='true')return new Response(null,{status:204});
 const run=slot();if(!run)return new Response(null,{status:204});
 const store=getStore({name:'touchline-scheduled-runs',consistency:'strong'});
 const previous:any=await store.get(run.id,{type:'json'});
 if(previous&&(previous.state==='complete'||previous.leaseUntil>Date.now()))return new Response(null,{status:204});
 if(!previous)await store.setJSON(run.id,{...run,state:'queued',createdAt:new Date().toISOString(),segments:0});
 await dispatch(run.id);return new Response(null,{status:204});
}
// UTC candidate times plus a local guard preserve the schedule across DST.
// Schedule not registered until MatchXI deployment is independently verified.
