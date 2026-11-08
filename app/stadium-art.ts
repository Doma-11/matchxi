import seeds from './stadium-art-seeds.json';
import nationalSeeds from './national-stadium-art.json';
import identities from './team-identities.json';
import {resolveTeamIdentity,normalize} from './team-identity';
import {isNationalCompetition} from './football-model';
export const STADIUMLESS_CUPS=new Set(['uefa.champions','uefa.europa','uefa.europa.conf']);
export const STADIUM_ART_VERSION='outline-v1';
export const STADIUM_DISCOVERY_VERSION='2';
export const stadiumSeeds=seeds as Record<string,{name:string;asset:string;credits:string;source:string;artist:string;license:string;licenseUrl:string}>;
export const stadiumClubs=new Map(identities.filter(t=>t.kind==='club').map(t=>[t.id,t]));
export function cleanVenue(value:unknown){return typeof value==='string'&&value.length<=140&&!/[<>\x00-\x1f]/.test(value)?value.trim():''}
export function homeStadiumArt(ticket:any):{src:string;credits:string;name:string}|null{
 const g=ticket.game;
 if(STADIUMLESS_CUPS.has(g.league))return null;
 const national=ticket.national||isNationalCompetition(g.league);
 const scope={kind:(national?'national':'club') as 'national'|'club',league:g.league};
 const club=resolveTeamIdentity(g.home.name,scope)||resolveTeamIdentity(g.home.name.replace(/\s+(?:F\.?C\.?|C\.?F\.?)$/i,''),scope);if(!club)return null;
 const seed=(national?nationalSeeds as typeof stadiumSeeds:stadiumSeeds)[club.id];if(seed)return {src:seed.asset,credits:seed.credits,name:seed.name};
 if(national)return null;
 const venue=cleanVenue(g.venue);if(!venue)return null;
 const params=new URLSearchParams({club:club.id,venue,v:STADIUM_DISCOVERY_VERSION});
 return {src:'/api/stadium-art?'+params,credits:'/api/stadium-art?'+params+'&credits=1',name:venue};
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
