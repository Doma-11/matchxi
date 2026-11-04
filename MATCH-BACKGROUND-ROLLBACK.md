# Match background artwork v2 — 4 November 2026

Approved scope: replace dark-mode match header artwork for Champions League, Europa League, Conference League, Premier League, Croatian HNL and UEFA EURO. Existing logos, blur, layout, scorer dimensions/animations, statistics and polling remain unchanged. League overview headers, other competitions and light mode retain their previous artwork.

## Previous version retained

- Baseline GitHub commit: `42e4edcc1f57200adb1c0e3a5c0377d6bbaecb3f`.
- Original artwork: `public/themes/competition-art-dark-v1.webp` and `public/themes/competition-art-light-v1.webp`.
- Original theme rules: `app/competition-skins.css` (unchanged by this update).

## Restore old match backgrounds

Remove the single `import './match-backgrounds-v2.css';` line from `app/page.tsx`, build and deploy normally. The old six backgrounds return through the existing CSS without any data restoration or changes to unrelated features. Do not roll the entire app back after subsequent unrelated changes; remove only this override import.

## New artwork

- `public/themes/match-cups-dark-v2.webp`: three equal panels, left to right Champions / Europa / Conference.
- `public/themes/match-domestic-euro-dark-v2.webp`: Premier League / HNL / EURO.
- `app/match-backgrounds-v2.css`: dark-match-only panel selectors.

The image backgrounds were prepared from the approved uploaded artwork; small central logo/wordmark copies were removed so the live competition logo is displayed once. Decorative ball, trophy and lion imagery remains. Files use WebP encoding and normal browser caching, with no API work or scheduled refreshes.

## Standalone logo follow-up

The Premier League and HNL match logos are controlled separately by `app/match-logo-overrides.css`. This removes their white backing tiles; Premier League uses the stacked vector mark in `public/logos/premier-league-stacked.svg`. Dark headers use white marks; light headers use dark marks. Removing the background override import does not remove these independent logo improvements.
