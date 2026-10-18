const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const teamKey=(s:string)=>{const n=norm(s);return ['barcelona','fcbarcelona'].includes(n)?'barcelona':['bayernmunich','bayernmunchen','fcbayernmunchen'].includes(n)?'bayernmunich':['realmadrid','realmadridcf'].includes(n)?'realmadrid':n};
const cache=new Map<string,Promise<any[]>>();
async function portraitsFor(team:any,date:string){if(['croatia','hrvatska','cro'].includes(teamKey(team.name)))return [];const d=new Date(date),season=d.getUTCFullYear()-(d.getUTCMonth()<6?1:0),key=teamKey(team.name)+'|'+season;if(!cache.has(key))cache.set(key,fetch('/api/player-portraits?'+new URLSearchParams({team:team.name,season:String(season)}),{signal:AbortSignal.timeout(4000)}).then(r=>r.ok?r.json():{portraits:[]}).then((d:any)=>d.portraits||[]).catch(()=>{cache.delete(key);return []}));return cache.get(key)!;}
export function findPortrait(portraits:any[],player:any){const matches=portraits.filter(p=>[p.name,...(p.aliases||[])].some(name=>norm(name)===norm(player.name)));return new Set(matches.map(p=>norm(p.name))).size===1?matches[0]:undefined;}
export async function applyPortraits(data:any){
 // Match-specific photos are authoritative. Do not replace a fresh provider
 // photo with an older saved team portrait or immutable proxy copy.
 const lineups=await Promise.all((data.lineups||[]).map(async(lineup:any)=>{
  const players=(lineup.players||[]).map((player:any)=>({...player}));
  const portraits=players.length?await portraitsFor(lineup.team,data.game.date):[];
  for(const player of players){const photo=findPortrait(portraits,player);if(photo){
   if(player.photo){if(photo.photo!==player.photo)player.fallbackPhoto=player.fallbackPhoto||photo.photo;}
   else{player.photo=photo.photo;player.photoSourceUrl=photo.source;player.photoSource=photo.provider||'Official team portrait';}
  }}
  return {...lineup,players};
 }));
 return {...data,lineups};
}
