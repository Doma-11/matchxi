export function fotmobEvents(page:any,game:any){
 const raw=page.content?.matchFacts?.events?.events;
 if(!Array.isArray(raw))return null;
 return raw.map((e:any,i:number)=>{
  const kind=String(e.type||e.eventType||''),minute=String(e.timeStr||e.time||''),name=e.player?.name||e.nameStr||e.name||e.playerName||'';
  const scoring=/goal/i.test(kind)&&!/disallow|cancel/i.test(kind)&&!e.isPenaltyShootoutEvent;
  const home=typeof e.isHome==='boolean'?e.isHome:e.teamId!=null?String(e.teamId)===String(page.general?.homeTeam?.id):null;
  const text=e.swap?.length?e.swap.map((p:any)=>p.name).join(' → '):name;
  return {id:String(e.eventId||e.reactKey||e.id||`${kind}:${minute}:${home}:${name}:${i}`),type:kind,kind:/card/i.test(kind)?String(e.card||kind).toLowerCase()+'-card':/sub/i.test(kind)?'substitution':kind.toLowerCase(),short:text||kind,text:text||kind,minute:minute+(minute&&!/[′']$/.test(minute)?'′':''),clock:(Number(e.time)||0)*60,teamId:home===null?null:(home?game.home.id:game.away.id),scoring,players:name?[name]:[]};
 }).filter((e:any)=>e.short);
}
export function fotmobLineupUpdates(page:any,game:any){
 const lineup=page.content?.lineup;if(lineup?.lineupType!=='standard')return null;
 return ['home','away'].flatMap(side=>{const team=lineup[side+'Team'];if(!team)return [];return [{side,team:game[side],formation:team.formation,players:[...(team.starters||[]).map((p:any)=>({...p,starter:true})),...(team.subs||[]).map((p:any)=>({...p,starter:false}))].map((p:any)=>({id:String(p.id),name:p.name,short:p.name,number:p.shirtNumber,starter:p.starter,position:({0:'G',1:'D',2:'M',3:'F'} as any)[p.usualPlayingPositionId]||'M',formationPlace:p.positionId,goals:(p.performance?.events||[]).filter((e:any)=>e.type==='goal').length,photo:`https://images.fotmob.com/image_resources/playerimages/${p.id}.png`,subbedIn:!!p.performance?.substitution?.subIn,rating:null,stats:[]}))}];});
}
