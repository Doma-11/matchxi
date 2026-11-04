
### On-demand external livestream listings
Live matches now offer Highlights and Livestream sub-tabs. Livestream listings are fetched only after the visitor presses the check button; there is no background stream polling. `/api/match-streams` uses the existing private API authorization and saves successful listings permanently per fixture. Found links are also saved on the device, so reopening the panel sends no request. There is no recheck button after links are found; failed or empty lookups can be retried manually. It matches both team names and returns only HTTPS pages on the chosen listing site. Listings do not establish playback availability or broadcast rights and are labeled accordingly. No footage or iframe is proxied. Android links attempt Firefox through an intent with an HTTPS fallback. iPhone/iPad links use Firefox’s installed-app URL scheme and also offer a normal HTTPS link. Desktop links stay in the current browser; opening Touchline itself in Firefox makes the stream links open in Firefox tabs. Completed matches expose no livestream tab.

Livestream listings now also offer Play in app. The private `/api/stream-player` endpoint reads the listing's published iframe, restricts it to the supported HTTPS provider, and checks its frame policies. It never proxies video bytes or modifies provider restrictions. Player metadata is saved and reused; playback only loads on a visitor's click and stops when the livestream tab unmounts or the match is no longer live. The iframe uses a sandbox without popup or top-navigation permissions, and external Firefox links remain available when playback is blocked or unavailable. Source metadata checks do not guarantee working or geographically available footage.

## Croatian live score freshness
Croatian fixtures retain the FotMob season schedule but today's scores/status come from the public FotMob match-day JSON feed. The day feed overrides stale season HTML by fixture ID, including HT and full time. Match-day responses use a 30-second cache while live or in the 15-minutes-before/3-hours-after kickoff window. Home and the open match keep visible-only score polling in that window, even if a source still labels the fixture scheduled. No live state is inferred from kickoff time. Completed/cancelled/postponed games and dates outside the window do not trigger fast polling. Highlights and final-player-data refresh procedures are unchanged.

Opening the live match Livestream tab now triggers its one-time listing lookup automatically. Successful fixture listings remain saved and reused, with no background stream polling. Empty/error results permit a manual retry. Stream cards have centered in-app play and smaller external-link actions; provider frame restrictions remain respected. Deportivo Alavés is recognized as Alavés when matching sources.

## Foreground polling and saved fan-vote snapshots (11 October 2026)
Home's list unmounts when a match is open. Catalogue/club/dashboard refreshes stop on match/settings screens and hidden pages; catalogue navigation reuses recent results. Regular live score/event polling is 40 seconds. Before kickoff, wait locally until 15 minutes before scheduled time, check every two minutes until one minute before kickoff, then check every six seconds for a maximum five-minute window. After that, a delayed fixture falls back to 40 seconds. Once HT is first confirmed, save the observation time across navigation/reload and pause periodic checks for 15 minutes. Then check every ten seconds for up to five minutes until second-half play is confirmed; otherwise fall back to 40 seconds. Other live fixtures can still require Home's normal list refresh during a particular fixture's halftime pause.

Rapid Home checks target individual fixtures with concurrency capped at two, rather than fetching all competitions every six/ten seconds. Bulk match-day updates remain at least 40 seconds apart during detection. The match-live response cache is five seconds for kickoff detection and eight seconds for second-half detection, with the ordinary 30-second cache unchanged. Historical/finished-only lists do not poll. Requests remain serialized, aborted on hiding/leaving and refreshed on visible return. Statistics and Lineups retain five-minute visible details updates outside HT; initial details, final data and throttled player-data retries remain intact.

