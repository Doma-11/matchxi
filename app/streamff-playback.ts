/** Accept only the public media URL supplied alongside this exact Streamff clip. */
export function streamffMedia(watchUrl:string,raw:unknown):string|null{
 if(typeof raw!=='string'||raw.length>1000)return null;
 try{const watch=new URL(watchUrl),id=watch.pathname.match(/^\/v\/([a-f0-9]{8})\/?$/)?.[1],media=new URL(raw);
  if(watch.protocol!=='https:'||!['streamff.pro','streamff.com'].includes(watch.hostname)||watch.username||watch.password||watch.port||watch.search||watch.hash||!id)return null;
  return media.protocol==='https:'&&media.hostname==='cdn.hostedhost.top'&&!media.username&&!media.password&&!media.port&&!media.hash&&media.pathname===`/${id}.mp4`?media.href:null;
 }catch{return null;}
}
