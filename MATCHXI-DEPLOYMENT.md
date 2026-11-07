# MatchXI deployment checkpoint — 7 November 2026

## Authorized target

- Repository: `Doma-11/matchxi`, production branch `main`.
- Existing Netlify project: `matchxi`, site ID `7b761624-8fec-4cca-b485-89684fa3f6b4`.
- Team: King's Landing (`661cdddf0e8b6e2307e54af6`). Team billing and quotas may be shared with other projects.
- Expected origin: `https://matchxi.netlify.app`.
- Base directory: empty; build: `npm run build`; publish: `dist`; functions: `netlify/functions`.
- Repository visibility was public during review. The user will change this later.

Never modify the original Touchline repository or site. No original production secrets or storage have been copied.

## Deployment gate

The repository-linking review ends with **Deploy matchxi**. This button has not been clicked. Obtain explicit approval before this combined connection/deployment action. Repository selection alone does not complete the connection.

## Build preparation

- `main` at audit start: `44f0c43c2097fcbb5db8a8b88859731b47ba131c`.
- Latest GitHub validation at audit start: run `42364508501`, successful for that exact SHA.
- Reproduced the inherited `npm ci` failure: AJV 6/8 and json-schema-traverse lockfile mismatch.
- Repaired the npm lockfile without changing declared application dependency versions.
- Standardized on npm 11.9.0 and Node.js 22 for Netlify/CI. Local checks used Node.js 24.22.1 and npm 11.9.0; the new CI run must verify Node.js 22.
- Next.js is an inherited dependency; the application builds through Vite. `NETLIFY_NEXT_PLUGIN_SKIP=true` explicitly skips the Next.js adapter. Actual Netlify build logs must confirm this.
- `.netlify/` is already gitignored, including local linkage/build artifacts.

## Production environment

Read-back verified these site variables, with values for the production context only:

| Variable | Value or handling | Saved scopes |
| --- | --- | --- |
| `MATCHXI_NETLIFY_SITE_ID` | MatchXI site ID above | All |
| `MATCHXI_SITE_URL` | MatchXI HTTPS origin above | All |
| `MATCHXI_ENABLE_SCHEDULES` | `false` | All |
| `MATCHXI_REFRESH_SECRET` | Fresh 48-byte random value, secret flag enabled | Builds, Functions, Runtime |

The current plan does not permit custom scope selection. The first attempted Functions-only write returned HTTP 403; a secret with All scopes returned HTTP 422 because secrets cannot use Post-processing. The supported saved scope sets above were subsequently verified. Secret values are not recorded here.

These variables are consumed by runtime functions; the Vite client does not require application secrets. Build tool settings live under `[build.environment]` in `netlify.toml`. No team-level variables were returned during this audit. Setup hash/expiry and optional official Netlify usage credentials remain unconfigured. Owner setup must use independent credentials after the first deployment; official billing/usage integration is unavailable without its separate token.

## Verification before the approval gate

- Fresh `npm ci --no-audit --no-fund`: passed after lock repair.
- Isolation audit: passed.
- Both forbidden-target SHA-256 constants: independently recomputed and matched the actual original site ID and hostname.
- Offline deployment preflight using the newly generated configuration: passed.
- Preflight regression tests reject the original site ID/hostname, enabled schedules, missing credentials and insecure/credential-bearing URLs.
- TypeScript validation: passed locally.
- Full Node suite: 143 passed, zero failed or skipped.
- Vite production build: passed; warning about a chunk larger than 500 kB remains.
- Netlify Functions local bundling: passed.
- Scanned 194 built public files: neither the generated refresh secret nor either original production target appeared.
- Dependency installation emitted deprecation warnings. These were not build errors.

## Limits and remaining checks

This is code/configuration validation, not evidence of a successful hosted application. After approval, inspect Netlify installation/build logs, deployed SHA, emitted functions, route precedence, static assets, private API authorization, authentication/session behavior and actual Blob access. Verify no scheduled jobs were registered.

Schedules remain unregistered, and both schedule handlers exit unless explicitly enabled. Do not enable them without separate approval. The catalogue retains one replaceable snapshot per kind: the characterization test demonstrates a concurrent lost-update risk. Background leases remain non-atomic. The catalogue-refresh POST handler remains absent from the API dispatcher. No changes in this preparation alter that architecture or expose that handler.
