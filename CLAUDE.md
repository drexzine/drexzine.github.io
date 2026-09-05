# drex-landing

The marketing site for drex.style. Hand-written static HTML/CSS/JS — no build step,
no framework, no package manager.

## Branch discipline: WORK DIRECTLY ON MAIN

**This repo opts out of the global worktree rule.** Edit files on `main`. Do not create
a worktree, do not branch for a one-line copy change, do not ask which branch to use.
Sue's own workflow is to edit `index.html` on `main` and push, and a branch per tweak
just creates merge friction and orphaned commits.

Worktrees are still right for exactly one case: a long-running variant that must be
served alongside the live page for comparison. Everything else goes on `main`.

### Pushing is still a separate, explicit decision

`main` IS the live site. There is no staging environment and no deploy pipeline —
GitHub Pages serves the branch, so a push to `origin/main` is a production deploy
that is visible to the public within about a minute.

So: commit on `main` freely, but get a clear go-ahead before `git push`. "Commit and
push" authorises that push and no other; it does not carry forward to the next change
in the same session.

Note that `git merge` and `git push` on this repo are also gated by the permission
classifier, independently of anything written here. When that gate fires, hand Sue the
exact commands to run with `!` rather than trying to route around it.

## The files that matter

`index.html` is the live page. **It loads `app-post-beta.css` and `app-post-beta.js`** —
NOT `app.css` / `app.js`, which are dead. Auditing the wrong stylesheet gives wrong line
numbers and wrong conclusions; check the `<link>` and `<script>` tags before quoting a
line number at anyone.

The other `index-*.html` files are frozen comparison pages, each on its own asset pair:

- `index-alt.html` — **read-only benchmark.** Compare-only, for copy and ideas. Never
  edit it and never copy its code into `index.html`; rebuild sections from git history.
- `index-fielded.html` — runs on `app-fielded.css` / `app-fielded.js`. Edits to
  `app-post-beta.*` never reach it.
- `index-aug-*.html`, `index-old.html`, `index-pre-promotion.html` — dated snapshots.

## The comments are the spec

The HTML carries the full editorial history of nearly every line: what the copy used to
say, what it was changed to, who called it, what the change bought and what it cost, and
which words are struck by name. **Read the comment block above a line before changing
that line.** Most "improvements" to this page have already been tried, fielded and
reverted, and the comment says so.

When you do change a line, update its comment in the same edit — including any comment
elsewhere that quotes the old string. A stale comment here is worse than no comment,
because the next pass will treat it as a rule.

## .nojekyll: everything committed is public

The repo ships a `.nojekyll` file, so Jekyll never runs and Pages serves every committed
file verbatim at its own path. Consequences:

- There is no such thing as a repo file that is hidden from the website. `_private/` and
  `robots.txt` buy obscurity — nothing links there, search engines are told to skip it —
  and not privacy. `_private/README.md` spells this out.
- The only real exclusion is `.gitignore` (how `notes/` is handled), or deleting
  `.nojekyll` so Jekyll's `_`-prefixed-directory skipping kicks in. As of 2026-09-05 no
  served `.html/.css/.js` contains `{{` or `{%`, so Liquid would not mangle anything —
  the risk of that flip is in Jekyll's other defaults, and it deserves its own test pass.
- **Never `git add -A` without reading the list.** Measurement and QA runs drop full page
  copies in the repo root (`t_c53.html`, `ht_c58_320.html`, `__m_index.html`, ~300KB
  each). They are gitignored now, but new patterns appear; anything that slips through
  gets published.

## Checking a change

Serve the directory and look at it — there is nothing to build:

```
python3 -m http.server 8745 --bind 127.0.0.1
```

Pin your own port. A parallel workspace squats :8731, and :8746 shows up in this repo's
permission allowlist, so pick something else and say which one you used.

Fold and hero work must be checked at **320 and 375** widths, not 390. The deck and sub
line counts can cancel each other at 390 and report a regression as free.
`.hero-card .ed-deck` is `max-width:24ch` and the head font is not proportional, so 24ch
means 24 characters at every width — line lengths are arithmetic, not taste.

## Copy rules that outrank your judgement

These are settled and enforced across the whole page; the argument for each is in the
HTML comments at the cited line.

- **Never write "an issue."** (`index.html:108`)
- **"club", "zine", "maker" are lowercase. "Club Hour" and "Host" are capitalised
  product nouns. "Circle" and "Editor" are dead names.**
- **No named cadence** — "regular", never "monthly". The date belongs to the club, and
  the page says so twice in visible copy. A number is allowed only in a worked example
  about one named club.
- **"creative" and "portfolio" are struck.** So is the corporate third-person register
  ("Drex is where…", "this platform exists to…"). Both rules held on 2026-09-05 when the
  Sep-5 variant was promoted: its deck read "Drex is where creative groups stay accountable
  by making magazines together." and was rewritten to "Keep each other accountable by making
  a magazine together." for the page. The third-person sentence survives as an elevator
  pitch OFF this page; it is not served copy.
- **Never the name "Sue"** in visible text, alt or aria. `grep -inE '\bsue'`.
- **No em dashes in head strings** (`<title>`, meta description, OG/Twitter strings).
- The six head strings move together or they rot: `<title>`, meta description,
  `og:title`, `og:description`, `twitter:title`, `twitter:description`. `og:image:alt` is
  the exception — it is pinned to the pixels of `assets/og-v4.png`, not to the fold, and
  changes only when that image changes.

## Design bible

No gradients, gloss, or clean vector edges. Objects on this page are drawn marks —
rough SVG filters, hard ink shadows, paper. Rough-edge is not the same as boil.
The masthead mark and wordmark are brand green, with exactly one "x" of space between
them (`gap:0`).
