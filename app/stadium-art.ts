import seeds from './stadium-art-seeds.json';
import nationalSeeds from './national-stadium-art.json';
import exteriorArt from './stadium-exterior-art.json';
import identities from './team-identities.json';
import {resolveTeamIdentity,normalize} from './team-identity';
import {isNationalCompetition} from './football-model';
export const STADIUMLESS_CUPS=new Set(['uefa.champions','uefa.europa','uefa.europa.conf']);
export const STADIUM_ART_VERSION='outline-v1';
export const STADIUM_DISCOVERY_VERSION='2';
export type StadiumArt={name:string;asset:string;credits:string;source:string;artist:string;license:string;licenseUrl:string;adaptation?:string};
const exteriors=exteriorArt as Record<string,StadiumArt>;
const withExteriors=(catalog:Record<string,StadiumArt>)=>Object.fromEntries(Object.entries(catalog).map(([id,art])=>[id,exteriors[art.asset]||art]));
export const stadiumSeeds=withExteriors(seeds);
export const nationalStadiumSeeds=withExteriors(nationalSeeds);
export const stadiumClubs=new Map(identities.filter(t=>t.kind==='club').map(t=>[t.id,t]));
export function cleanVenue(value:unknown){return typeof value==='string'&&value.length<=140&&!/[<>\x00-\x1f]/.test(value)?value.trim():''}
export function homeStadiumArt(ticket:any):{src:string;credits:string;name:string}|null{
 const g=ticket.game;
 if(STADIUMLESS_CUPS.has(g.league))return null;
 const national=ticket.national||isNationalCompetition(g.league);
 const scope={kind:(national?'national':'club') as 'national'|'club',league:g.league};
 const club=resolveTeamIdentity(g.home.name,scope)||resolveTeamIdentity(g.home.name.replace(/\s+(?:F\.?C\.?|C\.?F\.?)$/i,''),scope);
 const croatia=national&&(club?.id==='national:croatia'||resolveTeamIdentity(g.away?.name||'',scope)?.id==='national:croatia');
 const venueArt=croatia?croatiaVenueStadium(g.venue):null;
 if(venueArt)return {src:venueArt.asset,credits:venueArt.credits,name:venueArt.name};
 if(!club)return null;
 const seed=(national?nationalStadiumSeeds:stadiumSeeds)[club.id];if(seed)return {src:seed.asset,credits:seed.credits,name:seed.name};
 if(national)return null;
 const venue=cleanVenue(g.venue);if(!venue)return null;
 const params=new URLSearchParams({club:club.id,venue,v:STADIUM_DISCOVERY_VERSION});
 return {src:'/api/stadium-art?'+params,credits:'/api/stadium-art?'+params+'&credits=1',name:venue};
}
/** Croatia's four venue overrides apply to home or away national fixtures. */
export function croatiaVenueStadium(value:unknown):StadiumArt|null{
 const venue=normalize(cleanVenue(value));if(!venue)return null;
 const grounds=[
  ['club:hajduk',/\bpoljud\b/,/\bsplit\b/],
  ['club:dinamo',/\bmaksimir\b/,/\bzagreb\b/],
  ['club:osijek',/\b(?:opus arena|pampas)\b/,/\bosijek\b/],
  ['club:rijeka',/\b(?:rujevica|stadion hnk rijeka)\b/,/\brijeka\b/],
 ] as const;
 // Prefer a named stadium over a contradictory city in provider metadata.
 for(const index of [1,2] as const)for(const [club,...patterns] of grounds){if(patterns[index-1].test(venue))return stadiumSeeds[club]||null}
 return null;
}
/** A stadium article must describe this club as a home tenant, not just mention it. */
export function isClubHome(summary:any,club:{name:string;aliases:string[]}){
 const text=normalize(summary?.extract||'');
 if(!/stadium|football ground|sports venue|arena|football pitch/.test(normalize(summary?.description||'')||text.slice(0,200)))return false;
 return [club.name,...club.aliases].filter(n=>normalize(n).length>3).some(name=>{
  const n=normalize(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(?:home|ground|tenant).{0,100}\\b'+n+'\\b|\\b'+n+'\\b.{0,100}(?:home|ground|tenant)').test(text);
 });
}
