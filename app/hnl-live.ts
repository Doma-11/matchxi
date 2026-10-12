export function mergeHnlFixtures(season:any[],day:any[]){
 const current=new Map(day.map(m=>[String(m.id),m]));
 const merged=season.map(m=>{const fresh=current.get(String(m.id));current.delete(String(m.id));return fresh?{...m,...fresh,status:fresh.status}:m});
 return [...merged,...current.values()];
}
export function hnlGame(m:any,clubForName:(name:string)=>any){
 const s=m.status||{},score=s.scoreStr?.split(/\s*-\s*/);
 const team=(t:any,i:number)=>{const club=clubForName(t.name);return {...club,id:String(club?.id||t.id),name:club?.name||t.name,logo:club?.logo||`https://images.fotmob.com/image_resources/logo/teamlogo/${t.id}.png`,score:s.started||s.finished?score?.[i]??t.score??null:null}};
 const reason=s.reason?.short||s.reason?.long||s.liveTime?.short||'';
 return {id:'fm-'+m.id,fotmobId:m.id,league:'cro.1',date:s.utcTime,home:team(m.home,0),away:team(m.away,1),completed:!!s.finished,state:s.finished?'post':s.started?'in':'pre',status:s.cancelled?'Cancelled':s.finished?'Full time':s.started?(/^(HT|half[ -]?time)$/i.test(reason)?'HT':s.liveTime?.short||'Live'):'Scheduled',clock:s.liveTime?.short||reason,clockCheckedAt:new Date().toISOString(),period:s.halfs?.secondHalfStarted?2:s.halfs?.firstHalfStarted?1:undefined,halfStartedAt:fotmobHalfStart(s.halfs?.secondHalfStarted||s.halfs?.firstHalfStarted),round:m.round||m.tournamentStage,source:'FotMob',sourceUrl:m.pageUrl?'https://www.fotmob.com'+m.pageUrl:`https://www.fotmob.com/matches/football?matchId=${m.id}`};
}

// FotMob's day feed is explicitly requested in Europe/Zagreb. These half-start
// timestamps are local to that requested timezone, unlike scheduled utcTime.
export function fotmobHalfStart(value:any){
 if(typeof value!=='string')return null;
 const m=value.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);if(!m)return null;
 const desired=Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]);let utc=desired;
 for(let i=0;i<2;i++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);utc+=desired-local;}
 return new Date(utc).toISOString();
}
