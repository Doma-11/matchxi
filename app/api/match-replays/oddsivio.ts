import {oddsivioFixtures,oddsivioRecentMatches,oddsivioGoals,sameReplayFixture,type ReplayFixture} from '../../oddsivio-replays';
import type {ReplayMatch} from '../../replay-discovery';

const ORIGIN='https://www.oddsivio.com',TTL=45000;
export function createOddsivioDiscovery({fetcher=fetch,now=()=>Date.now()}={}){
 const cache=new Map<string,{at:number;data:any}>(),pending=new Map<string,Promise<any>>();
 let fixtures:{at:number;data:ReplayFixture[]}|null=null,fixturesPending:Promise<ReplayFixture[]>|null=null,cooldown=0;
 async function page(path:string,signal:AbortSignal):Promise<string>{
  const response=await fetcher(ORIGIN+path,{redirect:'error',cache:'no-store',signal,headers:{Accept:'text/html'}});
  if(response.status===429||response.status===403){cooldown=now()+Math.min(3600,Math.max(60,Number(response.headers.get('retry-after'))||60))*1000;await response.body?.cancel();throw Error(response.status===429?'REPLAY_SOURCE_RATE_LIMITED':'REPLAY_SOURCE_ACCESS_DENIED');}
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('text/html')){await response.body?.cancel();throw Error('REPLAY_SOURCE_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw Error('REPLAY_SOURCE_UNAVAILABLE');const decoder=new TextDecoder();let size=0,html='';
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();throw Error('REPLAY_SOURCE_UNAVAILABLE');}html+=decoder.decode(value,{stream:true});}return html+decoder.decode();
 }
 async function index(signal:AbortSignal){
  if(fixtures&&now()-fixtures.at<TTL)return fixtures.data;
  if(fixturesPending)return fixturesPending;
  fixturesPending=(async()=>{const data=oddsivioFixtures(await page('/matches',signal));fixtures={at:now(),data};return data;})();
  try{return await fixturesPending;}finally{fixturesPending=null;}
 }
 return async function discover(match:ReplayMatch){
  const key=JSON.stringify(match),saved=cache.get(key);if(saved&&now()-saved.at<TTL)return {...saved.data,cached:true};
  if(now()<cooldown)return {replays:[],code:'REPLAY_SOURCE_RATE_LIMITED',error:'Please wait before refreshing.'};
  if(pending.has(key))return pending.get(key);
  const work=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);try{
   const candidates=(await index(controller.signal)).filter(fixture=>sameReplayFixture(fixture,match));
   if(candidates.length>1)throw Error('REPLAY_MATCH_MISMATCH');
   let id=candidates.length===1?candidates[0].id:null;
   if(!id){const ids=oddsivioRecentMatches(await page('/highlights',controller.signal),match);if(ids.length===1)id=ids[0];}
   if(!id)return {replays:[],checkedAt:new Date(now()).toISOString(),source:'Oddsivio',notice:''};
   const replays=oddsivioGoals(await page(`/matches/${id}?tab=videos`,controller.signal),match,id);
   return {replays,checkedAt:new Date(now()).toISOString(),source:'Oddsivio',sourceUrl:`${ORIGIN}/matches/${id}?tab=videos`,notice:''};
  }catch(error){const message=(error as Error).message;const code=['REPLAY_SOURCE_RATE_LIMITED','REPLAY_SOURCE_ACCESS_DENIED','REPLAY_MATCH_MISMATCH'].includes(message)?message:'REPLAY_SOURCE_UNAVAILABLE';return {replays:[],code,error:code==='REPLAY_SOURCE_RATE_LIMITED'?'Please wait before refreshing.':code==='REPLAY_SOURCE_ACCESS_DENIED'?'Replay source denied access.':'Replay search unavailable. Try again.'};}finally{clearTimeout(timer);}})();
  pending.set(key,work);try{const data=await work;if(!data.code){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{at:now(),data});}return data;}finally{pending.delete(key);}
 };
}
