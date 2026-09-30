# BRUHsailer + Ladlor

A personal, stripped-down web version of the **BRUHsailer** ironman guide with
**Ladlor's gear progression chart** in a second tab.

- **Guide** tab: step checklist, search, minimize completed, highlight / remove
  highlights, reset progress, Main / Landlubber guide versions.
- **Progression** tab: Ladlor's chart — click an item to mark it obtained,
  right-click for its wiki page. Optional "Retirement home" section.
- Light / Dark / Auto (system) theme.

## Staying up to date

Guide and chart data are fetched live from the upstream GitHub repositories on
every page load, so guide updates and the **Last updated** date appear
automatically — no redeploy needed. `public/data` holds fallback copies used
only if GitHub is unreachable; refresh them with `npm run sync-data`.

Step progress is keyed by step position (e.g. step `1-12`), the same as the
original site. If the guide authors insert or remove steps upstream, ticks
after that point can shift — this is inherited from the original's scheme.

## Progress storage

Progress, highlights and settings live in your browser's `localStorage`. They
are per browser/device and are not synced.

### Moving progress over from the original site

Storage keys match the original site. On https://umkyzn.github.io/BRUHsailer/,
open the browser console (F12) and run:

```js
copy(JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => /^(guideProgress|userHighlights|guideFilter):/.test(k)).map(k => [k, localStorage.getItem(k)]))))
```

Then on this site, open the console, and run (paste the copied text in place of `PASTE`):

```js
Object.entries(PASTE).forEach(([k, v]) => localStorage.setItem(k, v)); location.reload()
```

Ladlor chart progress transfers the same way using the `milestonesComplete` key.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## Deploying (GitHub Pages)

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` builds and publishes.
3. Site URL: `https://<user>.github.io/<repo>/`

## Credits

- **BRUHsailer guide** by So Iron BRUH and ParasailerOSRS —
  [Google Doc](https://docs.google.com/document/d/1CBkFM70SnrW4hJXvHM2F1fYCuBF_fRnEXnTYgRnRkAE).
- **Original web version** by kyyznn — [umkyzn/BRUHsailer](https://github.com/umkyzn/BRUHsailer).
  Guide data is loaded from that repository.
- **Ladlor's Interactive Gear Progression Chart** — [ladlorchart.com](https://ladlorchart.com/),
  source [Madssb/InteractiveGearProg](https://github.com/Madssb/InteractiveGearProg)
  (MIT, see `licenses/ladlorchart-MIT.txt`). Chart data and item icons come from that repository.
