export const STREAM_PLAYER_VERSION='3';
export const STREAM_PLAYER_TTL_MS=15*60*1000;

export function supportedStreamPlayer(raw:string){
 try{const url=new URL(raw.replace(/&amp;/gi,'&'),'https://www.soccerstreams.zone/');
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  // Exact replacement hosts observed in the listing site's published player frames.
  const current=url.hostname==='sportsoonline.click'&&url.pathname.startsWith('/channels/')||url.hostname==='embedcenter.st'&&url.pathname.startsWith('/embed/');
  const supported=current||/^(?:w\d+\.)?sportsonliine\.click$/.test(url.hostname)||/^(?:ww?\d+\.)?sportsonnline\.click$/.test(url.hostname)||url.hostname==='dlive.sx';
  return supported?url.href:null;
 }catch{return null;}
}
export function publishedStreamPlayer(html:string){
 // Ignore unrelated/ad frames and inspect all published iframe URLs.
 for(const iframe of html.matchAll(/<iframe\b[^>]*>/gi)){
  for(const name of ['src','data-src']){
   const attribute=iframe[0].match(new RegExp('(?:\\s)'+name+'\\s*=\\s*["\']([^"\']+)["\']','i'));
   if(attribute){const url=supportedStreamPlayer(attribute[1]);if(url)return url;}
  }
 }
 return null;
}
export function allowsStreamEmbedding(headers:Headers,appOrigin:string){
 if(headers.get('x-frame-options'))return false;
 const csp=headers.get('content-security-policy')||'';
 for(const policy of csp.split(',')){
  const ancestors=policy.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1];
  if(ancestors){const tokens=ancestors.trim().split(/\s+/);if(!tokens.includes('*')&&!tokens.includes(appOrigin))return false;}
 }
 return true;
}

export async function fetchStreamPage(raw:string){
 let url=new URL(raw);const host=url.hostname,listing=!!streamListingUrl(raw),signal=AbortSignal.timeout(15000);
 for(let redirects=0;redirects<=4;redirects++){
  if(url.protocol!=='https:'||(listing?!streamListingUrl(url.href):url.hostname!==host)||url.username||url.password||url.port)throw Error('Unexpected stream redirect');
  const response=await fetch(url,{signal,redirect:'manual'});
  if(![301,302,303,307,308].includes(response.status))return response;
  const next=response.headers.get('location');await response.body?.cancel().catch(()=>{});
  if(!next)throw Error('Missing stream redirect');url=new URL(next,url);
 }
 throw Error('Too many stream redirects');
}
import {streamListingUrl} from './stream-listing-source';
