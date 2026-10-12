# Touchline — start here in a new chat

Use this source archive to continue work. The app is hosted at https://touchline-football-hub.netlify.app and is a Vite/React project with Netlify Functions and Netlify Blobs. This archive is the canonical Netlify source; do not replace it with the older Sites frontend. Preserve all existing UI, match data and saved records.

## Precision and dribble accuracy — 6 October 2026
Accuracy includes Dribble accuracy when source success/attempt totals or an explicit percentage exist. Shared stat formatter limits decimal outputs to two places (no forced .00 on counts), including player metrics and match overview statistics; percentage ratios use two-place rounding. Rating badges show two decimals; season leader formatting is capped at two. The generic “Successful / attempted” helper text is hidden in Accuracy; numeric counts remain. Original stored source values are retained. No added network requests or data migration.

## Player popup refinement — 6 October 2026
Overview pass accuracy shows percentage only. Attacking/Defending use full-width single-line label/value rows; success/attempt counts are retained without appended percentages, percentage-only source rows are excluded from these two tabs. Accuracy retains percentage rings and denominators. The popup has a fixed responsive height shared across all tabs; only tab content scrolls. No source fetch or scheduler changes.

## Player statistics and match theming — 6 October 2026
Player popup now has Overview, Attacking, Defending, Accuracy. Overview is position-aware; accuracy uses source percentages or valid success/attempt ratios, never interprets raw interception counts as accuracy. Animated SVG rings respect reduced motion. Attacking/Defending use source categories and meaningful stat keys.
FotMob player stat normalization retains value/total/type/group. Match-detail playerDataVersion is now 7, triggering a one-time on-demand saved-record upgrade through existing source pipeline; previous versions cannot block upgraded origin cache. Failed upgrades preserve old values and retry after 24 hours. No bulk backfill or added polling. Daily worker continues version>=2 coverage checks. Details, shared lineup pitch/bench and match stats inherit competition-specific palette/motifs for all 11 competitions, including light theme.
Verification: four source/accuracy tests plus production build. No paid services or new schedules.

## UI update — 6 October 2026
Settings uses a mobile-safe three-column tab grid, theme previews, compact daily/usage metrics, expandable report explanations and match lists. Account controls appear under Appearance only. Weekly/monthly schedule text reflects native first-daily-check generation, not the old 09:00 ChatGPT tasks.
Lineups player selections open a Radix Dialog with portal, focus trapping, Escape/outside dismissal and return focus to the selected player. Portal receives competition colors explicitly; images, ratings and available individual statistics use existing loaded data (no extra fetch). National match group tables and knockout brackets follow Nations League, World Cup and EURO palettes/motifs; light-theme variants remain legible.

## Non-negotiable user preferences
- Personal use, no paid services, upgrades or payment methods. Other Netlify projects share the free allowance.
- Default dark theme; optional light theme. Mobile friendly; 24-hour times; live match minutes without seconds; HT at halftime.
- Leagues: England, Spain, Italy, Germany, Croatia; plus Champions League, Europa League, Conference League; Nations League, World Cup and EURO.
- Public official YouTube highlights, including SportKlub Hrvatska, ArenaSport, HNS, MAXSport, HRT, official clubs/leagues. Exclude ITV; respect publisher/region/embed restrictions and offer the official YouTube link. Never copy footage or bypass restrictions.
- Show final player ratings/individual statistics only after full time. Never invent missing data.
- Live score/minute/scorers poll every 30 seconds only while visible; heavier match details every 5 minutes. No live polling while closed/hidden.
- Finished-match highlights appear in Details between Match information and Match timeline, and remain available in the Highlights tab. Video player loads on tap.

## Hosting and ownership
Netlify site ID: 50f08265-7afe-4542-ad4f-d8a92823d202. Team: boricdomagoj. Site name: touchline-football-hub.
The source is not git-backed, so replace this same backup after code changes. No credentials are included. A new chat must obtain authorized Netlify access for deployment; an old local CLI configuration is not durable authorization.
Owner login: Dome11, no public registration, secure password setup, 30-day remembered HttpOnly session cookie. See PRIVATE-LOGIN.md. Do not reset the owner's password, overwrite the owner Blob record, or rotate the server secret merely to regain authoring access. Preserve server secrets securely across deploys.

## Durable scheduled access
The app remains on Netlify. A separate existing owner-only Sites service stores the Netlify service credential server-side:
project ID appgprj_6abf8c4280d08191ad6121153a1ab188.
Its Git-backed source is maintained through Sites workflow, not this ZIP. The service adds a narrow POST /api/touchline-netlify route; body {path:"/api/..."}. Only catalogue, match-day, match-highlights, match-detail, usage-reports are allowed, always sent to the fixed Netlify host. The stored secret is never returned to the client.
Each run calls Sites get_site afresh, verifies active/owner-only/owner role, obtains current_live_url and siwc_bypass_bearer_token, and sends that token ONLY to the Site in OAI-Sites-Authorization: Bearer <token>. Never use local authoring credential files for scheduled runs. See PRIVATE-LOGIN.md and scripts/private-bridge-request.py for secure stdin transport.
Do not change Site sharing, recreate the Site, expose its secret, enable paid services or re-enable the obsolete hourly Site refresh. Preserve the website's independent owner login.

