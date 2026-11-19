# Goal Replays — Phase 1

Branch: `feature/goal-replays-poc`
Base: `e027828` (`main` when work started).

## Scope

This is an opt-in playback proof of concept, not Reddit discovery. It adds no API routes, credentials, schedules, score calls, caches, video processing, or video storage. Existing score refresh and stream discovery code is unchanged.

The supplied Florian Wirtz clip is explicitly labelled **test replay: Germany vs Netherlands**. It is never represented as a goal from the current fixture. The chronological goal row shows minute, scorer, scoring team and score. No fictional goals from the design are included.

The host page at `https://streamin.me/v/cfb904d3` was reachable during research, but a supported Streamin embed endpoint was not established. Do not invent an embed URL, extract a media URL, iframe the watch page, proxy footage, or bypass restrictions. Phase 1 therefore tries Reddit's official post embed and offers the supplied host video as a new-tab external link. A post rendering does not establish that its externally linked video plays inside the embed.

Official references consulted:

- https://support.reddithelp.com/hc/en-us/articles/360043033532-How-do-I-embed-a-Reddit-post-or-comment-in-an-article-or-other-publication
- https://publish.reddit.com/assets/Reddit_Embed_Documentation.pdf
- https://streamin.me/faq

The official blockquote/widgets.js markup runs inside an isolated sandboxed srcDoc iframe only after **Replay** is selected. The app does not hide Reddit's attribution or controls. A source-checked message reports embed-frame loading, never successful video playback. Error and delayed-load states retain external links. The app cannot inspect a third-party player to reliably detect playback success.

## Try it

1. Open **Settings → Appearance → Goal Replays preview**.
2. Turn on **Enable Goal Replays**. This device-local preference defaults off.
3. Select **Test without a live match** to open the local clock simulator.
4. Select **Load test replay**, then **Replay**.
5. The Reddit post embed takes the main area. The clock iframe becomes a small corner player and should keep counting. Close the replay with **×**, or press Escape from app controls, to return the simulator to the main area.
6. The same test replay strip is available beneath a real single-match stream when the preference is on.

Loading/refreshing the test list only reads the fixed local metadata; it makes no network requests. Opening Replay loads Reddit's own embed and its resources directly in the browser. The host video is contacted only by following its external link. Phase 2 will need approved Reddit access and brief metadata caching before search/refresh can be enabled. No placeholder Find button pretends to perform a search.

## Player isolation and theme

The existing live iframe remains in the same DOM position with its existing URL, key, sandbox and permission attributes. A CSS class shrinks that frame; a sibling replay overlay fills the main viewing area. Closing the replay removes its entire iframe subtree, stops its playback and restores the original dimensions. Escape closes the replay before the live dialog. Changing the watched fixture, stream source, closing the live dialog, entering multiview, or disabling the feature clears replay selection.

The replay chrome inherits the watched fixture's `--accent`, `--stream-brand`, and `--stream-surface`. Champions League, Europa League and Conference League reuse the same background assets as their live-player chrome. Reddit's embedded content retains its own required appearance.

Multiview replay controls are deliberately absent in Phase 1. The app does not attempt to mute or pause a cross-origin live player. Two simultaneous videos can use additional bandwidth and decoding resources, play overlapping audio, or trigger a phone browser's media policy. Continuous live playback must be verified with the actual providers and devices.

## Validation

Completed locally:

- `npx tsc --noEmit`
- `node --test tests/*.test.mjs` — 208 passed
- `npm run build` — passed; existing large-chunk warning remains

The regression tests exercise feature defaults/disable, safe post validation, escaping, iframe URL/key/sandbox continuity, replay Escape handling, no extra stream requests and existing multiview behaviour. They do not prove DOM identity or real video playback.

An additional local-only browser check is included:

```sh
node scripts/check-goal-replays-browser.mjs
```

It requires Playwright and Chromium (`CHROMIUM_PATH` may override `/usr/bin/chromium`). It bundles the real single-stream component, mocks all external provider traffic, and checks iframe DOM identity/load count, CSS sizing/restoration, feature disable, Escape, competition palette and the Settings lab at desktop, phone, narrow-phone and landscape sizes. Mocked Reddit playback must never be described as a successful real-host test.

**Not executed successfully in this workspace:** Chromium launch was blocked by the execution environment (`socket() failed: Operation not permitted`). The browser script bundled successfully but its browser assertions and screenshots remain unverified.

Still required before Phase 2:

- Test the actual supplied Reddit embed and determine whether the linked video plays inline.
- If Reddit only renders a link card, establish a provider-supported embed or keep external playback as the available result.
- Verify live playback continuity, sound behaviour and viewport changes on desktop and physical Android/iOS devices.
- Try loading failure, blocked third-party content, fullscreen, closing replay, source/game switching and disabling the feature during playback.
- Check that the replay is removed on close and only the live player remains active.

## Disable and revert

- Immediate device-level rollback: turn **Enable Goal Replays** off. The replay and test-list UI disappear without changing the live stream or any saved match data. A cross-tab storage update also disables the UI.
- Code rollback before merge: keep using `main`; this feature is isolated on its branch.
- Code rollback after merge: revert the feature commit/merge through a normal PR. No database migration, video objects, secrets or scheduled jobs need cleanup.

Nothing has been merged or deployed by this work.
