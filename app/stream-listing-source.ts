// The original listing site redirects to this reviewed replacement domain.
export const STREAM_LISTING_SOURCE='https://www.soccerstreams.click/';
const hosts=new Set(['www.soccerstreams.zone','www.soccerstreams.click']);
export function streamListingUrl(raw:string,base=STREAM_LISTING_SOURCE){
 try{const url=new URL(raw.replace(/&amp;/gi,'&'),base);return url.protocol==='https:'&&hosts.has(url.hostname)&&!url.username&&!url.password&&!url.port?url:null;}catch{return null;}
}
