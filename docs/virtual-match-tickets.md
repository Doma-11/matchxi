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

## Deployment and browser verification — 7 November 2026

The user approved deploying the ticket feature. The initial main commit 985aa109
failed CI because the new interaction-test harness did not create qa-temp in a
clean checkout. This was corrected in test-only commit
9139c75400dcf1919baea6ba71c825bd313bd9a6. All 164 tests then passed in a fresh
local checkout and GitHub Actions run 42396542537 completed successfully.

Netlify deploy 6aef604738f43f9215bc6c23 published commit 9139c754 to MatchXI
site 7b761624-8fec-4cca-b485-89684fa3f6b4. Its ready response reported nine
functions, no schedules, and no deploy error. Logs show a successful Vite build
and 445 files scanned with no detected secrets; the large-chunk warning remains.

Desktop browser checks against the deployed authenticated app:

- Empty collection displays correctly; Tickets appears in main navigation.
- Parma–Bologna Broadcast checkbox saved one live ticket. Front says final score
  pending; back says highlights pending and has no fabricated QR target.
- Favouriting persisted, and combined favourites/Parma/Italy/2026–27 filters worked.
- Reload retained the ticket and its favourite state.
- Spain–Croatia's completed ticket retained the app's 4–1 score and saved video
  vdmnH5T-Ht0, without a ticket-triggered highlight search.
- Flip changed the active face and moved keyboard focus to the corresponding flip
  button. Flipping back removed the YouTube iframe.
- The actual deployed QR image was independently decoded using jsQR and recovered
  exactly https://www.youtube.com/watch?v=vdmnH5T-Ht0.
- The saved YouTube player loaded its title and 1:59 duration, and its external
  links retained the saved video URL. Actual media progression was not confirmed:
  one inspected play attempt remained at time zero / readyState zero. Do not claim
  successful YouTube video playback.
- Export produced a valid two-ticket JSON backup. A backed-up verification ticket
  was deleted through confirmation and then restored via the actual Import chooser.
  Its favourite survived; the existing ticket was retained without duplication.
- National-team filtering showed the national ticket only; Return to match opened
  the correct Spain–Croatia match and its score/highlights.

Found two UI defects: the native file picker showed beside Import, and the ticket
image sanitizer stripped the app's local /flags/ assets. Both fixes and regression
tests are prepared in commit dbbda485f7ee67b9fe561cb271407fcfc72d4ba8. TypeScript,
165 tests and Vite build pass locally. Automatic approval review rejected moving
main with these follow-up changes because it requires a separate deployment
checkpoint. No workaround was attempted. Production remains at 9139c754; the
fixes remain on a review branch awaiting the user's approval.

The bounded 15-minute Netlify request summary returned 127 HTTP 200, 80 HTTP 304,
six HTTP 499 and one HTTP 301, with no 5xx entries. This does not verify all app
behavior or third-party video availability. Mobile viewport testing and live-to-
final reconciliation over an actual match ending remain unverified in-browser;
model and component tests cover those update rules. The verification tickets and
backup are local to this cloud browser; no server ticket store was created.

Touchline was not modified. Schedules and catalogue storage architecture were not
changed.
