# Live Goal Replays

## Implemented vs connected

The single live-stream modal now uses a match-specific Goal Replays panel, replacing the unrelated Wirtz test placeholder. Enable Settings → Appearance → Goal Replays preview, open a live match stream, then click Find Replays. No lookup occurs on opening the stream, enabling the feature, opening this panel, or watching a goal.

**Reddit discovery is not operational until approved OAuth access is configured.** Missing configuration, denied access, rate limits and empty results are separate states. Never describe an unconfigured search as a successful empty search. No public JSON scraping, browser-block bypass, anonymous requests or alternate Reddit hosts are used. Actual Reddit results and real video playback have not been verified by automated tests.

The permanent manual test is **Have a video mirror link?** → paste an HTTPS Streamable watch link → Play in app → press Play in the provider. The video is labelled user-provided, with match/goal identity unverified. Unsupported known-host links offer Open video. Reddit post URLs and raw footage URLs are not players. Links stay in component memory and clear when closing or changing the match.

## Owner setup

After Reddit grants the app the required access, set these Netlify environment variables with **Functions** scope and redeploy. Do not put credentials in source, client code, query strings, chat or diagnostics:

- `MATCHXI_REDDIT_ENABLED=true` — explicit activation after approved access.
- `MATCHXI_REDDIT_USER_AGENT` — accurate descriptive user agent including app version and Reddit contact username.
- `MATCHXI_REDDIT_CLIENT_ID`, `MATCHXI_REDDIT_CLIENT_SECRET`, `MATCHXI_REDDIT_REFRESH_TOKEN` — approved app and read-authorized refresh credentials. Access tokens are renewed only during a user request and kept in function memory.
- Alternatively, `MATCHXI_REDDIT_ACCESS_TOKEN` can supply an already approved read token for a short test; it expires and must be replaced. Never commit a token.

No credential values were read or changed during implementation. Listing Netlify environment variables was rejected by automatic approval review; setup status is therefore unverified until the authenticated app route responds.

Primary access guidance: https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki

## Request limits and matching

One explicit action requests the 50 newest search results filtered by `flair:"Goal Clip"` and both team names (including known aliases) and checks mirror comments on at most eight matching goal posts. Match filtering requires both team identities in order, a parseable score/minute and publication near the existing fixture kickoff. Title aliases use the existing team-identity catalogue. Disallowed goals, saves, misses, removed posts and unrelated fixtures are excluded. Ambiguous scoring teams are labelled unconfirmed; own-goal rows say Goal for rather than implying the scorer belongs to that team.

Goal Clip flair is checked again on returned posts, supporting emoji/plain/rich-text flair. Watch links can come from a link post or the body of a Goal Clip text post. Other flairs are excluded. Original host support never gates mirror discovery. Only links in the pinned AutoModerator Mirrors / Alternate or Alternative Angles thread and bounded nested replies qualify. Known HTTPS watch links are allowlisted, deduplicated and sorted with supported Streamable links first. No host page is fetched by discovery, and no guessed embed, raw media extraction, download or video proxy exists.

Metadata cache is in function memory for 45 seconds, coalesces same-match requests and holds at most 100 results. It bypasses the API's persistent Blobs response cache. Refresh respects that brief cache; the UI suppresses clicks within ten seconds. Reddit rate-limit headers trigger cooldown; 401/403 stop immediately. No background retries, scores API calls, durable Reddit content or scheduled jobs are added. Low-volume usage only; free API access is subject to Reddit eligibility and approval.

## Playback and rollback

Supported videos use the existing competition-themed video stage. The same live iframe stays at the same React location, key, URL and sandbox; CSS makes it smaller. Close/X/Escape removes the replay iframe and restores live focus. Selecting a different mirror remounts the replay player only. Cross-origin live-stream audio cannot be controlled by MatchXI, and two videos can consume additional device bandwidth/decoding resources.

Feature remains opt-in/off by default. Disable in Settings to remove the panel. Revert the feature PR for code rollback; no new database, infrastructure, schedules or stored footage need cleanup. Multiview is unchanged.

The replay section is hidden while Other games is open. Its component stays mounted, preserving current results and pasted text; toggling the drawer triggers no replay request. Helper paragraphs were removed; loading, empty and connection errors use compact labels. Missing Reddit setup remains a distinct error, not an empty list.
