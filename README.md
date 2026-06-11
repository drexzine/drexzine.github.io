# drex.style — landing page

Zero-dependency, no-build landing page for **drex.style**, served from GitHub Pages.
A handmade **zine / scrapbook** aesthetic: torn-paper sheets, washi tape, littered tilts,
hard offset "registration" shadows, highlighter + marker craft, rubber-stamp buttons, taped
team polaroids.

## Files
- `index.html` — markup only (links `app.css` + `app.js`, both cache-busted `?v=N`).
- `app.css` — all styles. The handmade-zine system + a small feature layer (reveals,
  highlighter draw-on, cut-gate) gated on `body[data-motion]` / `html[data-tier]`.
- `app.js` — ES module, zero deps. A `Stage` orchestrator (one rAF loop, one shared
  IntersectionObserver, an FPS governor that latches `html[data-tier=lite]`, and the
  `body[data-motion]` reduced-motion switch) plus the features: opt-in audio, scroll
  reveals, highlighter/marker draw-on, the demo gate, and the `cut here` cut-gate.
- `assets/team/` — team polaroids (`uko.jpg`, `lucero.jpg`, `chielo.jpg`), web-optimized.
- `assets/audio/` — craft SFX (`cut`/`snip` for the cut-gate, `stamp`/`toggle` for
  interaction; others staged). mp3+ogg. Off by default; the footer "sound" toggle opts in.
- `assets/og.png` — 1200×630 social card (wired via `og:image` + `twitter:` meta).
- `CNAME` — custom domain (`drex.style`).
- `.nojekyll` — skip Jekyll.

## Before it goes live — links + demo host (hardcoded in the markup / `app.js`)
There is no `CONFIG` object; everything is hardcoded where it is used.
- **Instagram** — `instagram.com/drexcircles`: the card button + `@drexcircles` text and
  the footer link are hardcoded in `index.html`. Update those if the handle changes.
- **Circle** — `https://circles.drex.style/`: the Circle card button + `circles.drex.style`
  text are hardcoded in `index.html`.
- **Demo host** — `demoHost` const at the top of `initDemoGate()` in `app.js`, **no
  protocol** (e.g. `demo.drex.style`).

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