Home and the match use one per-fixture, session-persisted timestamp clock. A visible observed waiting-to-playing transition starts the first half at 00:00; an observed HT-to-second-half transition starts at 45:00. If entry/resume occurs mid-half rather than near the detected start, use available actual half timestamps or source elapsed time once. Whole-minute sources and status-detected anchors are estimates relative to the source. Subsequent score observations never correct a running half or reset its seconds. Stale/fallback responses cannot change the shared phase; timestamp elapsed time avoids browser timer drift. Only confirmed HT/FT stop the clock. Reaching 45/90 does not infer a phase change, and ordinary stoppages do not pause the clock. No per-second Function requests are introduced. Rapid checks add bounded requests, so the 25% reduction applies only to regular 40-second versus 30-second polling, not total usage.

`votes-scheduled` uses UTC noon candidates and a Zagreb guard; `votes-background` saves one FotMob fan-vote snapshot per fixture at 12:00 local time. Snapshot metadata records the actual timestamp and labels noon/early-match/fallback. Early games can obtain a one-time near-kickoff snapshot on entry; missed/new fixtures can obtain one after noon through existing details access/background checks. Failed unpublished votes retry no more often than six hours outside the noon job. Successful snapshots are reused without live vote updates. No forecasts are invented. The 23:30 and 12:45 highlights/final-player checks remain unchanged.

## Match navigation and empty sections (13 October 2026)

Home now offers All / Live / Upcoming. Upcoming excludes completed/live/cancelled/postponed/abandoned fixtures; completed results remain under All. Existing saved Finished selections migrate to Upcoming. Empty timeline/lineup/statistic cards inherit the match competition palette, with readable dark and light theme colours.

Match routes are identified by league and fixture ID, independently of changing background team/club data. A match entry retains its source screen and scroll position. Opening a match resets the viewport instantly after rendering, before paint, with a short opacity-only transition; global smooth scrolling is temporarily overridden. Back restores the source screen and saved scroll, ignores duplicate match entries, debounces repeated taps and falls back to an in-app destination if usable browser history is missing or does not respond. These changes introduce no polling or scheduled requests.

## Published stream-player compatibility (13 October 2026)

The listing parser recognizes the original sportsonliine.click player, the reviewed sportsonnline.click hostname used by current Arsenal/Inter listings, and dlive.sx. It inspects all iframe src/data-src attributes rather than stopping at an unrelated first frame. HTTPS, credential/port validation, fixed provider allowlists, same-host redirects, iframe sandboxing and publisher frame restrictions remain enforced. No video footage is proxied and no X-Frame-Options/CSP restrictions are removed.

Player lookup cache version 2 avoids old unsupported-provider results. Negative provider-policy metadata and API responses expire after 15 minutes; successful player lookups remain reusable. There is no new automatic stream polling; verification happens only on the existing explicit Play in app action. An HTTP error is not labelled as verified playable.

## Shared team identities and listing diagnostics (13 October 2026)

`app/team-identities.json` assigns stable internal club/national IDs independently of provider IDs. It covers the checked-in domestic clubs, all European competition table participants, national teams and saved fixture participants. `app/team-aliases.json` holds reviewed alternate names; normalization handles accents, punctuation, spacing and capitalization. Standard FC/FK/NK and similar designators generate exact indexed aliases. Youth, reserve, women’s and United/City markers are retained. Ambiguous aliases are rejected unless competition membership resolves them uniquely; there is no fuzzy/substring acceptance.

Stream matching resolves both teams through the shared index and preserves home/away order. Unknown future clubs can match identical normalized names without guessing a shorter alias. Existing successful per-fixture listings are reused; misses remain retryable. A failed lookup or unresolved source spelling saves a bounded metadata-only diagnostic under `diagnostics/<fixture-key>` in the existing stream-listings store, during the original request. No extra HTTP call, polling or scheduled job is added. Diagnostic writes are best effort and cannot hide valid listings.

For maintenance, review diagnostic team pairs against the requested fixture and competition, add confirmed names to `app/team-aliases.json`, then run `python scripts/build-team-identities.py` and the identity/matching tests. Rebuild the registry when checked-in competition/team data changes. New unknown spellings require verification; they are not automatically approved.

### Provider-name audit (14 October 2026)

