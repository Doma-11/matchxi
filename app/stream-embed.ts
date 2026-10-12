export function publishedStreamPlayer(html:string){
 const src=html.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];if(!src)return null;
 try{const url=new URL(src.replace(/&amp;/g,'&'),'https://www.soccerstreams.zone/');return url.protocol==='https:'&&/^(?:w\d+\.)?sportsonliine\.click$/.test(url.hostname)?url.href:null;}catch{return null;}
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
 let url=new URL(raw);const host=url.hostname,signal=AbortSignal.timeout(15000);
 for(let redirects=0;redirects<=4;redirects++){
  if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password||url.port)throw Error('Unexpected stream redirect');
  const response=await fetch(url,{signal,redirect:'manual'});
  if(![301,302,303,307,308].includes(response.status))return response;
  const next=response.headers.get('location');await response.body?.cancel().catch(()=>{});
  if(!next)throw Error('Missing stream redirect');url=new URL(next,url);
 }
 throw Error('Too many stream redirects');
}
