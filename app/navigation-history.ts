// Older MatchXI sessions may still contain entries from the previous marker.
export function isAppHistoryEntry(state:any){
 return Boolean(state?.screen && (state.matchxi===true || state.touchline===true));
}

export function canNavigateBack(state:any,length:number){
 return isAppHistoryEntry(state) && state.depth>0 && length>1;
}

// A match is one screen even if background club/team state changes. Comparing
// complete fixture objects can otherwise create extra Back steps or stall restore.
export function screenKey(screen:any){
 if(screen?.selectedGame)return JSON.stringify(['match',screen.selectedGame.league,String(screen.selectedGame.id)]);
 return JSON.stringify([screen?.page,screen?.league,screen?.club?.id,screen?.pickerLeague,screen?.selected?.id,screen?.competition,screen?.nation?.id,screen?.leagueTab]);
}
export function navigationEntry(current:any,screen:any,scrollY:number){
 const changed=screenKey(current?.screen)!==screenKey(screen),enteringMatch=changed&&Boolean(screen.selectedGame);
 const origin=enteringMatch?(current?.screen?.selectedGame?current.matchReturn:{screen:current?.screen,scrollY:current?.scrollY??scrollY}):current?.matchReturn;
 return {push:changed,entry:{matchxi:true,screen,scrollY:enteringMatch?0:scrollY,depth:(current?.depth||0)+(changed?1:0),...(screen.selectedGame&&origin?{matchReturn:origin}:{})}};
}
export function matchReturnEntry(current:any,screen:any){
 const origin=current?.matchReturn;
 return {matchxi:true,screen:origin?.screen&&!origin.screen.selectedGame?origin.screen:{...screen,selectedGame:null,selected:null},scrollY:origin?.scrollY??0,depth:Math.max(0,(current?.depth||0)-1)};
}
export function instantScroll(top:number){
 const root=document.documentElement,old=root.style.getPropertyValue('scroll-behavior'),priority=root.style.getPropertyPriority('scroll-behavior');
 root.style.setProperty('scroll-behavior','auto','important');
 try{window.scrollTo({top,behavior:'auto'})}finally{if(old)root.style.setProperty('scroll-behavior',old,priority);else root.style.removeProperty('scroll-behavior');}
}

// The in-app Back control always has a safe destination, including older
// history entries and browsers that do not deliver a usable popstate event.
export function startMatchBack(historyApi:any,screen:any,targetRef:{current:any},timerRef:{current:any},restore:(state:any)=>void,schedule:(callback:()=>void,ms:number)=>any=setTimeout){
 if(targetRef.current)return;
 const current=historyApi.state,target=matchReturnEntry(current,screen);targetRef.current=target;
 const fallback=()=>{if(!targetRef.current)return;historyApi.replaceState(target,'');targetRef.current=null;restore(target)};
 if(canNavigateBack(current,historyApi.length)){timerRef.current=schedule(fallback,300);historyApi.back()}else fallback();
}

export function resolvedHistoryState(state:any,requested:any){return requested&&(!isAppHistoryEntry(state)||state.screen.selectedGame)?requested:state;}