## Independent hosting schedules (6 October 2026)
Native Netlify scheduled functions now replace ChatGPT tasks. `refresh-scheduled` UTC cron 30 21,22 * * * and `refresh-midday` 45 10,11 * * * use Europe/Zagreb guards: only 23:30 and 12:45 dispatch actual checks. Two extra daily timer invocations exit immediately for DST handling. No plan changes: account capability background_functions.included=true, accumulate_overages.included=false, credit_features.included=false verified before enabling.
Authenticated refresh-background uses server-held TOUCHLINE_REFRESH_SECRET and fixed Netlify host, processes only completed fixtures, skips saved matched highlights, fetches final player data for every completed game, checkpoints progress in touchline-scheduled-runs. Sequential highlight saves prevent lost catalogue updates. Transient API retries once. Each segment checkpoints after 8 minutes, maximum four segments; incomplete runs report budget-reached. No continuous scans, no paid data services. Daily reports show saved run state/failures. Weekly/monthly reports generate in the first daily worker on Monday/1st, not necessarily 09:00.
Old ChatGPT tasks 6ac27730005081918ffd3a7c1560ebb3, 6ac27731eef08191a277ad68c3920b59, 6ac28df8d484819186ed5b349405517c, 6ac28dfb0bf481918f7c30e36142f70c are paused after native verification. Obsolete hourly Automation_48a8ce0cc3b48191b4cd301af8591563 remains disabled. The Sites bridge may remain for authoring but runtime does not depend on ChatGPT or Sites.
Reports measure incomplete app activity, not official shared remaining Netlify allowance. Hosting quotas and public-source availability still apply.

## Build and publish
Use npm run build. Do not deploy until it completes successfully. Netlify deployment must include BOTH dist and netlify/functions, with the correct site's existing server secrets securely provided. Reuse the current authenticated deployment method; do not save secrets in this archive or chat. Tests for private login are in tests/private-auth.test.mjs.
Read the current production deployment from Netlify when continuing; this archive includes subsequent navigation and competition-logo UI updates. The 5 October access repair modified only the private Sites service, schedule instructions and documentation; it did not rebuild the Netlify app.

## Work across chats
The ZIP is durably saved on the user's account. New chats do not automatically receive cross-chat file access. Attach/select the latest Touchline-Netlify-Match-Centre.zip and ask to continue from this HANDOFF.md. Prefer replacing the same Library file, ID libfile_9b07c1f590b08191b42e73b53494b889, rather than creating divergent backups; verify the current version before replacing it.
# Daily football report

Settings > Daily report uses `/api/daily-report?date=YYYY-MM-DD`, defaults to yesterday in Europe/Zagreb, and reads saved fixtures, verified catalogue clips and final match details without fetching external sources. A snapshot is persisted when viewed and reused briefly. Match highlight checks record new saved video IDs in `touchline-daily-highlight-checks`; older checks can be read from saved response metadata, but historical new-video counts cannot be reconstructed. This adds no separate scheduler. The existing ChatGPT checks are still the background scheduler; Netlify native scheduled functions remain disabled.

Player card: three tabs Overview/Attacking/Defending. Overview shows successful pass count in place of pass accuracy, followed by all existing animated percentage circles. Keeper save accuracy is now a circle only. No additional data requests.

Match days: centered 900px maximum-width section; competition groups stack in one column at all sizes. Score controls, results and update notice share the same centered width.

Removed legacy Croatia UEFA portrait entries/static images and season-independent override. Croatia skips saved team portrait lookup, retaining match provider photos through the existing image cache fallback.

Settings Appearance: Desktop mode switch below themes. Device-local preference, numeric 1100px desktop viewport; off restores explicit phone screen width for touch phones (normal device-width on desktop/tablets). Browser Request Desktop Site setting cannot itself be changed by app code.

Light theme: restored competition-branded score headers/tinted rows, dark row scores/date arrows, league tabs/statistics/highlight filters/video cards. National banner titles and identity remain white; country selection dark; competition filter buttons use their own brand.

Club pages in light mode: white club identity/info and fixture cards, dark names/scores/descriptions; league-coloured kickers/back links/actions and refresh button. Highlight video cards retain branded backgrounds and white text.

Light theme refinement: club highlight copy uses white panel/dark title. League standings use darkened league palette with white table text. Match Details/Lineups/Statistics/Standings/Highlights use darkened competition palette, white copy, branded tabs and readable controls. Rating badge colours retained.

Light match follow-up: dark Back to matches/arrow and external footer copy; league-coloured final-player notice and heading above standings. Branded panel footnotes remain white. Match Highlights container now rounded/padded.

Light-mode refinement: league highlight copy white with dark titles; all season statistic cards use league palette/white copy. National game cards use the relevant competition palette/white copy while Full Time and game action accents are untouched. National competition filters share one background/text/style, selected choice marked by underline.

Light theme national competition highlights: white video copy panel/dark titles and metadata, matching league highlight card readability.

Europa League light theme: orange-first identity using official orange accents and deeper orange panels for white-text contrast, small black header/tab accents. Scoped competition data attributes prevent changes to other competitions/dark theme.

Light statistics card headers: removed square heading/category fills; heading text and icons use a brighter version of each card border accent. Applies to all leagues including Europa League.

Light mode statistics headings for La Liga/Bundesliga/HNL/Europa: another 30% toward white from prior 75%-accent mix (now 52.5% accent). Other leagues unchanged.

Navbar includes Logitech-112 next to wordmark, colour matched to dark/light navbar and aria-hidden; absolute placement avoids shifting navigation.

Who will win: read-only FotMob 1x2 fan poll from verified /api/data/vote?matchId, home/draw/away percentages and summed vote counts. Cache five minutes before/during play, 24h after full time; no vote submission. Existing finalized player data preserved during lazy poll upgrade. Poll unavailable notice on source failure. Desktop >=900px match lists use one row home/central score/away; shared lineup pitch is horizontal G-to-attack left/right, mobile stays vertical.

API response cache invalidates match-detail payloads lacking pollLookupCheckedAt so already-finalized matches receive lazy poll data without waiting for the prior week-long cache expiry.
