export function normalizeMatchFilter(value:string|null){return value==='finished'?'upcoming':['all','live','upcoming'].includes(value||'')?value!:'all';}
export function matchesStatusFilter(game:any,filter:string){
 if(filter==='all')return true;
 if(filter==='live')return game.state==='in'&&!game.completed;
 return filter==='upcoming'&&game.state==='pre'&&!game.completed&&!/cancel|postpon|abandon/i.test(game.status||'');
}
