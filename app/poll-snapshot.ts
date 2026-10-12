export function noonTarget(date:string){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date(date));
 const guess=new Date(day+'T12:00:00Z');const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',hourCycle:'h23'}).format(guess));
 return {day,targetAt:new Date(guess.getTime()-(hour-12)*3600000).toISOString()};
}
export function pollCollectionPolicy(game:any,saved:any,forceNoon=false,now=Date.now()){
 const {day,targetAt}=noonTarget(game.date),target=Date.parse(targetAt),matchTime=Date.parse(game.date);
 if(saved?.snapshotVersion===1&&saved.poll&&(!forceNoon||saved.collection==='noon'))return {collect:false,day,targetAt,collection:saved.collection};
 if(saved?.snapshotVersion===1&&!saved.poll&&now-saved.at<6*3600000&&!forceNoon)return {collect:false,day,targetAt,collection:saved.collection};
 const early=matchTime<target&&now>=matchTime-15*60000;
 if(!forceNoon&&now<target&&!early)return {collect:false,day,targetAt,collection:'waiting-for-noon'};
 // Name the real collection, not a fictional noon timestamp.
 const collection=forceNoon&&Math.abs(now-target)<=5*60000?'noon':now<target?'early-match':'fallback';
 return {collect:true,day,targetAt,collection};
}
