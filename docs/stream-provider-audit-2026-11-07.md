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
