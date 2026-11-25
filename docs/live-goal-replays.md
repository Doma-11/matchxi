# Live Goal Replays — Oddsivio discovery / Streamin playback

## Current behavior — 25 November 2026

Enable Settings → Appearance → Goal Replays preview, open a live match stream,
and press Find Replays. Refresh is manual. Opening the stream, enabling the
preference, switching games and watching a goal do not make replay requests.
Reddit is no longer used by the live route and no Reddit credentials are needed.
The old Reddit factory remains exported only for its existing regression tests;
it is not instantiated or called by the runtime route.

On an explicit click, `/api/match-replays` reads Oddsivio's public Matches page,
finds both teams using the existing identity aliases and checks kickoff time
within 90 minutes. If the current-day list has no unique fixture, one bounded
lookup in the public recent Highlights index may locate an adjacent-day match.
It then reads exactly one matching match page and verifies both teams, kickoff
and source match ID again before extracting Goal Timeline metadata.

Only Streamin `goal_clip` entries qualify. Events provide the scorer, minute,
added time and score; bracketed title scores identify the scoring team, including
own goals. Duplicates combine by event. Highlights, disallowed goals, unrelated fixtures, unexpected hosts and malformed
metadata are excluded. Clips explicitly marked non-embeddable offer Open video.
An empty list differs from access denial, rate limits or changed source layout.
Source pages are parsed as JSON data without executing scripts. This uses public
HTML rather than a documented integration API; layout and availability may change.
No source permission or official partnership is represented as established.

## Bounds and costs

A Find/Refresh makes at most three HTML requests, each capped at 2 MiB, under a
16-second overall timeout. There are no retries, guessed endpoints, alternate
host fallbacks, login automation or access-block workarounds. A 403 or 429 stops
the lookup and sets a cooldown. Parsed fixture metadata and match results are
cached in memory for 45 seconds; same-match work coalesces and at most 100 results
are held. The UI also suppresses duplicate clicks within ten seconds. No response
is written to Blobs, no footage is stored or proxied, no scores API is added,
and no background polling or schedules are enabled.

## Playback

Selecting a Streamin goal makes one `/api/replay-source` metadata request. It
reads at most 256 KiB of the fixed Streamin watch page with an eight-second timeout
and validates a video/source URL for the same clip ID on the observed CDN hosts.
The URL is not guessed. Native video uses controls, playsInline and preload=none;
press Play to start. A three-minute in-memory source cache coalesces repeated
selections. Resolution failure tries Streamin's published official embed path;
Open video stays available for unsupported or unavailable clips. This remains
an undocumented compatibility path, not a guaranteed provider API.

The same live iframe remains mounted and becomes the small player while a replay
is open. X/Escape stops and releases the replay and restores live focus. Replays
are hidden while Other games is open. Competition theme and existing score-polling
behavior are unchanged. Two simultaneous players can use additional device
bandwidth/decoding resources; cross-origin live-stream audio remains outside
MatchXI's control.

## Rollback

The feature is opt-in/off by default. Disable Goal Replays on the device, or revert
the discovery PR independently of the preceding playback PR. The five Settings
test sources are unchanged. No databases, video storage or schedules need cleanup.
