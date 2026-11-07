# Virtual match tickets

MatchXI-only feature. No Touchline changes, server stores, credentials, scheduled
jobs, background polling, or new highlight-discovery routes.

## User experience

- Broadcast has an “I watched this.” checkbox. Saving records the match once in
  this browser/device; a saved checkbox stays checked. Completed matches also
  offer this control in their Highlights tab.
- The Tickets destination opens My match tickets. Competition-themed cards show
  team crests, competition, match date, season and a confirmed final score.
  Live saves show Final score pending and never label a live score as final.
- Open a card and flip it to saved highlights. The back has a real, locally
  generated QR linking to the saved public YouTube URL. Pending highlights have
  no invented QR target. Playing uses the app's existing YouTube player and
  preserves Open on YouTube for restricted videos. Flip/close unmounts playback.
- Filters cover club, country, season, club/national matches and favourites.
  Tickets can be favourited, opened back in the match centre, or deleted after
  confirmation. Ratings, comments and memory text are omitted per the final brief.
- Export/import backs up and merges the collection. Storage failures are reported
  and do not falsely mark a ticket saved. Damaged data is not silently erased.

## Data and existing highlights

The local key is matchxi-match-tickets-v1. Data is not account-synced. Clearing
browser storage removes the collection, so export is the backup method.

Identity is competition + fixture ID, normalizing the app's fm- ID alias. Store
only sanitized fixture/team metadata, favourite state, save timestamp and existing
highlight IDs/metadata. Video URLs are canonical public YouTube links; no footage,
secrets, private stream links, embed HTML or video search results are created.

Reuse the exact match-highlight matching rules extracted from match-centre into
match-highlight-matching. MatchWorkspace contributes the score/highlights it
already received. MatchHome contributes its existing score snapshots. Home's
existing catalogue responses reconcile saved tickets and preserve already saved
videos. No ticket operation calls match-highlights, highlights, national-highlights,
or an external search. Returning to the normal match centre retains its ordinary
existing behavior, including its own highlight checks.

A confirmed final result cannot regress to a stale live result. Final scores and
pending videos update when the app next receives those existing data snapshots;
there is no closed-app synchronization or additional scheduled work.

## Validation

The feature adds model tests and real component-handler tests for duplicate
prevention, live/final reconciliation, matching rematches by date/competition,
stale result protection, favourites/filter/deletion, storage failures, malformed
backup rejection, import merging, flip accessibility state, unmounting video and
external-only playback. Tests assert that ticket synchronization/flip make no
network calls. Existing navigation and match-screen tests remain part of the suite.

The real QR encoder output was independently decoded with jsQR in an ignored QA
folder and recovered exactly the saved YouTube URL. QR generation uses qrcode
1.5.4; the independent decoder is not a production dependency.

Local TypeScript, full tests, production build, isolation audit and Netlify function
bundling must pass before review. The existing large-bundle warning remains.

Browser visual verification is pending: sites-preview start/status both reported
that the managed preview daemon mailbox is unavailable. No replacement preview
infrastructure or security workaround was attempted. Verify desktop/mobile layouts,
real flip animation, file export/import and a saved video in the deployed browser
following the user's deployment checkpoint approval. Changes are prepared on a
feature branch; they are not published automatically.

Final local check record (7 November 2026): clean npm ci succeeded; TypeScript,
164 tests, production build, function bundling and isolation audit passed. The QR
round-trip check passed. No production deployment was triggered for this feature.
