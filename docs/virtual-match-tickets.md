# Virtual match tickets

MatchXI-only feature. No Touchline changes, server stores, credentials, scheduled
jobs, background polling, or new highlight-discovery routes.

## User experience

- Broadcast has an “I watched this.” checkbox. Saving records the match once on
  this browser/device. Completed matches also offer it in their Highlights tab.
- Tickets flip directly in the collection; there is no expanded view or modal.
  Each card uses a fixed responsive stage matching its initial compact dimensions.
  Both faces occupy that same stage, with perspective, preserve-3d and rotateY.
  Reduced-motion users receive an immediate face change.
- The front retains teams, crests, competition, date and final/pending score. The
  former Watch Diary/serial stub now contains a transparent-background QR for the
  saved highlight URL. Pending highlights show QR pending rather than a fake code.
- The front surface is a full-card flip button. Footer Return to Match and Delete
  ticket, plus the favourite button, remain independent actions. Delete confirms
  inside the card without changing its size. Keyboard focus follows the face.
- The back retains the saved thumbnail with a play visual, a YouTube link, matchday
  number and flip-back button. Both video links open the exact saved YouTube URL.
  Tickets never mount an internal player or iframe. Multiple saved videos can be
  selected; the front QR follows the selected saved video.
- Matchday comes only from supplied matchday/week/round metadata. Unknown values
  are labelled unavailable. Match IDs, dates and season numbers are not substitutes.
- Filters, favourites, device persistence and export/import remain available.
  Ratings, comments and memory text remain omitted.

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

## Inline design revision — 8 November 2026

The 3D inline design supersedes the modal design described in the historical
7 November browser record above. Existing version-1 device tickets and backups
remain compatible. The saved fixture snapshot gains an optional matchday number;
normal existing fixture updates can fill it, and later metadata omissions do not
remove an already known matchday. No new endpoint or search is used.

Validation: TypeScript, all 168 Node tests, Vite build, Netlify function bundling,
and MatchXI isolation audit passed locally. An independent jsQR check decoded the
production QR options at 64, 80, 100 and 200 pixels after compositing the transparent
PNG over a dark ticket background. The PNG actually contains transparent pixels.
Interaction tests cover no expansion/dialog, same-stage flips, independent footer
actions and deletion, inactive-face keyboard exclusion, YouTube-only links, no
internal player, pending highlights, and matchday preservation through backups.

Browser geometry/animation and rendered QR verification are pending: the managed
preview service remains unavailable. Review and obtain the user's deployment
checkpoint approval before publishing this revision to MatchXI. Touchline,
schedules, credentials and server catalogue architecture remain unchanged.


## 8 November 2026 — Collection and Settings revision (prepared)

The collection now contains its title/subtitle, All / Club / National Teams / Favourites categories, and fixed-size inline tickets. Export/import moved to Settings → Match tickets. The extra dropdowns, eyebrow and summary footer were removed.

Settings offers exactly two global, device-local styles: MatchXI original (default) and Matchday pass. The latter uses a light digital-pass body, competition-colour header and dark transparent-QR panel. Both styles retain the same geometry, 3D flip, favourites, return/delete controls and external-only saved highlights. Preferences use `matchxi-ticket-design-v1`; changing a style never edits ticket records or backups. Backups retain their existing v1 format and merge semantics.

### Official reference research

Reviewed 8 November 2026. A league does not issue a universal design for every club. The alternative is an independently drawn keepsake inspired by digital passes, not an official replica or admission credential. No reference image is shipped. Do not invent 2026/27 artwork for previous international tournaments.

