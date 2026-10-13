import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {publishedStreamPlayer,allowsStreamEmbedding,fetchStreamPage} from '../../stream-embed';
export async function GET(request:Request){
 const raw=new URL(request.url).searchParams.get('url')||'';let url:URL;
 try{url=new URL(raw);if(url.protocol!=='https:'||url.hostname!=='www.soccerstreams.zone'||url.username||url.password||url.port)throw Error();}catch{return Response.json({error:'Invalid stream listing'},{status:400});}
 const store=getStore({name:'touchline-stream-players'}),key='v2/'+createHash('sha256').update(url.href).digest('hex');
 try{
  const saved:any=await store.get(key,{type:'json'});if(saved&&(saved.embedAllowed||Date.now()-Date.parse(saved.checkedAt||'')<900000))return Response.json(saved);
  const listing=await fetchStreamPage(url.href);if(!listing.ok)throw Error();
  const embedUrl=publishedStreamPlayer(await listing.text());
  if(!embedUrl)return Response.json({embedAllowed:false,reason:'This listing does not provide a supported embedded player. Use the external link.'});
  // Check the provider's frame policies; never proxy footage or remove restrictions.
  const provider=await fetchStreamPage(embedUrl);await provider.body?.cancel().catch(()=>{});
  const allowed=allowsStreamEmbedding(provider.headers,'https://touchline-football-hub.netlify.app');
  if(allowed&&!provider.ok)return Response.json({embedAllowed:false,reason:'The provider could not be verified right now. Use the external link.'});
  const result={embedAllowed:allowed,checkedAt:new Date().toISOString(),...(allowed?{embedUrl}:{reason:'The provider restricts playback inside other websites. Use the external link.'})};
  await store.setJSON(key,result);return Response.json(result);
 }catch{return Response.json({error:'Could not verify this player. Please use the external link.'},{status:502});}
}