Audited the public ESPN teams endpoint for the four ESPN domestic leagues, three European club competitions and three national competitions (312 competition/team entries). Reviewed name, displayName and shortDisplayName together against the identity registry; retained their verified expected IDs in `tests/fixtures/team-provider-names.json`. Croatian teams remain covered by the checked-in HNL names and existing aliases; this audit did not make a new HNL refresh. Added Feyenoord Rotterdam and other confirmed provider variations, including Hapoel Be'er, CSU Craiova, Inter D'Escaldes and Sint-Truidense. CSU Craiova remains distinct from FC U Craiova 1948, and Inter D'Escaldes remains distinct from Internazionale. The current streaming listing is checked against today's fixture names as a deployment check. No background audit or additional stream polling is introduced.

## Home minutes, listing domain migration and portrait stability (18 October 2026)

Home's mobile and desktop live rows format the existing shared clock as minutes only (`57'`, `90+3'`, or `HT`). The open match still shows minutes and seconds from the same anchor. This is a presentation change, with no change to foreground polling or clock anchoring.

The original www.soccerstreams.zone listing site now redirects to www.soccerstreams.click, whose absolute links were previously rejected. The canonical listing source is now the latter; both exact HTTPS hosts are permitted for listing URLs and redirects between them. Provider-page redirects remain same-host, and arbitrary domains, credentials, custom ports and publisher frame restrictions remain rejected. Successful saved per-fixture results and the one-time/manual stream lookup policy are preserved. Highlights/Livestream tabs and stream actions have compact responsive competition-themed controls.

Lineup portraits resolve in an isolated component effect with stale-result cleanup, rather than asynchronously replacing the parent match data from two competing effects. Current match-provider photos remain primary; saved team portraits are fallback images or fill missing photos. Provider photos are no longer replaced by potentially older immutable portrait-proxy copies. Each player renders one image source at a time and advances to fallback only on an actual image error. Preparation clones player data and cannot overwrite current match statistics/events. The existing per-team/season portrait lookup cache and Croatian legacy-portrait exclusion remain in place; no additional polling is introduced.

### Player-card layout restored (18 October 2026)

Restored the earlier livestream cards with a large centered Play in app button and external-link actions below. The revised Highlights/Livestream section switch remains. No lookup, polling or player behavior changed in this layout adjustment.

BHLiga was investigated as a potential Croatian-commentary source, but is not integrated: its public Broadcast tab showed an HR MAXSport link for Slaven Belupo–Dinamo, while the channel provider returned security error 1010 to server requests and redirected normal browser access to Google. This does not establish a usable or embeddable player, and no Croatian stream metadata or playback availability was fabricated. No access restrictions were bypassed and no new source polling was added.

### Outbound Croatian commentary links (18 October 2026)

Following the user's request to link out instead, every live match's Livestream section now includes a Croatian commentary option above the existing player cards. `app/croatian-commentary-links.json` contains manually verified public HR listing links, scoped by competition, both teams in order and the Europe/Zagreb fixture date. The observed Slaven Belupo–Dinamo MAXSport HR listing opens its published player URL externally and also offers the BHLiga match-page fallback; its playback is explicitly unverified. This is a listed channel, not an audio/playability guarantee.

For all matches without a verified direct HR listing, the option clearly opens BHLiga's public listings and instructs the user to select the match, Broadcast and HR if available. It does not claim to know a direct player or guarantee Croatian coverage for every game. Automatic BHLiga/channel-provider scraping remains blocked and is not implemented. No new Function endpoint, source fetch, timer, schedule, proxy or embedding allowlist is added. Existing general-stream lookup remains separate. New direct links require a verified public listing entry; they are not discovered automatically.

### Croatian option opens the original match page (18 October 2026)

