# Goal Replays — Phase 1

## Current behaviour

Goal Replays is opt-in under **Settings → Appearance → Goal Replays preview**. It defaults off. Live matches now use on-demand `/api/match-replays` discovery when approved Reddit OAuth access is configured; see [live replay setup](live-goal-replays.md). No score calls, background discovery, scheduled jobs, video processing or video storage are added.

The initial Reddit post embed was removed after the owner’s phone test showed a post card without the goal video. Reddit is a source link, not the playback provider. No Reddit scripts or post iframes are loaded by this feature.

In the Settings lab only, the supplied Florian Wirtz goal remains explicitly labelled **test clip: Germany vs Netherlands** and is not represented as a goal from the watched fixture. Its Streamin URL currently has no verified supported player endpoint, so the row offers **Open video** and states that in-app playback is unavailable for that host. Selecting an unsupported link does not shrink, replace, reload or unmount the live iframe.

## Supported video-only player

The adapter accepts HTTPS Streamable watch/player links and builds the documented `https://streamable.com/e/{id}` player URL. Credentials, alternate ports, other domains and unsupported paths are rejected. Extra query parameters are discarded; autoplay and loop are off. Provider controls/branding remain intact. No raw media URL is extracted or played, and footage is delivered directly by Streamable.

References:

- https://streamable-support.zendesk.com/hc/en-us/articles/35415601982740-Embedding-Basics
- https://streamable-support.zendesk.com/hc/en-us/articles/35415648975892-Editing-the-Embed-Code
- https://streamable-support.zendesk.com/hc/en-us/articles/35415672400916-API-Documentation

A supported player fills the main viewing area while CSS resizes the existing live iframe into the corner. Closing with × removes the replay iframe and restores the same live iframe dimensions. Escape from app controls closes replay before the live dialog. The chrome inherits the watched competition’s existing palette and assets.

An iframe load event means **Player loaded. Press Play in the video.** It does not confirm playback. Provider errors can occur inside a cross-origin iframe; **Video unavailable?** removes that iframe and shows the external fallback. Slow-load and network-error states also retain the external link. No postMessage assertions or fake Playing labels are used.

## Test without a live fixture

1. Enable Goal Replays in Settings → Appearance.
2. Open **Test without a live match**.
3. Paste a Streamable video link into **Streamable video link** and select **Test video player**.
4. The video-only player should appear in the main area; the clock simulator stays in the corner.
5. Press Play in the provider player, then ×. The simulator should keep counting and return to the main area.

This is a manual compatibility test. Its title says **Manual video test / PLAYER TEST**; it never assigns arbitrary footage to Wirtz or another scorer. The URL is held only in component memory, cleared on close/disable, and is not persisted or sent through Netlify. No requests occur while entering or rejecting a URL. Only explicitly opening a supported player contacts the provider.

**Load test replay** shows the original Wirtz entry, which currently opens externally. No supported mirror of that exact goal was verified during this correction. The alternative official German Football YouTube highlight was also tested on a third-party page and reported that the rights holder blocked external embedding. Do not substitute this highlight as a confirmed playable mirror.

## Validation

Completed locally for the correction:

- `npx tsc --noEmit`
- `node --test tests/*.test.mjs` — 210 passed
- `npm run build` — passed; existing large-chunk warning remains

Tests cover the off-by-default preference, strict provider URL normalization, rejection of Reddit/Streamin/arbitrary media as player sources, provider-only markup, external-only fallback, honest manual test metadata, unsupported sources preserving the live view, and source URL/key/sandbox continuity on supported replay open/close.

The optional `node scripts/check-goal-replays-browser.mjs` harness uses mocked providers and checks desktop, phone, narrow-phone and landscape layouts, persistent iframe identity, resize/restore, manual-input validation, Escape and fallback. It requires Playwright and Chromium (`CHROMIUM_PATH` may override `/usr/bin/chromium`). Chromium cannot launch in this workspace (`socket() failed: Operation not permitted`), so those browser assertions remain unverified. The runner is not evidence of actual goal or provider playback.

Still required: verify a currently available Streamable goal mirror, test actual embedded playback from MatchXI, and check physical Android/iOS media/audio behaviour. Two active videos can consume extra bandwidth/decoding resources or trigger browser media policies. The app cannot control the audio of an unrelated cross-origin live player.

## Disable and revert

Turn **Enable Goal Replays** off for immediate removal of the feature UI. The same-window event and cross-tab storage update clear active replay state. Production code can be removed by reverting the feature/correction commits in a normal PR. No database migration, video objects, credentials or scheduled jobs need cleanup.

Live on-demand discovery is implemented behind an approved Reddit OAuth connection. Actual source availability and physical-phone playback still require testing.

## Ten-goal Nations League test set

The Settings lab also contains 10 historical goals from 15–16 November 2026. See [the per-goal checks and provenance](nations-league-replay-test-catalogue.md). All ten currently resolve to Streamin and use the external-only fallback. The list is bundled metadata, not an automatic Reddit search, and it is not supplied to unrelated live fixtures.


## One-click internal playback candidates

The Settings test screen now offers **Try Griezmann goal internally** (Napoli–Barcelona, 25 February 2020, 57′, Streamable `jup64`) and **Try provider sample internally** (Streamable documentation reference `5rneah`, not a football goal). The historical goal URL is present in the publicly indexed r/soccer post https://www.reddit.com/r/soccer/comments/f9hd7r/. The sample is from https://streamable-support.zendesk.com/hc/en-us/articles/35415648975892-Editing-the-Embed-Code. Neither link is claimed to be available or playback verified: research-tool opens of the goal watch/player URL failed.

Both buttons use the existing supported Streamable iframe adapter only after a click. The sample distinguishes a provider/player issue from an unavailable historical mirror. No raw media extraction, discovery, polling, preloading or host requests on opening the list. Closing replay removes its iframe and restores the same simulator iframe to focus. Open video and Video unavailable? remain available. The ten Nations League clips remain external-only and untouched.
