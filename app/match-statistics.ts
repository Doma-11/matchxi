const metrics=[
 ['Ball possession',['possessionpct','ballpossession','possession']],
 ['Total shots',['totalshots','shots','shotstotal']],
 ['Shots on target',['shotsontarget','shotsongoal','ontargetshots']],
 ['Goalkeeper saves',['goalkeepersaves','saves']],
 ['Corner kicks',['cornerkicks','corners','woncorners']],
 ['Fouls',['fouls','foulscommitted']],
 ['Passes',['passes','totalpasses']],
 ['Expected goals (xG)',['expectedgoals','expectedgoal','xg']],
 ['Big chances',['bigchances','bigchance']],
 ['Tackles',['tackles','totaltackles']],
 ['Free kicks',['freekicks']],
 ['Yellow cards',['yellowcards','yellowcard']],
 ['Red cards',['redcards','redcard']],
 ['Average rating',['averagerating','rating','fotmobrating']]
] as const;
const normalize=(s:any)=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function orderedMatchStatistics(statistics:any[]=[]){return metrics.map(([label,aliases],index)=>{const found=statistics.find(s=>(aliases as readonly string[]).includes(normalize(s.id))||(aliases as readonly string[]).includes(normalize(s.label)));return {id:'overview-'+index,label,home:found?.home??'—',away:found?.away??'—',possession:index===0,available:!!found};});}
