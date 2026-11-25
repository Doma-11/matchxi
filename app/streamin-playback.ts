/** Public Streamin watch links only; never accept a client-supplied fetch host. */
export function streaminWatch(raw:string):{id:string;url:string;embed:string}|null{
 try{const u=new URL(raw),id=u.pathname.match(/^\/v\/([a-f0-9]{8})\/?$/)?.[1];
  if(u.protocol!=='https:'||!['streamin.link','streamin.me'].includes(u.hostname)||u.username||u.password||u.port||u.search||u.hash||!id)return null;
  return {id,url:`https://streamin.me/v/${id}`,embed:`https://streamin.me/embed/${id}`};
 }catch{return null;}
}
/** The URL must belong to the selected clip on a CDN actually observed in its player. */
export function streaminMedia(raw:unknown,id:string):string|null{
 if(typeof raw!=='string'||raw.length>1000)return null;
 try{const u=new URL(raw);return u.protocol==='https:'&&['c-cdn.streamin.top','w-cdn.streamin.top'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.hash&&u.pathname===`/uploads/${id}.mp4`?u.href:null;}catch{return null;}
}
export function streaminMediaFromHtml(html:string,id:string):string|null{
 const video=html.match(/<video\b[^>]*>[\s\S]*?<\/video\s*>/i)?.[0];if(!video)return null;
 for(const tag of video.match(/<(?:source|video)\b[^>]*>/gi)||[]){const raw=tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];const media=streaminMedia(raw?.replace(/&amp;/g,'&'),id);if(media)return media;}
 return null;
}
