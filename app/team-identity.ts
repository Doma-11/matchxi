import aliases from './team-aliases.json';
import teams from './team-identities.json';

export function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
// Preserve the existing public helper used by highlight and player-source matching.
export function clubTerms(club:{name:string;short?:string}){return [club.name,...((aliases as Record<string,string[]>)[club.name]||[]),...(club.short&&club.short.length>2?[club.short]:[])].map(normalize);}
export type TeamIdentity={id:string;name:string;kind:string;leagues:string[];aliases:string[]};
type Scope={league?:string;kind?:'club'|'national'};
const index=new Map<string,Set<TeamIdentity>>();
for(const team of teams){
 for(const name of [team.name,...team.aliases]){
  const key=normalize(name);if(!key)continue;
  if(!index.has(key))index.set(key,new Set());index.get(key)!.add(team);
 }
}
export function resolveTeamIdentity(name:string,scope:Scope={}):TeamIdentity|null{
 let candidates=[...(index.get(normalize(name))||[])];
 if(scope.kind)candidates=candidates.filter(t=>t.kind===scope.kind);
 // Competition membership can disambiguate an alias, but does not reject a
 // newly promoted/newly qualified registered club absent from the saved table.
 if(candidates.length>1&&scope.league)candidates=candidates.filter(t=>t.leagues.includes(scope.league!));
 return candidates.length===1?candidates[0]:null;
}
export function sameTeamIdentity(a:string,b:string,scope:Scope={}):boolean{
 const left=resolveTeamIdentity(a,scope),right=resolveTeamIdentity(b,scope);
 if(left&&right)return left.id===right.id;
 // Never guess an ambiguous registered name. Unregistered future clubs can
 // still match the exact normalized name on both sources.
 return !left&&!right&&!index.has(normalize(a))&&!index.has(normalize(b))&&!!normalize(a)&&normalize(a)===normalize(b);
}
