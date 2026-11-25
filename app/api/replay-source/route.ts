import {streaminWatch,streaminMediaFromHtml} from '../../streamin-playback';

/** Metadata only, on selection. No video bytes, persistence, proxy or retries. */
export function createStreaminResolver({fetcher=fetch,now=()=>Date.now()}={}){
 const cache=new Map<string,{at:number;mediaUrl:string}>(),pending=new Map<string,Promise<string|null>>();
 return async function resolve(raw:string):Promise<string|null>{
  const watch=streaminWatch(raw);if(!watch)return null;
  const saved=cache.get(watch.id);if(saved&&now()-saved.at<180000)return saved.mediaUrl;
  if(pending.has(watch.id))return pending.get(watch.id)!;
  const work=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{
   const response=await fetcher(watch.url,{signal:controller.signal,redirect:'error',headers:{Accept:'text/html'}});
   if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||Number(response.headers.get('content-length'))>262144){await response.body?.cancel();return null;}
   const reader=response.body?.getReader();if(!reader)return null;let html='',size=0;const decoder=new TextDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();return null;}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();
   const mediaUrl=streaminMediaFromHtml(html,watch.id);if(mediaUrl){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(watch.id,{at:now(),mediaUrl});}return mediaUrl;
  }catch{return null;}finally{clearTimeout(timer);}})();pending.set(watch.id,work);try{return await work;}finally{pending.delete(watch.id);}
 };
}
const resolve=createStreaminResolver();
export async function GET(request:Request){
 const url=new URL(request.url).searchParams.get('url')||'';if(!streaminWatch(url))return Response.json({error:'Use a Streamin video link.'},{status:400});
 const mediaUrl=await resolve(url);return Response.json(mediaUrl?{mediaUrl}:{error:'Direct playback unavailable.'},{status:mediaUrl?200:503,headers:{'Cache-Control':'private, no-store'}});
}
