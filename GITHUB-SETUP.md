> **MATCHXI SAFETY NOTICE (2026-11-07):** This is historical documentation copied from Touchline, NOT current MatchXI deployment instructions. Never use the Touchline URLs, site ID, service tokens, credential names, connected project identifiers, or upload procedures below for MatchXI. Never modify or deploy the original Touchline repository or Netlify site. For MatchXI, use only independently configured MATCHXI_* secrets and the new MatchXI Netlify site after separate deployment approval. See README.md and the MatchXI validation workflow.

---

# Touchline source and setup

This repository contains the existing Touchline React/TypeScript/Vite app, Netlify Functions, assets, tests and initial public-data snapshots. The live site is https://touchline-football-hub.netlify.app. The root README supplied by the repository owner is preserved.

## Local development

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

The Vite development server serves the frontend. Private API calls require the existing Netlify runtime or an appropriately configured Netlify development environment; Vite alone does not run Netlify Functions.

## Validation and build

```sh
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

Netlify configuration is in `netlify.toml`: build with `npm run build`, publish `dist`, Functions in `netlify/functions`. Generated files and dependencies are excluded from Git.

## Hosting and private access

Uploading this repository does not connect GitHub automatic deployments or transfer the existing Netlify site. Keep the current Netlify site ID and URL when configuring future Git deployments. Do not create a replacement site if the existing saved data must be preserved.

Netlify Functions need the existing protected runtime configuration. `TOUCHLINE_REFRESH_SECRET` is the internal service credential; `TOUCHLINE_SETUP_HASH` and `TOUCHLINE_SETUP_EXPIRES` are owner-setup values used by the existing private-access flow. Secrets are deliberately not in this repository. The owner login is backed by the existing site's authentication store; the password and login state are not source files.

Existing CLI deployments supply these settings securely at deployment time. Before switching to Git-based Netlify deployments, verify that the existing site supplies the required settings in the new deployment context. Do not rotate credentials or reset the owner login just to connect GitHub.

## Stored data

The existing site persists fixtures, highlights metadata, match details/final ratings, player portraits, votes, reports, response caches and authentication data in Netlify Blobs. These live stores are not a GitHub database backup. The files in `public/data` are source seed snapshots, not a complete export of current records. Video footage is not downloaded or stored.

## Refresh behaviour

- Highlight/final-player jobs: 23:30 for today's games and 12:45 for yesterday's gaps, Europe/Zagreb.
- Fan-vote snapshot job: 12:00 Europe/Zagreb; saved votes are not calculated winning probabilities.
- Regular visible Home/live-match score and event polling: 40 seconds.
- Kickoff detection: every six seconds from one minute before scheduled kickoff, for at most five minutes.
- Confirmed HT: 15-minute pause, then ten-second second-half detection for at most five minutes.
- Delayed phase detection falls back to 40 seconds; hidden/inactive foreground polling stops.
- The shared per-match local clock advances without per-second API calls and does not undergo routine timing corrections.
- Statistics/Lineups use five-minute visible detail updates outside halftime; initial details and final-data retries remain supported.

The UTC candidate schedules guard Europe/Zagreb local time to handle daylight saving. `UPDATE-CATALOGUE.md`, `UPDATE-PORTRAITS.md`, `PRIVATE-LOGIN.md` and `HANDOFF.md` contain additional implementation and historical context. Current code and the policy above take precedence over older historical notes.

## Private repository

This repository can remain private. An owner-authorized GitHub integration can read/write it; Netlify can deploy private GitHub repositories when granted repository access. Repository privacy does not change the existing website URL or visitor login requirements.
