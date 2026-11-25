# Oddsivio replay test — 25 November 2026

Update: the five fixed test sources below are unchanged. Live-match Streamin
links now have a separate on-selection metadata resolver and provider embed
fallback; see `live-goal-replays.md`. Live discovery now reads public Oddsivio fixture and goal metadata on Find/Refresh; see `live-goal-replays.md`.

## Native playback experiment (supersedes the initial external-only result)

The five clips now offer Replay in the existing Settings test screen. Each
opens a native video element with controls, playsInline and preload=none.
The media URL is a fixed, public URL observed in that clip's own Streamin
video element. There is no runtime resolver, scraping, URL guessing, proxy,
video persistence or automatic discovery. Loading uses Touchline. Errors and
slow playback retain the original Open video fallback. Only exact test IDs
and matching watch URLs can use this path; ordinary discovered clips cannot.
The live iframe remains in its existing position in the React tree. Closing
or switching replays pauses and releases the replay media.

This is an undocumented compatibility experiment, not a supported Streamin
API or a guarantee of permission, availability, longevity or mobile playback.
Provider access restrictions are not bypassed. No iframe restrictions, media
headers or origin checks are removed. A technical success does not resolve
provider terms or footage rights. The experiment remains behind the existing
off-by-default replay preference. Revert replay-playback.ts and its player
changes to restore external-only behavior.

## Browser verification

On 25 November 2026 the deployed MatchXI test played the Højlund clip from
matchxi.netlify.app in Chrome: currentTime advanced past five seconds,
readyState was 4, paused was false and media.error was null. The simulator
clock continued counting. This verifies one clip in desktop Chrome, not
mobile compatibility or reliability of all future Streamin clips.

A follow-up adds an explicit Play replay button and brings the player into
view when a lower list item is selected. Merely selecting a clip with
preload=none does not show a false loading state.

## Initial source inspection


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