| Coverage | Official reference | Evidence and limit |
| --- | --- | --- |
| Premier League | [Arsenal Ticket Hub](https://help.arsenal.com/support/solutions/articles/101000595295-ticket-hub) | Explicit 2026/27 digital pass; current guide linked. Club-specific, not league-wide artwork. |
| Bundesliga | [FC Bayern app tickets](https://fcbayern.com/en/news/ticketing/2026/load-your-tickets-in-the-fcb-app-now) | Explicit 2026/27 article and Wallet-Visual reference inspected: light body, red header, bold fixture and structured details. Used as visual inspiration, without fabricated seat fields. |
| LaLiga | [Real Madrid–Celta ticket page](https://www.realmadrid.com/es-ES/futbol/partidos/entradas/real-madrid-celta-de-vigo-21-11-2026) | Current fixture/mobile delivery; exact ticket artwork not independently verified. |
| Serie A | [Inter 2026/27 season tickets](https://www.inter.it/it/biglietti/abbonamenti) | Current season and digital seat pass context; exact issued ticket artwork not independently verified. |
| HNL | [Hajduk–Gorica tickets](https://hajduk.hr/vijest/u-prodaji-ulaznice-za-utakmicu-hajduk--gorica/18633) | Current club sale/reference; exact ticket artwork not independently verified. |
| Champions League / Europa League / Conference League / Nations League | [UEFA mobile ticket guide](https://support.tickets-mobiletickets.uefa.com/hc/en-us/articles/6106335375388-How-do-mobile-tickets-work) | Common mobile-ticket delivery, not evidence of one exact 2026/27 design for all competitions. Downloaded illustration was a registration screen, not a ticket face, and was not used as ticket artwork. |
| World Cup | [FIFA World Cup 2026 mobile ticket](https://gpcustomersupportfwc2026.tickets.fifa.com/hc/en-gb/articles/30203220468765-3-What-is-a-FIFA-World-Cup-2026-mobile-ticket) | Edition-specific mobile ticket reference. No 2026/27 World Cup edition invented. |
| EURO | [UEFA EURO 2024 summary](https://editorial.uefa.com/resources/0290-1ba7a17c0ca4-877b61cc8359-1000/uefa_euro_2024_tournament-summary_v17.pdf) | Historical edition; no claim to a current-season EURO ticket face. |
| Qualifiers / national friendlies | [HNS ticket app](https://hns.family/vijesti/29136/aplikacija-hns-ulaznice-dostupna-za-preuzimanje/) | Official mobile-ticket system; exact current fixture artwork not independently verified. |

All supported competition IDs use their existing app identity/palette, including fallback identity for unknown competitions. There are exactly two user-selectable designs, not one invented official template per league.

### Deployment status

Approved inline redesign published: commit `523174989327af16b60a9467f529b5f3e11205b0`, Netlify deploy `6af02ac521644617ea129606`, site `7b761624-8fec-4cca-b485-89684fa3f6b4`. Scoped deploy API returned `ready`, matching commit and empty function schedules. GitHub validation run `42460447020` succeeded. The collection/Settings follow-up described above remains on its review branch pending separate deployment approval.

Local validation: 172 Node tests passed, TypeScript and isolation checks passed. Production Vite build and Netlify function bundling passed (9 functions). Existing large-chunk warning remains. Managed local preview is unavailable in this workspace; this follow-up has not been visually verified in a browser. This limitation must remain explicit until browser QA is possible.

## Competition artwork and entry flip — 8 November 2026

The `b235988` source and its published Netlify deploy had manual flipping and
both Settings designs, but did not contain the approved entry hint or artwork
and still forced national flags. This change adds:

- Home → Tickets hints only the first saved ticket, front → back → front once.
  The 550 ms transitions use the existing fixed-height stage; the hint waits
  550 ms before starting, pauses on the back, and finishes at about 2.1 seconds.
  It does not move focus or replay on filters, favourites or catalogue updates.
  Pointer, keyboard or focus interaction cancels it. Unmount/hidden-tab cleanup
  prevents delayed changes, and reduced-motion users receive no automatic flip.
- Original tickets retain their existing competition palettes and gold edges.
  Locally served competition artwork follows the match backgrounds, including
  a checker ribbon for HNL and separate international framing. Matchday pass
  faces retain their light design and shared stage size.
- Competition logos use navy badges for reversed marks and white badges for
  full-colour marks containing dark text. Premier League and HNL marks are
  reversed explicitly so they remain legible.
- Ticket-only federation badges for all 86 countries in the saved national-team
  catalogue. Existing version-1 tickets and imported backups acquire these
  through validation, without losing scores, favourites or highlights. Other
  app screens keep their existing flags. Asset source URLs are recorded in
  `public/logos/national/SOURCES.md`.

Validation: TypeScript, Node regression tests, Vite build and Netlify Functions
bundling. The managed preview daemon was unavailable in this workspace, so
interactive browser rendering and mobile visual QA were not completed locally.

## Aged-paper Matchday pass — 8 November 2026

The Matchday pass option now follows the supplied vintage keepsake reference:
cream distressed paper, a restrained engraved stadium at the left, serif fixture
names/scores, a full-time ribbon, venue line, perforated stub and actions beneath
the paper. The Settings thumbnail previews the same material treatment.

Champions League, Europa League and Conference League explicitly use a separate
competition-art branch. Their paper texture is framed from the illustration-free
right portion and their left edge uses ball/trophy artwork, with no stadium.
Other competitions retain the generic stadium engraving; international passes
also have geometric edge printing and a light QR stub with dark QR modules.

The lower strip uses actual watched/season/matchday metadata. References derive
from the stored competition and fixture ID; gate, row and seat numbers are never
fabricated. Missing venues retain a keepsake label and missing highlights retain
the pending state. The same responsive stage contains both faces; action buttons
remain outside that stage. The MatchXI original design retains its existing
layout, artwork and palette.

Asset: `public/themes/matchday-keepsake-paper-v1.webp`, generated from the supplied
style reference with the built-in image tool and optimized for web delivery.
Prompt: wide warm ivory distressed cotton-paper texture, fine navy copperplate
engraving of a generic stadium confined to the lower-left quarter, subtle edge
guilloche, clear center/right, no text, marks, logos, QR, border or ticket mockup.
No actual stadium identity is claimed by the decorative engraving.

## Home stadium outlines and horizontal overflow — 8 November 2026

Club Matchday passes now use real architectural edge linework from stadium
photographs. Real Madrid's Bernabéu and Liverpool's Anfield ship as transparent
WebP assets (40,166 and 25,194 bytes). Both use the same production Sobel-edge
renderer as the on-demand service; their source photographs, authors, licences
and adaptation notices are linked from `public/stadiums/credits.html`.

Other registered home clubs request `/api/stadium-art` only through a lazy image
on a relevant ticket. The supplied venue resolves through the Wikipedia summary
and Wikimedia Commons image-info APIs. The stadium must be described as a home
ground of that club and the source must have supported reuse rights. A neutral
venue or an away appearance does not qualify. National tickets and the three
UEFA club-cup passes do not invoke this club-ground service.

Successful art is resized to at most 512 × 340, converted to transparent navy
edges, compressed to WebP and saved under `outline-v1/<canonical-home-club>` in
the independent `matchxi-stadium-art` store. Future fixtures reuse that club's
saved artwork regardless of venue spelling. Source photos are not retained.
There is no bulk fetch, schedule, periodic refresh, per-match duplicate image or
new credential. Successful objects persist across deployments until the artwork
version is intentionally changed. In-flight requests coalesce per function
instance; concurrent cold instances can both perform first-time source work,
with a conditional image write protecting the already saved image.

Unavailable sources have a retry timestamp (one day for an unverified source,
one hour for a transient error). A failed image leaves plain paper, without
misrepresenting the previous generic stadium as the home club's ground. The
image and credit endpoint use the existing owner/service authorization boundary;
credits link to the original photograph and licence. Unit tests use an in-memory
store and never seed, clear or replace production objects.

The responsive fix removes the content-box/padding/aspect-ratio combination from
the grid item. The face stage has its own aspect ratio, and actions occupy an
actual separate grid row. Track minimums, score text, metadata, masthead and
Settings previews now shrink/wrap inside the available width. Horizontal clipping
is scoped to the ticket collection to contain 3D projection; the page is not
made globally unscrollable to conceal layout issues. Both faces share the same
stage, and manual/entry flips retain their existing behavior.