For a verified fixture mapping, the main Croatian commentary button now opens the BHLiga `/match/<id>` page rather than the protected third-party player. The user selects Broadcast → HR there. Fixture matching still requires both teams, competition and Zagreb date, and rejects ambiguous or unsafe destinations. Unmatched fixtures retain the clearly labeled homepage fallback: automatic BHLiga discovery remains unavailable, so this is not universal automatic match-page coverage. No additional requests, polling or embedded-player access are introduced.

### Device installation in Settings (18 October 2026)

Appearance includes an Install Touchline card. A single app-wide listener captures beforeinstallprompt before login and navigation, reuses it once after a user click, and handles dismissal, errors, standalone mode and appinstalled. Unsupported browsers show honest installation/bookmark instructions; projector/TV installation cannot be forced. The small same-origin network-only navigation service worker provides an offline message and supports older Chrome install criteria. It does not cache private data, intercept API requests, add background checks or prefetch resources. Worker registration/update checks are static hosting requests, not additional API Function calls. No authentication or data refresh policies changed.

### Owner-only official hosting reports (19 October 2026)

Only the authenticated Dome11 account sees Daily report / Reports in Settings. The API dispatcher and both report routes independently deny members before reading report/cache data. Report responses bypass generic response caching and use private no-store, so owner results cannot be reused through another login. Private scheduled service access remains authorized. Login identity is reused through React context without an extra role-polling request.

Daily, weekly and monthly views include official team-wide Netlify serverless invocation and bandwidth time series with daily/monthly charts, exact-value tables, selected-period totals and published day/month totals. Team-wide scope includes other projects and is never labeled Touchline-only. Netlify bucket timestamps are preserved and may differ from Zagreb calendar days; absent buckets are not invented zeros. Billing bandwidth counters are separately labeled because billing and calendar boundaries differ. Subscription spending is only displayed when its schema is verified: the currently returned zero-price plan plus an explicitly empty usage-cost list. It is not a finalized invoice and excludes domain charges/tax. Unknown paid line-item formats remain unavailable rather than being guessed.

The server-only NETLIFY_USAGE_TOKEN is supplied securely during deploy, never committed, sent to visitors, placed in report JSON or logged. Collection makes fixed GET requests to api.netlify.com and analytics.services.netlify.com for the current project's owning team, with source concurrency at most two. Results and failures are cached for 12 hours per requested calendar month; existing scheduled football/report jobs and owner report visits reuse that cache, with no new scheduled function or polling interval. A routine collection has seven management/analytics reads; these do not create seven Touchline Function invocations. Reporting still has its normal Function/storage overhead. Reusing an existing team credential does not change the plan, payments, limits or auto-top-up settings. If credentials expire, saved metrics retain their timestamps and source errors are visible.

Weekly reports no longer contain configured-savings claims, arbitrary request budgets or unverified bandwidth/compute/allowance checklist items. Separate app metering stays explicitly incomplete; official Netlify usage is not derived from it. Report schema v2 replaces the old checklist and cleans archived checklists on read. No existing fixture/highlight/player data or schedules are removed.

### Compact interactive usage charts (19 October 2026)

Hosting reports now show Today and Month totals, slim blue daily bars, a distinct today highlight, and side-by-side Daily / Monthly controls. All days of the selected month have a selectable full-height bar slot; mouse, touch, arrow keys, Home and End update the selected value above the graph without another request. Missing and future buckets remain visibly unreported instead of fabricated zeroes. Monthly mode shows the year's month slots using available saved month totals; selecting a month changes the month total and the subsequent daily view. Current-month cached usage is included even when the football report is for a prior period, so Today always refers to the actual Zagreb date. No automatic polling or new schedule is added.

Removed the long hosting descriptions, exact-value tables and old observed-app breakdown from weekly/monthly report UI. Retained only a compact team-wide label, charges, update time and an error message when necessary. Daily football results remain available with shorter explanatory text. Existing owner-only API and UI access controls remain in force.

### Glass header and persistent footer navigation (19 October 2026)

