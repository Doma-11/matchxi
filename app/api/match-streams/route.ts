import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {inspectMatchStreamListings} from '../../match-streams';
import {resolveTeamIdentity} from '../../team-identity';
import {STREAM_LISTING_SOURCE,STREAM_LISTING_TTL_MS} from '../../stream-listing-source';
import {fetchStreamPage} from '../../stream-embed';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,home=p.get('home')||'',away=p.get('away')||'',date=p.get('date')||'',id=p.get('id')||'',league=p.get('league')||'';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
 const yesterday=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date(Date.now()-86400000));
 if(p.get('live')!=='true'||!home||!away||home.length>120||away.length>120||!/^[-\w]{1,80}$/.test(id)||!/^[-\w.]{1,40}$/.test(league)||![today,yesterday].includes(date))return Response.json({error:'Stream listings are only checked for current live matches.'},{status:400});
 const source=STREAM_LISTING_SOURCE,store=getStore({name:'matchxi-stream-listings'}),key='match-'+createHash('sha256').update(league+'|'+id+'|'+date).digest('hex');
 try{
  const saved:any=await store.get(key,{type:'json'}).catch(()=>null);
  const age=Date.now()-Date.parse(saved?.checkedAt||'');
  if(p.get('refresh')!=='1'&&saved?.streams?.length&&age>=0&&age<STREAM_LISTING_TTL_MS)return Response.json(saved);
  const r=await fetchStreamPage(source);if(!r.ok)throw Error('Stream listing source unavailable');
  const {streams,unmatchedListings}=inspectMatchStreamListings(await r.text(),home,away,league);
  const result={streams,source,checkedAt:new Date().toISOString(),notice:'External listings only. Playback, broadcast rights and availability are not verified.'};
  if(streams.length)await store.setJSON(key,result).catch(()=>{});
  // Small metadata-only diagnostic, collected during the existing lookup.
  // One bounded record per fixture; never store page HTML or video footage.
  if(!streams.length||unmatchedListings.length)try{await store.setJSON('diagnostics/'+key,{date,league,id,requested:{home,away,homeIdentity:resolveTeamIdentity(home)?.id||null,awayIdentity:resolveTeamIdentity(away)?.id||null},checkedAt:result.checkedAt,matchedStreams:streams.length,unmatchedListings});}catch{console.warn('Stream matching diagnostic could not be saved');}
  return Response.json(result);
 }catch{return Response.json({error:'Stream listings are temporarily unavailable. Try again later.'},{status:502});}
}
