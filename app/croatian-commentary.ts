import listings from './croatian-commentary-links.json';
import {sameTeamIdentity} from './team-identity';
export const CROATIAN_BROADCAST_LISTINGS='https://bhliga.com/';
type Listing={league:string;date:string;home:string;away:string;country:string;channel:string;url:string;sourceUrl:string;listingCheckedOn:string};
export function croatianCommentaryDestination(game:any,records:Listing[]=listings){
 if(game?.state!=='in'||game.completed)return null;
 const at=new Date(game.date);if(!Number.isFinite(at.getTime()))return null;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(at);
 const scope={league:game.league,kind:((game.league==='uefa.nations'||game.league?.startsWith('fifa.')||game.league==='uefa.euro')?'national':'club') as 'national'|'club'};
 const record=records.find(r=>r.country==='HR'&&r.league===game.league&&r.date===date&&sameTeamIdentity(r.home,game.home?.name||'',scope)&&sameTeamIdentity(r.away,game.away?.name||'',scope));
 if(record){try{
  const source=new URL(record.sourceUrl);
  const clean=(u:URL)=>u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash;
  if(clean(source)&&source.hostname==='bhliga.com'&&/^\/match\/\d+$/.test(source.pathname))return {kind:'match-page' as const,url:source.href,sourceUrl:source.href,channel:record.channel};
 }catch{}}
 // The provider blocks automated discovery. Do not guess a channel or claim
 // an HR broadcast exists; open the public match listings for manual selection.
 return {kind:'listings' as const,url:CROATIAN_BROADCAST_LISTINGS,sourceUrl:CROATIAN_BROADCAST_LISTINGS,channel:null};
}
