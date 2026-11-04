import {LEAGUES,CLUB_CUPS,COMPETITIONS} from './football-model';

/** Per-row identity must not inherit the currently watched game's accent. */
export function streamCompetition(league:string){
 const found=[...LEAGUES,...CLUB_CUPS,...COMPETITIONS].find(c=>c.id===league);
 const palette=league==='eng.1'?{brand:'#37003c',accent:'#c28aff',surface:'#250028'}:
  league==='cro.1'?{brand:'#c90028',accent:'#ff5975',surface:'#300b16'}:
  {brand:found?.brand||'#27364a',accent:found?.accent||'#b6c5dc',surface:found?.surface||'#172435'};
 return {id:league,name:found?.name||league||'Other competition',...palette};
}
