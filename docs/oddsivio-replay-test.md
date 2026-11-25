# Oddsivio replay test — 25 November 2026

Settings → Goal Replays preview → Enable → Test without a live match.
The default test list now has five goals from 24 November's Champions League
fixtures, manually read from Oddsivio's Goal Timeline:

| Match | Scorer / team | Minute | Score | Streamin ID |
| --- | --- | --- | --- | --- |
| Manchester City–Napoli | Rasmus Højlund / Napoli | 55 | 0–1 | 79a89a60 |
| Manchester City–Napoli | Ayyoub Bouaddi / Manchester City | 67 | 1–1 | 9bdbca82 |
| Manchester City–Napoli | Noa Lang / Napoli | 76 | 1–2 | 30d59f48 |
| Manchester City–Napoli | Rayan Cherki / Manchester City | 86 | 2–2 | 77b71472 |
| Arsenal–Borussia Dortmund | Viktor Gyökeres / Arsenal | 10 | 1–0 | 58658f5c |

Source pages:
- https://www.oddsivio.com/matches/121642?tab=videos
- https://www.oddsivio.com/matches/121637?tab=videos

These are fixed test links, not live-match discovery. The old Nations League
catalogue remains in source. All five Streamin watch pages are external-only
under the existing provider policy; no supported video-only embed was found.
Clicking the Højlund card on Oddsivio did not mount an iframe. Opening its host
link redirected to https://streamin.me/v/79a89a60 and exposed an active player
with a moving progress control. This verifies that host page in this browser,
not internal MatchXI playback or mobile compatibility. The other four links
were read from Oddsivio; their playback has not been verified.

The test uses the Champions League palette. Existing Streamable compatibility
tests remain below this list. No scraping service, API route, polling, video
download, raw-media extraction, storage, or proxy was added. Live search and
the live iframe lifecycle are unchanged. The preference is still off by
default and can be disabled per device. Revert the feature commit to restore
the previous default test list.
