import {resolveTeamIdentity,sameTeamIdentity} from './team-identity';
import {STREAM_LISTING_SOURCE,streamListingUrl} from './stream-listing-source';
const source=STREAM_LISTING_SOURCE;
function text(html:string){return html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
export function inspectMatchStreamListings(html:string,home:string,away:string,league?:string){
 const scope={league,kind:(league&&['uefa.nations','fifa.world','uefa.euro'].includes(league)?'national':'club') as 'national'|'club'};
 const links:any[]=[],unmatchedListings:{home:string;away:string;unresolved:string[]}[]=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
  if(cells.length<3)continue;
  const teams=text(cells[1]).split(/\s+vs\.?\s+/i);
  if(teams.length!==2)continue;
  if(!sameTeamIdentity(teams[0],home,scope)||!sameTeamIdentity(teams[1],away,scope)){
   const unresolved=teams.filter(name=>!resolveTeamIdentity(name,scope));
   if(unresolved.length&&unmatchedListings.length<40&&!unmatchedListings.some(r=>r.home===teams[0]&&r.away===teams[1]))unmatchedListings.push({home:teams[0].slice(0,120),away:teams[1].slice(0,120),unresolved:unresolved.map(n=>n.slice(0,120))});
   continue;
  }
  for(const a of cells[2].matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
   const url=streamListingUrl(a[1],source);if(!url||url.pathname==='/')continue;if(!links.some(l=>l.url===url.href))links.push({url:url.href,label:'Stream listing '+(links.length+1)});
  }
 }
 return {streams:links,unmatchedListings};
}
export function listedMatchStreams(html:string,home:string,away:string,league?:string){return inspectMatchStreamListings(html,home,away,league).streams;}
