import {STADIUM_ART_VERSION,STADIUM_DISCOVERY_VERSION,stadiumClubs,stadiumSeeds,cleanVenue,isClubHome} from '../../app/stadium-art';
import {stadiumOutline} from './stadium-outline';
const AGENT='MatchXI/1.0 (https://matchxi.netlify.app; stadium keepsakes)';
const ALLOWED=new Set(['en.wikipedia.org','commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org']);
export function safeStadiumUrl(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||!ALLOWED.has(u.hostname)||u.username||u.password||u.port)throw Error('Unsupported stadium image host');return u;}
const plain=(s:unknown)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().slice(0,800);
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function boundedFetch(url:string,fetcher:typeof fetch=fetch,limit=1_000_000){
 const signal=AbortSignal.timeout(8000);let current=safeStadiumUrl(url),r:Response|undefined;
 for(let redirects=0;redirects<3;redirects++){
  r=await fetcher(current.href,{headers:{'User-Agent':AGENT},signal,redirect:'manual'});
  if(![301,302,303,307,308].includes(r.status))break;
  const location=r.headers.get('location');if(!location||redirects===2)throw Error('Invalid source redirect');
  current=safeStadiumUrl(new URL(location,current).href);
 }
 if(!r)throw Error('Empty source response');
 if(!r.ok||Number(r.headers.get('content-length'))>limit)throw Error('Stadium source unavailable');
 const reader=r.body?.getReader();if(!reader)throw Error('Empty source');let size=0;const chunks:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('Stadium source too large')}chunks.push(part.value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return {bytes,type:r.headers.get('content-type')||''};
}
async function json(url:string,fetcher:typeof fetch){return JSON.parse(new TextDecoder().decode((await boundedFetch(url,fetcher)).bytes))}
export async function discoverStadium(venue:string,club:any,fetcher:typeof fetch=fetch){
 const summary=await json('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(venue.replaceAll(' ','_')),fetcher);
 if(!isClubHome(summary,club))return null;
 const isPhoto=(file:unknown):file is string=>typeof file==='string'&&/\.(?:jpe?g|png|webp)$/i.test(file)&&!/(?:logo|crest|badge|flag|diagram|seating.?plan|map)/i.test(file.replace(/[_-]/g,' '));
 const image=summary.originalimage?.source||summary.thumbnail?.source;let file='';
 if(image){safeStadiumUrl(image);const encoded=new URL(image).pathname.match(/\/commons\/(?:thumb\/)?[a-f\d]\/[a-f\d]{2}\/([^/]+)/)?.[1];if(encoded&&isPhoto(decodeURIComponent(encoded)))file=decodeURIComponent(encoded)}
 const q=new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'640'});
 if(file)q.set('titles','File:'+file);
 else{
  // Stadium pages sometimes lead with a sponsor logo. Search only photographs
  // of the already verified stadium; never render an arbitrary lead emblem.
  q.set('generator','search');q.set('gsrnamespace','6');q.set('gsrlimit','3');
  q.set('gsrsearch','intitle:"'+String(summary.title).replace(/["\\]/g,'')+'" -intitle:logo -intitle:map -intitle:diagram');
 }
 const result=await json('https://commons.wikimedia.org/w/api.php?'+q,fetcher);
 const pages:any[]=Object.values(result.query?.pages||{});pages.sort((a,b)=>(a.index||0)-(b.index||0));
 for(const page of pages){
  if(!isPhoto(page.title?.replace(/^File:/,'')||file))continue;
  const info=page.imageinfo?.[0],m=info?.extmetadata;
  const license=plain(m?.LicenseShortName?.value),licenseUrl=plain(m?.LicenseUrl?.value);
  if(!info||info.mime&&!/^image\/(?:jpeg|png|webp)$/.test(info.mime)||!/^(?:CC BY(?:-SA)?(?: [\d.]+)?|CC0|Public domain)$/i.test(license)||!/^https:\/\/creativecommons\.org\//.test(licenseUrl))continue;
  const source=info.descriptionurl;safeStadiumUrl(source);const photo=info.thumburl||info.url;safeStadiumUrl(photo);
  return {name:plain(summary.title),photo,source,artist:plain(m.Artist?.value),license,licenseUrl};
 }
 return null;
}

export function createStadiumArtService({store,fetcher=fetch,render=stadiumOutline,now=Date.now}:{store:any;fetcher?:typeof fetch;render?:(bytes:Uint8Array)=>Promise<Uint8Array>;now?:()=>number}){
 const inflight=new Map<string,Promise<any>>();
 return async(request:Request)=>{
  if(request.method!=='GET')return new Response(null,{status:405});
  const q=new URL(request.url).searchParams,club=stadiumClubs.get(q.get('club')||''),venue=cleanVenue(q.get('venue'));
  if(!club)return new Response(null,{status:400});
  const seed=stadiumSeeds[club.id];
  if(seed)return new Response(null,{status:307,headers:{Location:q.get('credits')==='1'?seed.credits:seed.asset}});
  const key=STADIUM_ART_VERSION+'/'+club.id.replace(':','-');
  try{
   const entry=await store.getWithMetadata(key,{type:'arrayBuffer'});
   let saved=entry?.data,metadata:any=entry?.metadata;
   if(!saved){
    const missed=await store.get(key+'-missing-v'+STADIUM_DISCOVERY_VERSION,{type:'json'});if(missed&&now()<missed.retryAt)return new Response(null,{status:404});
    if(!venue)return new Response(null,{status:404});
    if(!inflight.has(key))inflight.set(key,(async()=>{
     try{
      const source=await discoverStadium(venue,club,fetcher);
      if(!source){await store.setJSON(key+'-missing-v'+STADIUM_DISCOVERY_VERSION,{retryAt:now()+86400000});return null;}
      const photo=await boundedFetch(source.photo,fetcher,4_000_000);if(!/^image\/(?:jpeg|png|webp)/.test(photo.type))throw Error('Unsupported stadium photo');
      const image=await render(photo.bytes);if(image.length>200_000)throw Error('Stadium artwork too large');
      const {photo:_,...credit}=source;
      if(Buffer.byteLength(JSON.stringify(credit))>1900)throw Error('Stadium attribution too large');
      const data=image.buffer.slice(image.byteOffset,image.byteOffset+image.byteLength) as ArrayBuffer;
      const result=await store.set(key,data,{metadata:credit,onlyIfNew:true});
      if(result.modified===false){const winner=await store.getWithMetadata(key,{type:'arrayBuffer'});return winner?{data:winner.data,credit:winner.metadata}:null;}
      return {data,credit};
     }catch(error){await store.setJSON(key+'-missing-v'+STADIUM_DISCOVERY_VERSION,{retryAt:now()+3600000}).catch(()=>{});console.error('Stadium artwork unavailable',error instanceof Error?error.message:'Source error');return null;}
    })().finally(()=>inflight.delete(key)));
    const built=await inflight.get(key);if(!built)return new Response(null,{status:404});saved=built.data;metadata=built.credit;
   }
   if(q.get('credits')==='1'){
    metadata=metadata?.source?metadata:await store.get(key+'-credit',{type:'json'});if(!metadata)return new Response(null,{status:404});
    const m=metadata;safeStadiumUrl(m.source);if(!/^https:\/\/creativecommons\.org\//.test(m.licenseUrl))throw Error('Invalid credit');
    return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stadium art credit</title><body style="max-width:650px;margin:40px auto;padding:20px;font:16px system-ui;line-height:1.7"><h1>'+escape(m.name)+'</h1><p>Architectural outline adapted from a real stadium photograph by '+escape(m.artist)+'.</p><p><a href="'+escape(m.source)+'">Original photograph and attribution</a> · <a href="'+escape(m.licenseUrl)+'">'+escape(m.license)+'</a></p><p>Changes: resized, converted to navy linework and compressed to WebP. The adaptation is shared under the same licence.</p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
   }
   return new Response(saved,{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
  }catch(error){console.error('Stadium cache read failed',error instanceof Error?error.message:'Storage error');return new Response(null,{status:503});}
 };
}
