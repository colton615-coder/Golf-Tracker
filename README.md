# Fairway Fiend • Quick (Web)
Lean quick-entry golf tracker that runs in your browser and works offline (PWA).

## Use
1) Open `index.html` locally, or host the folder (GitHub Pages, Netlify, Vercel, etc.).
2) Tap **Play → Start Round**; enter course and tees; Go.
3) Log strokes, putts, penalties, FIR/GIR per hole. Autosaves to localStorage.
4) **Rounds** tab shows history; **Stats** gives simple averages.
5) **Export CSV** to back up or analyze elsewhere.
6) Install to home screen (PWA) via the **Install App** button on iPhone Safari.

## Tech
- Vanilla JS, CSS, HTML. No frameworks.
- PWA: service worker + manifest for offline + Install.
- Data: localStorage (no server).

## Notes
- This is a prototype: no GPS, no backend, no multi-device sync.
- If you clear browser storage, your rounds go bye-bye. Export CSV first.
