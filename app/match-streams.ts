import {clubTerms,normalize} from './football-model';
const source='https://www.soccerstreams.zone/';
function text(html:string){return html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
export function listedMatchStreams(html:string,home:string,away:string){
 const same=(listed:string,team:string)=>clubTerms({name:listed}).some(term=>clubTerms({name:team}).includes(term))||normalize(listed)===normalize(team);
 const links:any[]=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
  if(cells.length<3)continue;
  const teams=text(cells[1]).split(/\s+vs\.?\s+/i);
  if(teams.length!==2||!same(teams[0],home)||!same(teams[1],away))continue;
  for(const a of cells[2].matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
   try{const url=new URL(a[1],source);if(url.protocol!=='https:'||url.hostname!=='www.soccerstreams.zone'||url.pathname==='/')continue;if(!links.some(l=>l.url===url.href))links.push({url:url.href,label:'Stream listing '+(links.length+1)});}catch{}
  }
 }
 return links;
}