Moved Home / Clubs / National teams / Settings from the top header to a persistent rounded glass footer on every authenticated screen, including individual matches. Nested clubs and competition pages keep Clubs selected; national-team pages keep National teams selected. The footer is outside the keyed main content and uses the existing navigation handlers and history flow. Bottom spacing includes device safe areas so content is not covered. Existing attribution links remain above the dock.

Home has a larger brand header and a compact All / Live / Upcoming segmented glass selector with date arrows, a date picker, quick return to Today and manual refresh. A shared transform-based highlight slides between both header and footer choices, with reduced-motion support. Existing league palettes, match cards, filters, date persistence, live clocks, authentication, reports visibility and polling rules are preserved. No new endpoint, schedule or network interval is introduced. Source-level navigation/filter checks, TypeScript and the build passed. Local visual-browser QA was unavailable because the browser download returned a corrupt archive; no visual-browser verification is claimed.

### Compact navigation and Home cards (19 October 2026)

Fixed legacy order rules and the narrow-screen two-row override by assigning all status/date/refresh controls explicit first-row grid slots. Reduced Home branding height, footer navigation height and safe-area content reservation. Date labels truncate inside their allocated slot while previous/next, calendar and refresh remain available on one row down to 320px. Reduced Home league headers, badge sizes, row padding and inter-team gaps by approximately 15%, without changing competition colors, data fetching or match navigation.

### Safe clock resume, compact Back and swipe history (20 October 2026)

Shared live clocks now suppress elapsed extrapolation when their latest confirmed source observation is older than 90 seconds. Home shows an ellipsis (with an accessible updating label), and the match view shows Updating… until the existing foreground response confirms its phase. Anchors remain unchanged, so fresh same-half data restores continuous local time without whole-minute resets. Known completed fixtures display their terminal status immediately. Confirmed HT remains frozen during its existing scheduled pause. No additional fetch interval or resume request is added.

Existing Back controls on matches, club/competition pages and the match error screen now share an arrow-only 44px touch target and accessible labels. Touch swipes right go Back, left go Forward only through known app history. Root Back cannot leave the app; new navigation trims the forward range. Browser-edge gestures, vertical scrolling, multitouch, form controls, horizontal rails, selected text and open media/dialogs are excluded. Recognized page swipes prevent a trailing accidental click, and listeners are cleaned up on unmount. The old touchline/Public highlights/YouTube attribution footer was removed; the four-item navigation dock remains.

## Full-width match header (20 October 2026)
- The match hero, back arrow, competition logo and five section tabs share one edge-to-edge header surface. Existing dark/light competition backgrounds and score/scorer behaviours are retained; panels below keep a readable centred width.
- Scheduled matches show 24-hour kickoff between team badges, with Today or an English abbreviated date (Wed Oct 21) beneath. Dates use the same device-local timezone as the calendar; scheduled source status strings with EDT are no longer displayed beneath VS. Unknown kickoff times remain TBC.
- No API, polling, storage or scheduling changes. TypeScript, production build and 104 regression checks pass.

## Approved competition skins (20 October 2026)
- Match and league/cup headers use 11 distinct competition motifs: blue/purple facets, orange angular ribbons, green flowing bands, purple facets, red stadium geometry, coral diagonals, cobalt crystals, HNL magenta shards, gold contours and national-tournament flag ribbons.
- Patterns are local static SVGs (about 13.6 KB combined compressed across all 11; only the active pattern is used). No API calls, additional polling, external artwork hotlinks, or serverless processing. Reproduce them from scripts/build-theme-art.py.
- Headers retain the back arrow and omit duplicate competition names; names remain accessible to screen readers. Logo-only headers and season label replace the league/cup overview banner. Club-picker cards and club pages retain their existing design.
- Dark panels use calm tinted surfaces; light mode uses pale competition surfaces with dark ink. Three reversed logo variants retain contrast on light backgrounds. Existing data, scorer animations, tab contents, standings highlights, auth, schedules and polling stay intact.
- TypeScript, production build, all 104 tests and SVG/reference validation pass. Browser/physical-device visual QA was unavailable in this runtime.

