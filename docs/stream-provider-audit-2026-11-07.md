# MatchXI stream provider audit — 7 November 2026

## Scope and evidence

Read-only HTML/header checks of the current soccerstreams.click listing homepage,
all 41 unique listing URLs across its 92 rows, and all 34 distinct published player
URLs. No video downloads, footage proxying, provider authentication bypass, or
Touchline requests were performed. This covers the providers published at audit
time; it cannot cover future domain changes or guarantee stream availability.

| Published provider | Listing URLs | Distinct player URLs | HTTP page check |
| --- | ---: | ---: | --- |
| sportsoonline.click | 31 | 25 | 25 returned 200, no top-level XFO/CSP frame restrictions |
| embedcenter.st | 5 | 5 | 5 returned 200, no top-level XFO/CSP frame restrictions |
| thedaddy.li | 2 | 2 | 2 returned 200, no top-level XFO/CSP frame restrictions |
| vcdn-4728.website | 3 | 2 | Both returned 403; playback remains unverified/unavailable |

All 41 listing pages returned 200 and contained a player iframe. The player pages
are wrappers; successful HTTP responses do not prove playable media or unrestricted
nested frames.

## Deployed baseline

Commit 57cc2c453c06b3d51b49705987423f6d8108f439 was explicitly approved and
published to MatchXI only, deploy 6aef54beb22a310c936ff3b9. Netlify reported ready,
nine functions, no function schedules, no deploy error. Its logs show a successful
Vite build and secret scan. A large-chunk build warning remains.

The approved baseline recognizes sportsoonline.click and embedcenter.st and expires
player checks after 15 minutes. The live Broadcast list now detects their player
pages. Actual browser tests of Arsenal–Hull Stream 1 and Stream 2 still fail:

- sportsoonline.click's nested player shows “Sandbox not allowed”.
- embedcenter.st's nested player shows “Stream blocked on this site” and explicitly
  says the iframe sandbox attribute prevents playback.

No successful video playback was observed. Header-only checks cannot detect these
runtime restrictions.

## Prepared follow-up — requires approval before production

- Recognize the remaining two exact published hosts and restricted player paths.
  Only the two observed channel IDs are accepted for vcdn-4728.website. Its 403
  responses still fail verification and never become an allowed player result.
- Use the same provider compatibility helper in the single player and multiview.
  Omit the iframe sandbox only for reviewed sportsoonline.click/channels/ and
  embedcenter.st/embed/ URLs. Other providers retain the existing sandbox.
- Label successful page checks “Player found”, with an explanation that video
  playback remains unverified.
- Keep HTTPS, host/path validation, no credentials/custom ports, same-host provider
  redirects, HTTP error checks, X-Frame-Options and CSP checks, private API access,
  referrer policy, and external recovery links.

Security consequence: unsandboxed third-party frames have normal browser popup
and navigation capabilities, subject to browser restrictions. The same-origin
policy still separates their origins from MatchXI, but this is a meaningful
reduction in iframe containment. Production application and testing require the
user's explicit approval. Prepared changes do not enable schedules or change
storage architecture.

## Validation and remaining work

Prepared changes passed 151 Node tests, TypeScript, the MatchXI isolation audit,
the Vite production build, and Netlify function bundling. Tests cover all four provider patterns, malicious lookalikes, rejected
HTTP/frame policies, and consistent sandbox exceptions in single/multiview.

After approval: publish the exact reviewed commit, inspect CI and Netlify logs,
then verify actual player video progression and sound controls where available.
Recheck each provider family in-browser; do not equate an iframe appearing with
working playback. The vcdn 403s and changing upstream availability may remain
external-only. Never bypass their access restrictions.

Known adjacent issue: successful match-listing snapshots are cached indefinitely
in browser/Blob/API layers. Player checks now expire, but listing refresh behavior
needs separate follow-up if providers change during a fixture. This patch does
not silently change that policy.

## Approved deployment and runtime verification

The user approved deployment of the scoped sandbox compatibility change. Commit
967da5f56f7c61d05c391639b6e0ee47e48f3701 was fast-forwarded to MatchXI main.
GitHub Actions run 42393298417 completed successfully, including npm ci, isolation,
TypeScript, Node tests, Vite build, and function bundling.

Netlify deploy 6aef5710acee6ec340bc6be0 published that exact commit to site
7b761624-8fec-4cca-b485-89684fa3f6b4. Its ready response lists nine functions,
no schedules, and no deploy error. Build logs confirm Vite success, skipped Next.js
plugin, and 438 files scanned with no detected secrets. The existing large-chunk
warning remains.

Runtime results:

- Root HTML and both referenced initial JS/CSS assets returned 200.
- Unauthenticated catalogue access returned the expected 401.
- Authenticated metadata checks recognized sportsoonline.click, embedcenter.st,
  and thedaddy.li. VCDN remained rejected as unverified/unavailable.
- In the actual MatchXI Broadcast modal, Arsenal–Hull Stream 2 (Embedcenter)
  displayed match footage. Its video was unpaused with readyState 4, no media
  error, and currentTime advanced from 8.486 to 24.211, 40.072, and 48.259 seconds.
- Clicking the provider's UNMUTE ME button left the inspected video muted. Sound
  remains unverified; do not claim the audio control passed.
- Sportsoonline HD1 and Eleven1 still displayed “Sandbox not allowed”. Inspection
  showed sandbox attributes absent from both MatchXI's provider frame and the
  provider's nested frame. Its runtime restriction remains unresolved; do not
  claim all providers work or attempt to bypass it.
- Multiview correctly stopped the finished Arsenal fixture. An Espanyol selection
  loaded its HD6 provider frame but that provider showed the same sandbox error.
  Multiview video playback was not confirmed.
- Netlify's six-minute post-deploy request summary returned 53 HTTP 200, 23 HTTP
  304, one redirect, and one expected 401; no 5xx entries were returned. This is
  a bounded request summary, not proof that all runtime behavior is error-free.

Touchline was not modified. No schedule activation or storage architecture change
was performed. Thedaddy video playback and all devices/regions remain unverified.
