import {WIRTZ_TEST_REPLAY,type GoalReplay} from './goal-replays';

/** Manually curated 19 Nov 2026. This is a fixed test set, not runtime discovery.
 * Reddit browser access was denied. Publicly indexed r/soccer goal posts/match
 * threads identify the events; each host link was cross-checked on the fixture's
 * video page. Unknown individual post IDs are not invented.
 */
export type TestGoalReplay=GoalReplay & {
 matchDate:string;
 sourceKind:'goal-post'|'match-thread';
 videoSourceUrl:string;
 embedCheck:{checkedOn:string;result:'external-only';reason:string;playbackVerified:false};
};
const belgiumThread='https://www.reddit.com/r/soccer/comments/1xx4f3y/match_thread_belgium_vs_italy_uefa_nations_league/';
const germanyThread='https://www.reddit.com/r/soccer/comments/1xxyqjz/match_thread_germany_vs_netherlands_uefa_nations/';
const check={checkedOn:'2026-11-19',result:'external-only' as const,reason:'No supported video-only Streamin embed verified. Open the host video externally.',playbackVerified:false as const};
function clip(id:string,date:string,minute:string,scorer:string,team:string,match:string,score:string,videoId:string,postUrl:string,sourceKind:TestGoalReplay['sourceKind'],videoSourceUrl:string):TestGoalReplay{
 return {id,matchDate:date,minute,scorer,team,match,score,videoUrl:'https://streamin.link/v/'+videoId,postUrl,sourceKind,videoSourceUrl,embedCheck:{...check},testOnly:true,kind:'goal'};
}
const belgiumSource='https://www.oddsivio.com/matches/122532?tab=videos';
const germanySource='https://www.oddsivio.com/matches/122543?tab=videos';
export const NATIONS_LEAGUE_TEST_REPLAYS:readonly TestGoalReplay[]=[
 clip('esposito-bel-ita-11','2026-11-15','11′','Francesco Pio Esposito','Italy','Belgium vs Italy','0–1','f1b01157',belgiumThread,'match-thread',belgiumSource),
 clip('de-cuyper-bel-ita-15','2026-11-15','15′','Maxim De Cuyper','Belgium','Belgium vs Italy','1–1','68e6e3f6','https://www.reddit.com/r/soccer/comments/1xx56vz/belgium_1_1_italy_m_de_cuyper_15/','goal-post',belgiumSource),
 clip('ngoy-bel-ita-22','2026-11-15','22′','Nathan Ngoy','Belgium','Belgium vs Italy','2–1','b8b0c142',belgiumThread,'match-thread',belgiumSource),
 clip('doku-bel-ita-26','2026-11-15','26′','Jérémy Doku','Belgium','Belgium vs Italy','3–1','9c389155','https://www.reddit.com/r/soccer/comments/1xx5grj/belgium_3_1_italy_j_doku_26/','goal-post',belgiumSource),
 clip('moreira-bel-ita-80','2026-11-15','80′','Diego Moreira','Belgium','Belgium vs Italy','4–1','f4b8ebb3',belgiumThread,'match-thread',belgiumSource),
 clip('scherhant-ger-ned-41','2026-11-16','41′','Derry Scherhant','Germany','Germany vs Netherlands','1–0','76ce927b',germanyThread,'match-thread',germanySource),
 {...WIRTZ_TEST_REPLAY,matchDate:'2026-11-16',sourceKind:'goal-post',videoSourceUrl:germanySource,embedCheck:{...check},kind:'goal'},
 clip('schlotterbeck-ger-ned-65','2026-11-16','65′','Nico Schlotterbeck','Germany','Germany vs Netherlands','3–0','a6799dcd',germanyThread,'match-thread',germanySource),
 clip('wirtz-ger-ned-71','2026-11-16','71′','Florian Wirtz','Germany','Germany vs Netherlands','4–0','b16e3822','https://www.reddit.com/r/soccer/comments/1xy1gao/germany_4_0_netherlands_f_wirtz_71/','goal-post',germanySource),
 clip('gruda-ger-ned-77','2026-11-16','77′','Brajan Gruda','Germany','Germany vs Netherlands','5–0','d56ba792','https://www.reddit.com/r/soccer/comments/1xy1m59/germany_5_0_netherlands_b_gruda_77/','goal-post',germanySource),
];
