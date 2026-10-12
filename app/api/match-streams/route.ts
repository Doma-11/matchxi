import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {listedMatchStreams} from '../../match-streams';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,home=p.get('home')||'',away=p.get('away')||'',date=p.get('date')||'',id=p.get('id')||'',league=p.get('league')||'';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
 const yesterday=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date(Date.now()-86400000));
 if(p.get('live')!=='true'||!home||!away||home.length>120||away.length>120||!/^[-\w]{1,80}$/.test(id)||!/^[-\w.]{1,40}$/.test(league)||![today,yesterday].includes(date))return Response.json({error:'Stream listings are only checked for current live matches.'},{status:400});
 const source='https://www.soccerstreams.zone/',store=getStore({name:'touchline-stream-listings'}),key='match-'+createHash('sha256').update(league+'|'+id+'|'+date).digest('hex');
 try{
  const saved:any=await store.get(key,{type:'json'});
  if(saved?.streams?.length)return Response.json(saved);
  const r=await fetch(source,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Stream listing source unavailable');
  const streams=listedMatchStreams(await r.text(),home,away);
  const result={streams,source,checkedAt:new Date().toISOString(),notice:'External listings only. Playback, broadcast rights and availability are not verified.'};
  if(streams.length)await store.setJSON(key,result);
  return Response.json(result);
 }catch{return Response.json({error:'Stream listings are temporarily unavailable. Try again later.'},{status:502});}
}
