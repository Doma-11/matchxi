export function streamBrowserLink(url:string,userAgent:string,touchPoints=0){
 if(/Android/i.test(userAgent))return `intent://${url.replace(/^https:\/\//,'')}#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent(url)};end`;
 if(/iPhone|iPad|iPod/i.test(userAgent)||/Macintosh/i.test(userAgent)&&touchPoints>1)return `firefox://open-url?url=${encodeURIComponent(url)}`;
 return url;
}
export function isAppleMobile(userAgent:string,touchPoints=0){return /iPhone|iPad|iPod/i.test(userAgent)||/Macintosh/i.test(userAgent)&&touchPoints>1;}
