# MatchXI

A private football companion for live scores, match details, lineups, player ratings, standings and official highlights. Built for personal use, with a responsive interface, competition-inspired themes and support for installing the app on a phone’s home screen.

**Website:** Not deployed yet. Netlify deployment requires separate approval.

## Features

- **Match centre:** live, finished and scheduled fixtures, date navigation and a quick return to today.
- **Live updates:** scores, scorers, events and match status, with a shared local clock across the match list and match page.
- **Match details:** timeline, venue information, lineups, statistics, standings and highlights.
- **Interactive lineups:** both teams on one pitch, player portraits, final ratings, goal indicators and player-statistics popups.
- **Player statistics:** organized overview, attacking and defending tabs, with animated percentage indicators where data is available.
- **Standings:** competition-themed league tables, highlighted match participants and knockout brackets where supported.
- **Highlights:** matched public videos, grouped by matchday, with playback in the app where the publisher permits embedding.
- **Club and national-team pages:** fixtures, results, competition selection and associated highlights.
- **Fan voting:** saved FotMob “Who will win?” vote shares and total votes.
- **Settings and reports:** dark/light themes, desktop-mode control, daily highlight summaries and weekly/monthly usage reports.

## Competitions

| Club football | International football |
| --- | --- |
| Premier League | UEFA Nations League |
| LaLiga | FIFA World Cup |
| Serie A | UEFA EURO |
| Bundesliga | |
| Croatian HNL | |
| UEFA Champions League | |
| UEFA Europa League | |
| UEFA Conference League | |

## Data and refreshes

MatchXI uses public ESPN and FotMob data, HNL fixture/table sources and matched videos from official club, league, federation and broadcaster channels.

- Regular foreground score/event updates run every **40 seconds** while the relevant screen is visible.
- Kickoff detection checks every **6 seconds**, beginning one minute before scheduled kickoff.
- Confirmed halftime pauses periodic match checks for **15 minutes**, followed by **10-second** second-half detection.
- Both rapid-detection windows are capped at five minutes, then fall back to 40-second polling.
- The local clock advances without per-second server requests or routine timing corrections.
- Detailed live statistics and lineups refresh approximately every **five minutes** while their tabs are visible.
- Highlight/final-player checks run at **23:30** for that day’s matches and **12:45** for the previous day’s remaining gaps.
- Fan-vote snapshots are scheduled for **12:00** on matchday.

Scheduled times use **Europe/Zagreb**, including daylight-saving changes. Background jobs run independently of ChatGPT; foreground polling stops when hidden or inactive.

Ratings, statistics, portraits and highlights depend on source availability. Missing values are not fabricated. Fan votes represent user opinions, not calculated winning probabilities.

## Video playback

The app saves **video links and metadata**, not video footage. YouTube or the external publisher delivers playback. Videos that cannot be embedded have an external viewing link; publisher restrictions are respected.

## Technology

- React, TypeScript and Vite
- Tailwind CSS and Radix UI
- Netlify hosting and Functions
- Netlify Blobs for persistent application data
- Web app manifest and home-screen icons

## Development

Requires **Node.js 22.13 or later**.

```sh
npm ci
npm run dev
```

The Vite server runs the frontend. Netlify Functions and private API access require a configured Netlify development/runtime environment.

### Validate and build

```sh
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

Netlify builds with `npm run build`, publishes `dist` and loads Functions from `netlify/functions`, as configured in `netlify.toml`.

## Configuration and stored data

Runtime credentials and owner authentication data are deliberately excluded from this repository. Existing fixtures, highlights, player data, reports and authentication records remain in the live site’s Netlify Blobs stores.

The snapshots under `public/data` are seed data, **not a complete backup of the live database**. Uploading the source to GitHub does not automatically connect Netlify deployments or migrate the existing site.



## MatchXI isolation and deployment gate

MatchXI is a separate GitHub repository. Do not deploy it until its own Netlify site, owner account, secrets, and data stores have been reviewed. The original Touchline site and GitHub repository must not be changed.

`MATCHXI_SITE_URL` must be set to the independent MatchXI HTTPS Netlify origin before background requests can work. With no setting, the backend targets the intentionally invalid `https://matchxi.invalid`, never Touchline. Do not set it to Touchline's production URL.

Automated refresh and vote schedules are deliberately **not registered** for deployment yet. The environment guard `MATCHXI_ENABLE_SCHEDULES` defaults to disabled; restoring schedules requires explicit separate review of Netlify Function schedule declarations and safe background routing. Do not assume setting the variable alone activates schedules.

Production Netlify Blobs are not copied by Git. MatchXI will require independent setup and should not reuse production secrets. Branding inside some source components and existing image assets may still refer to Touchline until the branding pass is complete.