## Stable scorer animation layout (20 October 2026)
- Live and finished headers reserve an 80px scorer region immediately, even before event details arrive. Three single-line scorer rows fit per team; additional goals remain in independently scrollable keyboard-accessible lists. Long names truncate visually with full text retained in the title and DOM.
- Chronological goal order remains unchanged. The first reveal is 100ms (previously 200ms), then 300ms per subsequent goal with cumulative delays. Reduced-motion users see the rows without animation.
- TypeScript, production build and all 15 match-screen render checks pass, including an assertion that the scorer region exists before events arrive. No API or polling changes.

## Image artwork correction (20 October 2026)
- Supersedes the earlier procedural vector-pattern implementation. Match and league/cup headers now use real raster artwork generated from the approved mockups, retaining the richer lighting, facets, ribbons, Premier lion silhouette and gold contours.
- Two local WebP atlases contain the 11 dark/light competition backgrounds in an equal 3-column/4-row grid. CSS selects the appropriate tile without compositing logos or text into artwork. Both atlases preserve all image content; WebP export only changes encoding. Dark is 176,720 bytes, light is 208,868 bytes. Each theme uses its corresponding atlas; normal browser caching permits reuse across competitions.
- Removed the unused procedural SVG assets and their generator. Runtime artwork does not invoke an API or serverless function. Existing pale cards, responsive layout, fixed scorer region and chronological animation remain intact.

## Soft artwork and logo contrast (20 October 2026)
- Header artwork now lives in an isolated pseudo-element with 6px CSS blur and slight overscan to avoid blurred edges. Text, logos, scores and controls remain unblurred. No additional image assets or requests.
- Removed the reversal filter from boxed Premier League/LaLiga header marks; the previous white backing plus filter produced a solid white tile. Original coloured marks now retain a white backing, contained padding and rounded 14px corners. Other boxed domestic emblems receive the same rounding.
- Header scorer names/minutes stay white in both themes; a subtle dark backing maintains contrast in light mode. The fixed scorer dimensions and animation timing remain unchanged.

## Watch & Switch stream player (4 November 2026)

- Existing livestream entry cards and Croatian commentary external links stay in place. Play in app opens the same modal through loading and provider-error states, so source controls and the external fallback remain available.
- One iframe at most: previous/next arrows wrap, the selector directly chooses a source, and replacing/closing a stream removes the old player. Arrow keys work on the app toolbar (not inside the cross-origin provider frame). Disabled controls cover single-source and loading states. Provider sandbox, referrer policy and server-side embed restrictions are unchanged.
- Other games uses a desktop sidebar or a mobile sheet below the video. Only live supported fixtures are listed, including halftime. Current match is marked Watching. Selecting another game obtains only that game's cached/on-demand listings and verifies the selected first source; it does not preload every source or game. The modal title and competition accent follow the watched game while the underlying match page remains in place.
- The game list reuses Home's same-day snapshot if checked less than 60 seconds ago, otherwise GET /api/match-day runs once on explicit menu opening. Successful menu snapshots are cached separately, preserving Home's history/date cache. No new timers, background stream searches or live-score polling. Menu scores/minutes are snapshots with a visible checked time.
- Existing successful listing/player localStorage keys remain compatible. Failed/forbidden embeds are not cached as working, and unsupported player hosts never become iframe URLs. No automatic failover pretending a provider actually played: the user selects Next stream or Open externally.
- Game/source changes and closing cancel pending requests; generation checks discard late completions. Unmount cleans up requests/listeners. Fullscreen applies to the whole app-owned player window where supported, retaining the source/menu controls; provider-owned fullscreen remains provider-controlled.
- Verification: TypeScript, production build and all 113 tests pass. New coverage exercises cache reuse, no stream preloading, explicit-only list refresh, rejected players, cancelled responses, next-source playback, same-window game switching, stale response races, and close/unmount cleanup. Real third-party playback and browser/device visual QA were not available in this runtime.

