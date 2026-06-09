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
- `instagram` — real Instagram URL (currently the dummy `instagram.com/drex.style`; also appears as visible link text in the Instagram card + footer).
- `circleUrl` — `https://circle.drex.style` (set).
- `demoHost` — the demo's host, **no protocol** (e.g. `demo.drex.style`).
- `demoUser` — the demo's HTTP **Basic Auth username**.

### How the Demo gate works (HTTP Basic Auth)
The demo sits behind Basic Auth. The styled passcode box collects the **password**; on submit we
navigate to `https://<demoUser>:<password>@<demoHost>`, which hands the browser the Basic Auth
credentials so the visitor skips the native browser dialog.

- The password is **never** in the page source — it's whatever the visitor types; the demo server
  validates it (a wrong one just falls back to the demo's own 401 prompt).
- Set `demoUser` to the demo's real Basic Auth username.
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
