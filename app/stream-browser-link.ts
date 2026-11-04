export function streamBrowserLink(url:string,_userAgent?:string,_touchPoints=0){
 return url;
}
export function isAppleMobile(userAgent:string,touchPoints=0){return /iPhone|iPad|iPod/i.test(userAgent)||/Macintosh/i.test(userAgent)&&touchPoints>1;}
