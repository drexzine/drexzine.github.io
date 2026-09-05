# _private/ — in the repo, off the site's map

Working files that belong in version control but are not part of the published
site: drafts, research, measurements, one-off scripts, anything that would be
noise (or embarrassing) as a page.

## READ THIS BEFORE YOU PUT SOMETHING SENSITIVE HERE

**This directory is not access-controlled.** The repo root ships a `.nojekyll`
file, which turns the Jekyll build OFF entirely. GitHub Pages then serves every
committed file verbatim, at its own path. So a file at `_private/foo.md` is
fetchable at `https://drex.style/_private/foo.md` by anyone who types it.

What this directory actually buys you:

- **Nothing links to it.** It is not in the nav, the sitemap, or any page.
- **`robots.txt` disallows it**, so it stays out of search results.

That is obscurity, not privacy. It is the right home for a draft nobody should
stumble across. It is the wrong home for a credential, a key, a customer's
email, or anything whose leak would matter.

For anything that must be genuinely unreachable, use one of:

1. **`.gitignore` it** — the way `notes/` is handled today. Not in the repo at
   all, so nothing can serve it. The only guarantee available while `.nojekyll`
   is in place.
2. **Delete `.nojekyll`** — Jekyll then runs, and Jekyll skips `_`-prefixed
   directories at build time, so this directory would stop being published while
   staying in the repo. That is the real fix for what this directory is FOR.
   It is not done yet because turning the build on is a live-site change that
   deserves its own test pass. (Checked 2026-09-05: no `{{` or `{%` in any
   served .html/.css/.js, so Liquid would not mangle anything — the risk is in
   Jekyll's other defaults, not in the templating.)
3. **A private sibling repo**, if it should not be near the website at all.
