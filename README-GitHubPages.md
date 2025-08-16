
# Fairway Fiend • Quick (Web + GPS) — GitHub Pages Pack

This folder is 100% static and **ready for GitHub Pages**. GPS requires HTTPS; GitHub Pages gives you that for free.

## Deploy in ~2 minutes

1. Create a new public repo on GitHub (e.g., `fairway-fiend-quick`).
2. Upload **all files** from this folder to the repo root (or use drag/drop on GitHub).
3. Go to **Settings → Pages**:
   - **Build and deployment**: Source → **Deploy from a branch**
   - Branch → **main** (or default) / **root**
4. Wait ~30–60 seconds, then visit the Pages URL shown there (something like `https://<username>.github.io/fairway-fiend-quick/`).

> iPhone Safari tip: once loaded, tap the share button → **Add to Home Screen** to install it as an app (PWA).

## Local testing (optional)
```bash
python3 -m http.server 8080
# open http://localhost:8080 in your browser
```
**Note:** Location works on `http://localhost` or any `https://` URL. It will NOT work when opening `index.html` directly (file://).

## What’s inside
- `index.html` — app shell with tabs (Play/Rounds/Stats/Gear)
- `app.js` — data + GPS + autosave + CSV export
- `styles.css` — dark, readable on-course styling
- `sw.js` + `manifest.json` — PWA/offline/install support
- `assets/` — icons
- `.nojekyll` — required for GitHub Pages to serve files as-is

Have fun. Make birdies.
