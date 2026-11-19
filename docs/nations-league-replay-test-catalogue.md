# Ten Nations League goal replay checks — 19 November 2026

The owner requested 10 different goals from the Nations League fixtures played Sunday 15 and Monday 16 November 2026, in Europe/Zagreb. The test catalogue includes all five goals from Belgium–Italy and all five from Germany–Netherlands. The Italy opener is included, so the scorer’s team is explicit even when it is the away side.

## Results

| Match date | Fixture | Minute | Scorer | Scoring team | Score after goal (home–away) | Host clip ID | Internal player result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15 Nov 2026 | Belgium–Italy | 11′ | Francesco Pio Esposito | Italy | 0–1 | f1b01157 | External only |
| 15 Nov 2026 | Belgium–Italy | 15′ | Maxim De Cuyper | Belgium | 1–1 | 68e6e3f6 | External only |
| 15 Nov 2026 | Belgium–Italy | 22′ | Nathan Ngoy | Belgium | 2–1 | b8b0c142 | External only |
| 15 Nov 2026 | Belgium–Italy | 26′ | Jérémy Doku | Belgium | 3–1 | 9c389155 | External only |
| 15 Nov 2026 | Belgium–Italy | 80′ | Diego Moreira | Belgium | 4–1 | f4b8ebb3 | External only |
| 16 Nov 2026 | Germany–Netherlands | 41′ | Derry Scherhant | Germany | 1–0 | 76ce927b | External only |
| 16 Nov 2026 | Germany–Netherlands | 60′ | Florian Wirtz | Germany | 2–0 | cfb904d3 | External only |
| 16 Nov 2026 | Germany–Netherlands | 65′ | Nico Schlotterbeck | Germany | 3–0 | a6799dcd | External only |
| 16 Nov 2026 | Germany–Netherlands | 71′ | Florian Wirtz | Germany | 4–0 | b16e3822 | External only |
| 16 Nov 2026 | Germany–Netherlands | 77′ | Brajan Gruda | Germany | 5–0 | d56ba792 | External only |

Each clip URL was checked against the app’s supported provider adapter. All ten use Streamin, not Streamable; no supported video-only Streamin embed has been verified. **0 of 10 qualify for the current internal player; all 10 get Open video.** This records provider eligibility, not successful playback attempts, and does not claim that Streamin can never support an embed. No raw media URLs, guessed embed URLs, proxying or post-card fallback were used.

`embedCheck.playbackVerified` is false for every entry. The catalogue contains no claim of live in-app or physical-phone video playback. The previously verified Streamable adapter remains available through the manual compatibility test.

## Provenance and access limitation

Reddit explicitly denied browser access with an automated-access block. No alternate Reddit domains, API scraping, challenge bypass or continuous polling were attempted after that block. Publicly indexed r/soccer results were used to identify known goal posts and the two match threads. Individual goal-post identifiers that were not present in those results were not invented: those entries retain the relevant match-thread URL and are marked `sourceKind: match-thread`.

Five entries have known individual goal-post sources: De Cuyper, Doku, Wirtz 60′, Wirtz 71′ and Gruda. Esposito, Ngoy, Moreira, Scherhant and Schlotterbeck reference indexed match threads for the event metadata. Video links and matching goal titles/uploader identity were cross-checked from the fixture video pages:

- https://www.oddsivio.com/matches/122532?tab=videos
- https://www.oddsivio.com/matches/122543?tab=videos

Reddit match references:

- https://www.reddit.com/r/soccer/comments/1xx4f3y/match_thread_belgium_vs_italy_uefa_nations_league/
- https://www.reddit.com/r/soccer/comments/1xxyqjz/match_thread_germany_vs_netherlands_uefa_nations/

Official event cross-checks:

- https://www.figc.it/en/national-teams/news/belgium-hit-four-as-italy-miss-out-on-nations-league-quarter-finals-fx7mmtst
- https://datencenter.dfb.de/en/data-center/uefa-nations-league-division-a/2026-2027/group-2/2416032

All entry-level source URLs are retained in `app/goal-replay-test-catalogue.ts`.

## Where the owner tests

Settings → Appearance → Goal Replays preview → Enable → Test without a live match.

The 10 historical goals are immediately listed after this explicit test action, with minute, scorer, scoring team, score after goal, fixture, date and the external-only result. The test window uses the Nations League palette. Open video always opens a separate tab; it does not select a replay or shrink the simulator/live frame.

The static list is only supplied to the Settings lab. It is not attached to unrelated live fixtures. Opening or refreshing this list reads bundled metadata only, with no Reddit search, provider checks, score requests, video preloads or new background tasks.