## Competition-coded stream menu (4 November 2026)

Each Other games row now carries its own competition background tint, accent stripe and readable league-name badge instead of inheriting the currently watched game's accent. Premier League uses purple, HNL uses the new approved red identity, and the other supported competitions retain their model palettes. Watching state uses that row's own accent. Labels keep competitions distinguishable without relying solely on colour. This is static client-side styling with no additional API requests. Interaction checks verify that a Premier League row and a Serie A row have independent palettes and visible competition labels.


## Match Broadcast and finished highlights (4 November 2026)

Live matches label the final tab Broadcast and open stream listings directly, without a nested media toggle. Finished matches retain Highlights; upcoming/live matches no longer show the after-full-time placeholder or perform highlight discovery. A stream of another live game remains open if the underlying match finishes.

Finished-match videos use one horizontal, competition-themed row each, two-line titles and an external YouTube option. Published duration metadata is parsed during existing discovery and preserved in saved catalogue records. Playback can supplement missing durations through a local cache using the existing player timer; unavailable lengths are labelled honestly. No additional discovery requests, polling intervals or scheduling changes.

Validation: 119 tests pass, TypeScript and the production build pass. Coverage includes media states, duration parsing/cache/storage, restricted-video links and cross-game player continuity.


## Desktop widescreen match artwork (4 November 2026)

Seven user-supplied widescreen images are served as individual optimised WebP assets for desktop dark-mode match headers (1024px and wider): Champions League, Europa League, Conference League, Premier League, Serie A, Nations League and EURO. Each match loads its own image rather than a seven-image atlas. EURO retains its sharp foreground logo over the supplied logo-free background. Bottom-aligned cover framing, the existing subtle blur and foreground emblems preserve readability. Mobile, light theme, other competitions and all data/polling behaviour are unchanged. Previous assets are retained; removing the match-backgrounds-desktop.css import restores the previous desktop artwork.


## Browser-neutral external stream links (4 November 2026)

External stream and Croatian commentary links now retain their ordinary HTTPS URLs on Android, iOS and desktop. Removed Firefox intents/custom schemes and redundant iOS Open normally duplicates. Browser selection follows the user's browser/OS; embedded playback, sandbox and source fetching are unchanged.

## Tottenham crest contrast (4 November 2026)

Tottenham's existing ESPN crest retains its navy artwork with a thin white CSS contour around its transparent shape across app screens. No boxed backing, data changes or extra asset requests. Online comparison included the club's brand page and ESPN's dark-background variant (fully white, rather than the requested outlined navy mark).

## Compact themed broadcast window (4 November 2026)

- One arrow-only source selector with Stream N / total replaces the dropdown. Selector and Other games occupy equal halves of a compact 44px control row.
- Header shows the watched competition's logo. Window, controls and sidebar use its palette; Champions League, Europa League and Conference League use their existing artwork and blue/orange/green identities. Individual fixture cards keep their own competition colours. Highlight-card palettes are unchanged.
- Explicit Other games selection checks sources sequentially and stops at the first supported verified embed. Provider errors/restrictions are skipped; cancellation and generation checks reject late results. If all checks fail, keep the external fallback and manual arrows. No background scans, retries or timers are added; successful player checks use existing caches. Embed policy verification is not proof of playable media.
- Fullscreen requests the video viewport only, excluding Touchline header, controls and sidebar. Provider controls can remain. Existing iframe sandbox/referrer rules are unchanged.
- Audio remains controlled by the cross-origin provider/browser: no documented provider unmute API is integrated, no fabricated mute query parameters or click simulation. Users may still need to unmute inside the provider.
- Validation: 120 tests pass, TypeScript and production build pass. New tests cover rejected/failed-source skipping, stop-on-success, cancellation, arrow-only controls, competition identity and fullscreen targeting. Visual preview infrastructure is unavailable; actual third-party browser playback remains unverified.
