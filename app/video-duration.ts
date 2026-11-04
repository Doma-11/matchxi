/** Read published duration values only; never infer a length from a title or upload age. */
export function parseVideoDuration(value:unknown):number|null{
 if(typeof value==='number')return Number.isFinite(value)&&value>=1?Math.floor(value):null;
 if(typeof value!=='string')return null;const text=value.trim();
 if(/^\d+$/.test(text))return parseVideoDuration(Number(text));
 const clock=text.match(/^(?:(\d+):)?(\d+):([0-5]\d)$/);
 if(clock){if(clock[1]&&Number(clock[2])>59)return null;return parseVideoDuration(Number(clock[1]||0)*3600+Number(clock[2])*60+Number(clock[3]));}
 const iso=text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
 if(iso&&(iso[1]||iso[2]||iso[3]))return parseVideoDuration(Number(iso[1]||0)*3600+Number(iso[2]||0)*60+Number(iso[3]||0));
 return null;
}
export function formatVideoDuration(seconds:number){const n=Math.floor(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=String(n%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${m}:${s}`;}
export function videoDuration(video:any):number|null{
 for(const value of [video?.durationSeconds,video?.lengthSeconds,video?.duration,video?.lengthText?.simpleText,video?.lengthText,video?.videos?.[0]?.durationSeconds]){const n=parseVideoDuration(value);if(n!=null)return n;}return null;
}
function textValue(value:any){return typeof value==='string'?value:value?.simpleText||value?.content||value?.runs?.map((r:any)=>r.text||'').join('')||'';}
export function youtubeVideoDuration(renderer:any):number|null{
 const direct=videoDuration(renderer);if(direct!=null)return direct;
 const overlays=renderer?.thumbnailOverlays||renderer?.contentImage?.thumbnailViewModel?.overlays||[];
 for(const overlay of overlays){const direct=parseVideoDuration(textValue(overlay?.thumbnailOverlayTimeStatusRenderer?.text));if(direct!=null)return direct;
  for(const badge of overlay?.thumbnailOverlayBadgeViewModel?.thumbnailBadges||[]){const value=parseVideoDuration(textValue(badge?.thumbnailBadgeViewModel?.text));if(value!=null)return value;}
 }return null;
}
export const VIDEO_DURATION_EVENT='touchline-video-duration';
export function cachedVideoDuration(id:string):number|null{try{return parseVideoDuration(localStorage.getItem('touchline-video-duration-v1-'+id));}catch{return null;}}
export function rememberVideoDuration(id:string,seconds:number){const n=parseVideoDuration(seconds);if(!id||n==null||typeof window==='undefined')return;try{if(cachedVideoDuration(id)===n)return;localStorage.setItem('touchline-video-duration-v1-'+id,String(n));}catch{}window.dispatchEvent(new CustomEvent(VIDEO_DURATION_EVENT,{detail:{id,seconds:n}}));}
