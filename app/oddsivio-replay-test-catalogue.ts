import type {GoalReplay} from './goal-replays';

/** Fixed metadata read from Oddsivio's Goal Timeline on 25 November 2026.
 * No runtime Oddsivio/Reddit requests or media extraction. These watch links
 * have no verified supported video-only embed, so the list opens them externally.
 */
type OddsivioTestReplay=GoalReplay & {sourceUrl:string;sourceKind:'oddsivio-goal-timeline'};
function goal(id:string,minute:string,scorer:string,team:string,match:string,score:string,videoId:string,sourceUrl:string):OddsivioTestReplay{
 return {id,minute,scorer,team,match,score,videoUrl:`https://streamin.link/v/${videoId}`,postUrl:'',testOnly:true,kind:'goal',matchDate:'2026-11-24',sourceKind:'oddsivio-goal-timeline',sourceUrl};
}
const citySource='https://www.oddsivio.com/matches/121642?tab=videos';
export const ODDSIVIO_TEST_REPLAYS:readonly OddsivioTestReplay[]=[
 goal('ucl-20261124-hojlund-55','55′','Rasmus Højlund','Napoli','Manchester City vs Napoli','0–1','79a89a60',citySource),
 goal('ucl-20261124-bouaddi-67','67′','Ayyoub Bouaddi','Manchester City','Manchester City vs Napoli','1–1','9bdbca82',citySource),
 goal('ucl-20261124-lang-76','76′','Noa Lang','Napoli','Manchester City vs Napoli','1–2','30d59f48',citySource),
 goal('ucl-20261124-cherki-86','86′','Rayan Cherki','Manchester City','Manchester City vs Napoli','2–2','77b71472',citySource),
 goal('ucl-20261124-gyokeres-10','10′','Viktor Gyökeres','Arsenal','Arsenal vs Borussia Dortmund','1–0','58658f5c','https://www.oddsivio.com/matches/121637?tab=videos'),
];
