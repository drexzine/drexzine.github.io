# drex.style — landing page

Zero-dependency, no-build landing page for **drex.style**, served from GitHub Pages.
A handmade **zine / scrapbook** aesthetic: torn-paper sheets, washi tape, littered tilts,
hard offset "registration" shadows, highlighter + marker craft, rubber-stamp buttons, taped
team polaroids.

## Files
- `index.html` — the whole page (HTML + CSS + JS inline).
- `assets/team/` — team polaroids (`uko.jpg`, `lucero.jpg`, `chielo.jpg`), web-optimized.
- `CNAME` — custom domain (`drex.style`).
- `.nojekyll` — skip Jekyll.

## Before it goes live — `CONFIG` (top of the `<script>` in `index.html`)
- `instagram` — Instagram URL (`instagram.com/drexcircles`). Note: this CONFIG value is **not** wired into the DOM — the real links live hardcoded in the Instagram card (button + `@drexcircles` text) and the footer, so update those if the handle changes.
- `circleUrl` — `https://circle.drex.style` (set).
- `demoHost` — the demo's host, **no protocol** (e.g. `demo.drex.style`).

### How the Demo gate works (HTTP Basic Auth)
The demo sits behind Basic Auth. The UI just asks for a **passcode** — the format is never shown.
That passcode *is* the full Basic Auth credential (`user:pass`); you hand the whole string to
members yourself. On submit we split it on the first colon and navigate to
`https://<user>:<pass>@<demoHost>`, which hands the browser the credentials so the visitor skips
the native browser dialog.

- **Nothing** is in the page source — the whole credential is whatever the visitor types; the demo
  server validates it (a wrong one just falls back to the demo's own 401 prompt).
- No client-side format gating: a passcode with no colon is sent as username-only and simply 401s,
  so the `user:pass` shape is never leaked to visitors.
- **Caveat:** URL-embedded credentials work for top-level navigation in current desktop
  Chrome/Firefox/Safari, but it's a legacy mechanism — some browsers show a one-time confirm, the
  creds appear briefly in the address bar/history, and mobile browsers can be inconsistent. If it
  ever gets flaky, the bulletproof fallback is to make the Demo button a plain link to the demo and
  let the browser's native Basic Auth dialog collect username + password.

## Deploy
1. Push to a repo (e.g. `drexzine/drex.style`) `main`.
2. Settings → Pages → Source: `main` / root.
3. Point `drex.style` DNS at GitHub Pages per their custom-domain docs.

## Design source
Built on **`../backend-gstack/DESIGN.md`** — the Drex web-app's neo-skeuomorphic "whimsymaxx"
scrapbook system (the canonical system for *screens*) — within the brand book's palette §4 / type
§5 / logo §3 rules. Web faces are the brand's Google-Fonts substitutes (Pitch→Courier Prime,
Pitch Sans→DM Mono, Bitter, Birdie→Patrick Hand). The **logo stays clean**: upright, one solid
Grass colour, no filter/tilt/shadow (§3.3) — everything else is torn/taped/tilted.
