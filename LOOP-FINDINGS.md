# LOOP-FINDINGS.md — the landing-page loop's memory

Read this **before** you change a word. Append to it **after**. It exists because three
passes have now run on this page and each one re-derived what the last one already knew:
pass 2 rediscovered pass 1's findings, and the single largest comprehension defect
(§O-1) survived both because it belonged to no section and therefore to no owner.

## How to use it

- **Skim the headers, not the bodies.** Each entry is one bold claim line; the indented
  lines under it are *why*, and exist so nobody re-proposes a dead idea by arguing from
  first principles. If you are about to propose something, grep this file for its noun
  first (`grep -in "waitlist\|ring\|regular" LOOP-FINDINGS.md`).
- **Evidence rank, highest first.** Nothing below overturns something above it:
  1. **FIELDED** — real strangers, in the world, with a real prompt. (§F)
  2. **SHIPPED + OBSERVED** — a claim checked against the actual backend/repo. (§K)
  3. **COLD READ** — one reader, whole page, first time. (§C)
  4. **SIMULATED** — agent review, slop lens, design shotgun, consensus. Lowest.
     Six agents agreeing is not evidence. It is six draws from one distribution.
- **Date every entry** and give it an ID (`F-n`, `K-n`, `R-n`, `C-n`, `O-n`, `P-n`,
  `M-n`) so later entries can supersede by ID rather than by re-litigating.
- **Never delete an entry.** Strike it: `~~R-4~~ SUPERSEDED 2026-09-02 by R-11 —` and
  say what new evidence killed it. A deleted entry is an idea that comes back.
- Entry template is at the bottom (§APPENDING).

---

## §S — STATE OF PLAY (verified 2026-08-29)

Three states of this page exist at once and they disagree. Know which one you are editing.

| | file | what it is |
|---|---|---|
| S-1 | `origin/main:index.html` | **What the public sees.** Carries the false deadline claim (§K-1) and the stale meta (§K-5). |
| S-2 | `index.html` (working copy, `MM`, unpushed) | Live page + the §K-1 correction + an abandoned-bubble section illustration. Still two-column band, still stale meta. |
| S-3 | `index-next.html` (untracked) | **The rebuild in progress.** One-column band (§O-3), meta fixed, otherwise tracks S-2. |
| S-4 | `index-fielded.html` (**tracked**, therefore published at `drex.style/index-fielded.html`) | The exact version put in front of 15 strangers on 2026-07-24 (§F-1). Do not edit it — it is the control. But see §K-4: it is the one file still referencing `cover-3am.jpg`. |

The frozen hero (S-2 and S-3, identical) is three lines:

> **Clubs run their own magazine.**
> Each issue is a new challenge with a deadline.
> Accountability buddies with something to show!

---

## §F — FIELDED WITH REAL PEOPLE

*Outranks everything else in this file. Only two entries exist. That is the problem.*

**F-1 · 2026-07-24 · Manny's, SF · ~15 people · hero card only · comprehension: 1.5 / 15**
Prompt: "who are we, what do we do, do you see value". Tested version preserved at
`index-fielded.html`; it carried a block headed **"How show-and-tell works:"** with three
beats (a challenge / time together / your zine).
- Frequent, unprompted: **"too much text"**, and lines **"too vague to translate into
  anything"**. Both complaints were about the same thing from two directions — mechanism
  stated abstractly reads as filler.
- **"Club" was heard as an institution that already exists.** This is the finding people
  keep forgetting: it did not read as *a thing you and four friends start*, it read as
  *a thing you apply to*. That is why every "join a club" framing tests worse than it
  looks on paper (§R-3).
- The **only** consistently understood and most compelling element was the **deadline** /
  "show-and-tell deadlines". Several people said, unprompted, that it should **lead** and
  be **bigger**.
- **CONSEQUENCE — THE HERO IS FROZEN. It says WHAT, never HOW.** Any proposal that moves
  mechanism above the fold is a proposal to rebuild the version that scored 1.5/15.
  Rejecting it does not require a new argument; it requires new fieldwork.

**F-2 · (none)** — nothing has been fielded since. Every finding below F-1 is a cold read
or a simulation. **The loop's real exit condition is a second field test, not consensus**
(§P-4).

---

## §K — KNOWN FALSE / UNVERIFIED CLAIMS

*A claim the product does not keep. Each carries a STATUS. Clear these before shipping.*

**K-1 · 2026-08-27 · SHIPPED FALSE, FIXED LOCALLY, NOT PUSHED**
Live copy (`origin/main:index.html:1384`):
> You bring the work. **We do the nagging**: the hour, the place, the deadlines.

**Deadline reminders never fire.** `sweepAllDueLadders`' only caller is gated on
`DEADLINE_LADDER_ENABLED`, which is commented out in `.env.example`, absent from
`.env.prod.example`, and passed as empty by compose. Corrected in S-2/S-3 to:
> ...the hour, the place. **The deadline closes itself.**

which *is* true — `submissionsClosed` is opt-out and enforced.
- **STATUS: the fix exists only in an uncommitted working copy. The false line is what
  the public reads right now.** Pushing it is the highest-value action in this file.
- Note the shape of the error for next time: the page promised the *mechanism a human
  would otherwise do* (nagging) when the product only guarantees the *mechanism that
  needs no human* (a door that shuts). Prefer the second kind of claim — it cannot rot.

**K-2 · 2026-08-27 · UNFIXED · five of six maker-board quotes are PLACEHOLDERS**
`index-next.html:2708–2733`. Only **@tergel**'s is real (the Silk Road 001 cover
pull-quote): *"I didn't know what was possible until I saw someone else do it."*
The other five — @falcon, @shanara, @chiamakabrowneyes, @angela, @miguel — are
attributed to **real handles with real faces**, and several are paraphrases set inside
quotation marks where the ledger's actual words differ.
- This is the worst-consequence item in the file: it is not a weak line, it is words put
  in a named person's mouth on a public page. Either pull the real strings from the
  ledger or drop the attribution.

**K-3 · 2026-08-27 · UNFIXED · the worked example has EXPIRED**
`#showtell` sub (`index-next.html:1518`):
> A few photographers who became friends, and a blank page that became a zine.
> **Photo Phloor. Four weeks.**

The dated spine's **Aug 12** deadline passed with **Chinatown Story still open at 2
submissions**. "Four weeks." is now false.
- The markup's own note says "Four weeks." is not trimmable for length, and it is right —
  §F-1 says the number is the thing that lands. So this needs a **re-cut or a fresh run**,
  not a deletion. Removing the number to make the sentence true is the wrong repair.

**K-4 · 2026-08-27 · LATENT · `assets/zines/cover-3am.jpg`**
The image carries a signed reflection ("Not pissing security off …") with the founder's
first name on it, and is reportedly **misattributed**.
- Every crop in `index.html` / `index-next.html` cuts above it — and in fact neither file
  references the asset at all any more (verified 2026-08-29). **The one remaining
  reference is `index-fielded.html:381`, which is tracked and therefore published.**
- Any recrop, any new use, or anyone linking the fielded archive re-exposes it.

**K-5 · 2026-08-29 · FIXED IN S-3 ONLY · the meta description was stale**
Live + S-2 meta still reads "…a few real friends, **many show-and-tells**, one beautiful
portfolio." That middle clause quoted the summary band's item 2, which now reads **"Work
you actually finished."** S-3 re-synced it. The meta at `:61`, `:63` and `:79` quotes the
band verbatim — **if you touch the band's three fragments, the meta breaks silently.**

---

## §R — TRIED AND REJECTED

*Do not re-propose without NEW EVIDENCE, and say in your entry what the new evidence is.*

**R-1 · ring nodes as QUESTIONS** ("What are we making?" etc.)
Proposed and shipped in one pass, reverted in the next. **+57% text on the one object on
the page whose entire job is to be scanned in two seconds**, and they overflowed their
nodes at 1280px. Back to nouns with better subs.
→ Re-propose only with a layout that survives 1280px *and* a word budget that goes down.

**R-2 · "We give you tools to:" — and every rewrite of it, including the "three regulars"**
(a regular challenge / a regular meet-up / a regular portfolio).
Cold reader: **"an hour of what? nobody's told me what the hour is yet"** and **"I read
'regular' as 'ordinary' for a beat"**. The slop lens called it a chant rather than speech.
**The whole column was DELETED and nothing replaced it** (2026-08-29) — its three lines
each restated something within three inches: "Help each other make the deadline" is the
sub's own nagging, "Make the zine together" is the h2 above it, and "Show the world"
promised a planet to a club of six.
→ The lesson generalises: a second list beside a first list will restate it. Rewriting the
words does not fix a structural duplication.

**R-3 · "Join a club" as the closing CTA.**
It points at a **waitlist**. A cold reader called it a **bait** and said it turns a maybe
into a no. Compounds §F-1: "club" already reads as a pre-existing institution.
→ **VERIFY BEFORE RELYING ON THIS ENTRY (2026-08-29):** the recorded replacement,
"Ask for an invite" with the true state beside it, **is not in the repo**. Every CTA in
`index.html` and `index-next.html` still reads **"Join the waitlist"** (`:443`, `:953`,
`:1233`, `:2807`) with the true state adjacent: *"It's free — no way to pay us yet.
Invite-only while we're small."* Either the rewrite was lost or it was never applied.
Resolve which before the next pass, and record the answer here.

**R-4 · a Kurtis beat placed UNDER the ship-three-issues rule.**
> "it made me realise I'm not allowed to start a club. That's a mobile-game feeling and
> it made me trust the page less."

Moved **above** the rule and rewritten to start where he started.
→ The transferable rule: **a permission gate read after an invitation reads as a
retraction.** Order carries the meaning; the words were never the problem.

**R-5 · a three-cover rack for `#seewhat`.** Killed on duplication — all three issues
already appear elsewhere on the page. (§O-2 is still open, but this is not its fix.)

**R-6 · the Virgil Abloh / Kanye / Heath Ceramics / Bode lineage.** Founder's call:
stays in the pitch deck, **off the consumer page.** Not a design argument, a positioning
one — do not re-open it with a design argument.

**R-7 · arrow chains for sequence.** Prototyped for the hero beats, rejected as
over-complicated. `#showtell` carries sequence by **dateline** instead.

**R-8 · "monthly" as the cadence word.** Struck 2026-08-04: **it is a promise nothing
else on the site keeps.** The page says twice, in visible copy, that the date is the
club's to set ("Someone sets it, and puts a date on it"; "your Host sets one, with a
deadline"). There is no product-level monthly, and a fortnightly club is using drex
exactly as designed. "Regular" is the word; the *number* lives in the worked example
(§K-3), where it can be checked.

**R-9 · 2026-08-29 · §O-1 CLOSED · the object's ONE name is "issue"; "portfolio" is dead.**
Taxonomy now enforced across `index-next.html` (full sweep, every occurrence decided):
- **magazine** = the club's ONGOING PUBLICATION. Two uses, both the container: the frozen H1
  and the band h2 ("Turn showing up into a magazine." — what showing up ADDS UP TO).
- **issue** = THE ARTEFACT AND THE RECURRING UNIT, which are the same object in publishing.
  15 → 3 for zine, 13 → 23 for issue.
- **wall** = the accumulation. The page already owned the word and a section headed
  "It all ends up on a wall."
- **zine** = DEMOTED, not killed: 3 uses left, all naming a PHYSICAL object with the sentence
  saying so ("make a paper zine about your hobby", "Ten makers cut paper zines by hand") plus
  the proper noun "Zine Machine".
- **portfolio** = KILLED. 0 uses. It was a fourth name for the object AND a third name for
  the wall, in résumé register on a page about cut paper.
- **WHY "issue" AND NOT "zine"**, which was the house word with the most uses: THE HERO IS
  FROZEN AND CONTAINS NO "zine". It contains magazine + issue. The first two nouns a stranger
  reads cannot change, so they are the vocabulary; a third word is one the page has to teach.
  `index-next.html`'s own meta comment already said it — *"'zine' is still deliberately absent:
  the word's mental image is a photocopied paper thing, and what they get is a URL."* The body
  never got the memo. Every "issue" use on the page was already correct; the other three were
  the strays.
- **THE ONE TRAP, and it is new: NEVER WRITE "an issue".** The indefinite singular garden-paths
  to "a problem" ("a blank page that became an issue"). Every surviving form is definite or
  counted: "the issue", "one issue", "issue 001", "Issue after issue", "three issues".
- The decision is also written into the file, above the meta block, so a section-owner cannot
  undo it by accident (§P-5, §P-7).

**R-10 · 2026-08-29 · REJECTED · keeping "zine" as the primary name and renumbering the spine
to "zine 001..012".** It needs the H1 to change, and the H1 is frozen by §F-1.
→ Re-open only with new fieldwork that unfreezes the hero.

**R-11 · 2026-08-29 · REJECTED · driving the instrument's object-name klaxon to ≤2.**
Impossible without deleting "magazine", which is in the frozen H1, so the floor is THREE names
and `measure.py` will keep shouting. That is a limit of the tool (`OBJECT_NAME_WARN_ABOVE = 2`),
not a defect in the copy: the third name is a container the hero defines in its own second line
("Each issue is a new challenge with a deadline"), and the fourth name is gone.
→ Do not spend another pass trying to silence it. Read the per-name counts, not the klaxon.

**R-12 · 2026-08-29 · NOTE, not a rejection · `measure.py` does not see the `.dm-*` zines modal.**
Trimming "real issues — " from `.dm-sub` (a duplicate of #seewhat's eyebrow "real clubs, real
issues") removed two words a browser renders and the instrument does not count. Real
`document.body.innerText` after un-sealing is **956**; measure.py says 975. Both are right; they
measure different things. Cite which one you used (§M-2).

**R-13 · 2026-08-29 · SHIPPED · #portfolio's maker board now opens on the TOP of the wall.**
The brief for this pass said #portfolio "shows NO WALL — just two text links". **That is
false, and the way it is false matters**: both panels are 4:5 videos of real walls. But they
are `preload="none"` and only start on intersection, so the frame a reader actually meets is
the **poster** — and the maker panel's poster was `wall-tour-poster.jpg`, a **mid-scroll crop
with no masthead, no face and no name in it**. Its sibling never had that problem
(`club-tour-poster.jpg` opens on the PHOTO PHLOOR masthead). One board announced whose it was;
the other was a headless jumble of photos, which is exactly what "no wall" looks like.
- Fix: poster + reduced-motion still both become `assets/app/wall-144mb.jpg`, the same wall
  wound back to the top — name, face, bio, six club crests, the pinned pick. Top-anchored via
  `.pw-col.is-mine .pw-media img,video{object-position:center top}` (source is 0.719 in a 0.8
  box; the `center` default threw the masthead off the top edge).
- **It also closes the "1.44 MB reads as a file size" flag without spending a word.** Seen as a
  name on a profile with a face under it, it is a person in one glance.
- REJECTED: relabelling `.pw-name` to "@144mb's wall" (−1 word). It kills the joke the handle
  is making — the bio in the photo says *floppy diskette camera* — and a photograph answers the
  same question better than a rename.
- REJECTED: cropping the JPEG to 4:5 instead of anchoring in CSS. The panel is 4:3 under 760px,
  where a pre-cropped still gets centre-cropped a second time and loses the name again.

**R-14 · 2026-08-29 · SHIPPED · both `.pw-what` captions DELETED (−21 words).**
> "A maker's wall. Every photo they picked, and every issue they're in."
> "The club's wall. The table. Everything the club has pinned up."

21 words restating, one rank down, what `.pw-sub` says one rank UP ("Yours, and the club's")
and what both boards now show at rest with their own labels in frame — MY PICK over the pinned
photo, ZINES THEY MADE over the pile, THE RACK and the challenge on the club side. **Same
structural duplication as §R-2**: a second list beside a first list restates it.
- "The table" went out with them and should stay out — it was the page's ONLY visible use of
  that noun, introduced once and never used again, on a page that already carries three names
  for one object (§R-9).
- REJECTED: cutting only the maker's caption. The pair is a matched pair; one captioned column
  beside an uncaptioned one reads as a missing line, not as restraint. **Restore both together**
  if a cold reader cannot tell the boards apart.

**R-15 · 2026-08-29 · REJECTED · `assets/app/zine.jpg` anywhere on the page.**
It is a **third crop of one frame already on the page twice** — `assets/zines/silk-road-cover.jpg`
(same photograph, different pull-quote burnt in) and `assets/zines/hero/silkroad.jpg` (the full
Silk Road 001 scroll, whose first panel IS this image). A third use dilutes the two that earn
their place. Verified by eye, not by filename.

**R-16 · 2026-08-29 · REJECTED · `assets/app/circletime.jpg`, and it should be deleted.**
Two independent reasons, either one fatal: (1) **it says "CIRCLE TIME" and "the founding
Circle" in burnt-in pixels**, on a page whose own noun is now **Club Hour** — placing it makes
the page contradict itself in the one place a reader can't skim past; (2) it is the **empty-room
state** ("You're first in", "the room stays warm even when it's quiet"), i.e. the screenshot
sells a club with nobody in it. Any future use needs a **reshoot**, not a crop.

**R-17 · 2026-08-29 · REJECTED · `assets/demo/book-cafe-polaroid.*` and `book-cafe-thumb.jpg`.**
All three are the **same *Drawing at the Cafe* footage/cover** already carried by
`book-cafe.mp4` + `book-cafe-poster.jpg` in #seewhat. The polaroid pair is an *alternative
framing* of that clip, not additional content — and #seewhat's frame choice is already reasoned
in the markup (`.pw-media`, because the clip carries the reader's own chrome and a drawn phone
would frame a frame). Swapping frames is not putting media to work.

**R-18 · 2026-08-29 · NOTE · `assets/app/wall.jpg` is dead and should be deleted.**
It is the same maker's wall as `wall-144mb.jpg`, shot earlier and **stale**: it carries a `Lv.5`
badge and a club set that no longer matches the app. `wall-144mb.jpg` supersedes it in every
respect. Keeping both invites a future pass to place the wrong one.

---

## §C — WHAT A COLD READER HAS ALREADY FLAGGED

*One stranger, whole page, first read. Do not re-run these; they are banked.*

- **C-1 · the four names.** Could not tell whether zine / issue / magazine / portfolio
  were four things or one. Named it the single biggest comprehension leak. → §O-1.
- **C-2 · "an hour of what?"** — the hour was named before anything said what happens in
  it. → killed the tools column, §R-2.
- **C-3 · "regular" read as "ordinary"** for a beat. → §R-2.
- **C-4 · the closing CTA is a bait** — waitlist behind a join verb. → §R-3.
- **C-5 · the permission gate broke trust** — "I'm not allowed to start a club", "a
  mobile-game feeling". → §R-4.
- **C-6 · fragments are untestable.** Per-unit stranger reviews produced near-nothing;
  every finding above came from the whole-page read. → §P-2.

---

## §O — OPEN, UNSOLVED

**~~O-1~~ CLOSED 2026-08-29 by R-9 — ONE OBJECT, FOUR NAMES.** *The oldest open item. Survived two passes because it
belongs to no section, and therefore to no owner. If you own the page this pass, you own
this.*
Counts (visible text only, extractor of §M-1, 2026-08-29):

| | `index.html` | `index-next.html` |
|---|---|---|
| zine/zines | 18 | 16 |
| issue/issues | 10 | 14 |
| magazine/magazines | 4 | 4 |
| portfolio/portfolios | 4 | 3 |

(An earlier pass recorded 22 / 10 / 4 / 3. Neither set is wrong — see §M-2, counts are
extractor-dependent. Compare only counts produced by the same tool.)
All four **"magazine"** uses in S-3: the H1 *"Clubs run their own magazine."*; a hero
caption *"scroll the magazine"*; the band h2 *"Turn showing up into a magazine."*; the
spine's *"Make the scrollable magazine — together"*. All three **"portfolio"** uses:
the band's *"One beautiful portfolio."*; *"…and into your portfolio."*; the wall's *"your
portfolio"*.
- Fixing it is **net-negative length**, which is why it is worth doing: it is the only
  open item that removes words while removing confusion. Everything else trades.
- Do not attempt it section by section. That is exactly how it survived twice.

**O-2 · `#seewhat` is the page's worst dead zone.** Three lines of text, **no club name,
no craft, no maker**, arriving immediately after the band already promised the same idea
("Turn showing up into a magazine." → "See what people are doing. Then join them.").
It is currently one video of *Drawing at the Cafe* with no words attached to it.
Note: it absorbed the deleted `#reader`'s job (the door for the visitor arriving alone),
so whatever replaces it must still answer "what if I don't have a group" **without asking
the question** — those words are deliberately nowhere on the page. §R-5 is not the fix.

**O-3 · the summary band went hollow** when its second column was deleted (§R-2,
2026-08-29): one narrow list floating where two columns filled the width. The deletion
was right; the layout was never re-cut for it.

**O-4 · Photo Phloor "taking photos together" shots do not exist in either repo.**
`phloor-makers.jpg` is the **zine cover**, in both `drex-landing` and `drex-pitch-deck`,
and is captioned "night photography" on the page. Any plan that needs a photo of the club
*being a club* needs a shoot first, not a search.

---

## §P — PROCESS LESSONS

**P-1 · MEASURE THE BASELINE BEFORE YOU TOUCH ANYTHING.** Pass 1 reported −21 words. It
had **added 65** (978 → 1043). Nobody caught it until pass 2 measured properly. Record the
number in §M at the start of the pass and again at the end, with the same tool.

**P-2 · A cold reader cannot judge a FRAGMENT.** Per-unit stranger reviews were near
worthless. **The whole-page read produced every high-value finding in §C.** Budget for one
long read, not six short ones.

**P-3 · The shared headless browser gets navigated away by other sessions on this
machine.** Re-`goto` immediately before every screenshot. **A blank render is a tooling
failure, never a finding** — do not write it down as one.

**P-4 · Agent loops terminate on internal consensus, which is not effectiveness.** Six
specialists agreeing is one opinion sampled six times. The real exit condition is §F-2:
a cold test with real people.

**P-5 · A section owner cannot see a page-level defect.** §O-1 is the proof. Assign a
**global owner** whose only remit is the page as one object, and give them §O-1 by name.

**P-6 · Zero-dependency is a hard constraint, not a preference.** No npm, no pip, no
`package.json`. Python 3 stdlib or plain node. The repo serves itself with
`python3 -m http.server`.

**P-7 · Comment the REJECTED ALTERNATIVE, not the code.** House convention, and this page
is the reason it exists: nearly every dated block comment in `index.html` is a record of
a line that was tried and why it lost. That is what stops the next pass re-proposing it.
Write the same kind of comment, and mirror the one-liner into this file.

---

## §M — MEASUREMENTS LOG

**M-1 · 2026-08-29 · visible-text word counts.** Extractor: strip `<!-- -->`, strip
`<script|style|svg|head>` blocks, strip tags, unescape entities, tokenise
`[A-Za-z0-9][A-Za-z0-9'’-]*`. Ad-hoc; script lives in the pass's scratchpad, not the repo.

| file | words |
|---|---|
| `index.html` (S-2) | 941 |
| `index-next.html` (S-3) | 982 |
| `index-fielded.html` (S-4, the 1.5/15 control) | 940 |

**M-2 · THE EXTRACTOR IS THE UNIT.** These numbers are **not comparable** to the recorded
978 → 1043 from pass 1/2, which used a different (unrecorded) extraction. A word count is
only a measurement when the tool that produced it is named. When `tools/` gains a counter,
make it canonical, cite it here by path, and re-baseline all three files in one run.

**M-4 · 2026-08-29 · the four-names sweep (§R-9). Instrument: `tools/measure.py`, canonical.**

| | before | after |
|---|---|---|
| rendered words | 977 | **975** (−2) |
| distinct object names | 4 | 3 |
| zine / issue / magazine / portfolio | 15 / 13 / 4 / 3 | 3 / 23 / 2 / **0** |

The sweep started from a 991 reading taken minutes earlier; the file was at 977 by the time the
edits went in, because ANOTHER SESSION WAS EDITING THE SAME FILE (−14 elsewhere). **Measure the
snapshot you are about to edit, not the one you read an hour ago**, and diff A-vs-B with
`measure.py before.html after.html` rather than trusting a remembered number.

**M-5 · 2026-08-29 · the unused-media pass (§R-13…R-18). Instrument: `tools/measure.py`.**

| | before | after |
|---|---|---|
| `index-next.html` rendered words | 975 | **952** (−23) |
| `index.html` (live) | 963 | 963 |

First reading under the live page since the rebuild began (§M-3's standing target). The −23 is
**one copy cut (§R-14, −21)** plus two words lost to rewrapping; the media swap itself (§R-13)
is word-neutral. Six assets were named as unused; **five were rejected on evidence and only one
was placed** — see §R-15…R-18. *Check what an asset already is before proposing it: filenames
lie in this repo (`phloor-makers.jpg` is a zine cover), and three of the five rejections are
duplicate footage that only looking at the pixels reveals.*

**M-3 · the rebuild is currently 41 words LONGER than the live page** by M-1's tool, while
§F-1's loudest complaint was "too much text". Whatever else this pass does, it should not
end above 941.

---

## §APPENDING — the entry template

Append at the end of the relevant section. Keep the claim line to one sentence.

```
**X-n · YYYY-MM-DD · STATUS · one-sentence claim**
> exact quote, if the entry is about copy (paste it, never paraphrase it)
- why, and — for a rejection — what the alternative was and what killed it.
- what NEW EVIDENCE would re-open it.
```

Statuses used here: `FIXED` · `FIXED IN S-3 ONLY` · `UNFIXED` · `LATENT` ·
`SHIPPED FALSE, FIXED LOCALLY, NOT PUSHED` · `SUPERSEDED BY X-n`.

**At the end of every pass, you must have added at least:** one §M baseline (start and
end), and one entry to §R for each idea you tried and abandoned. An idea abandoned
without an §R entry will be proposed again in six days.

---

**R-19 · 2026-08-29 · REJECTED · `assets/zines/post-beta/*.jpg` (all 7) as a photo strip in
`#seewhat`.**
The brief for this pass named six unused assets. **A full audit found 21**, and the only set
that is not already recorded as rejected is `post-beta/`: `pb-3am-capp`, `pb-3am-streak`,
`pb-beans-mocha`, `pb-cafe-claire`, `pb-penman-dropcap`, `pb-silk-lavender`, `pb-silk-parasol`.
They are seven genuinely good photographs — five crafts, legible at size — and they look like
the fix for §O-2's "no club name, no craft, no maker".
- **They are the same work the page already carries, at a bigger size.** `pb-cafe-claire` is the
  same woman, top, cafe and framed horse drawing as `book-cafe-poster.jpg` (used ×3);
  `pb-3am-capp`'s Capp street sign is inside the `club-tour` video on #portfolio's club panel;
  `pb-penman-dropcap` is the Dropcaps zine the `wall-tour` video ends on; the two `pb-silk-*`
  portraits are the Silk Road 001 shoot already carried by `hero/silkroad.jpg`,
  `silk-road-cover.jpg` and `spread-silk.jpg`. That is **§R-5's kill criterion exactly** —
  a rack in #seewhat whose contents already appear elsewhere on the page.
- The real difference is SCALE, not content: the page shows issues as tall scroll strips where
  each photo renders a few pixels high, so the craft is present but never legible. **If a future
  pass wants a legible photograph, that is the argument to make** — and it is a §O-2 redesign
  needing club/craft/maker labels (words, against a 963 ceiling), not a drop-in media placement.
- What would re-open it: a decision on §O-2's copy constraint, plus a shoot that is NOT already
  on the page (§O-4 is the same problem for Photo Phloor).

**R-20 · 2026-08-29 · NOTE · the "text-heavy page with unused media" premise is FALSE.**
`index-next.html` uses **49 distinct assets** (11 maker portraits, 3 team photos, 11 hero zine
images, 6 videos, walls, spreads). Two passes have now been briefed as if the page were starved
of imagery. It is not; it is dense with it. **Every one of the six assets the brief called
"CONFIRMED UNUSED" was already resolved hours earlier** — five rejected (§R-15…§R-18) and one
placed (§R-13) — so the brief was a snapshot taken before that pass landed.
- All five rejections were **re-verified at pixel level this pass, and all five hold**:
  `zine.jpg` is the `silk-road-cover.jpg` photograph with a different quote burnt in;
  `circletime.jpg` has "CIRCLE TIME · THE DOOR'S OPEN" and "You're first in." in the pixels;
  `book-cafe-polaroid.mp4` is byte-for-byte the same 8.56s clip as `book-cafe.mp4` (identical
  frame at t=1s, 380² vs 720²); `wall.jpg` carries a `Lv.5` badge and a stale club set.
- **Re-verify the brief against this file before spending a pass on it.** §M-4's lesson
  generalises past word counts: measure the snapshot you are about to edit.

**O-5 · 2026-08-29 · OPEN, LOW PRIORITY · #portfolio's posters are on screen for about a second
on a fast connection.** Both `.pw-vid` autoplay on intersection and `loop` (measured: paused
false, t=6.0s then t=14.3s). §R-13's frame swap is still right — the poster is the first frame,
the reduced-motion frame and the lite-tier frame — but its identity job ("1.44 MB is a person,
not a file size") gets ~1s before the tour scrolls the masthead away, and mid-tour frames are the
same headless jumble R-13 set out to fix.
- **Not clearly a defect**: `preload="none"` plus a 1.3 MB `wall-tour.webm` means the poster
  holds much longer on a real connection than on localhost, which is where it was measured.
- Do not "fix" this by killing the loop without measuring on a throttled connection first.

**M-6 · 2026-08-29 · the second unused-media pass. Instrument: `tools/measure.py`.**

| | before | after |
|---|---|---|
| `index-next.html` rendered words | 928 | **928** (no edits) |

Started at **928**, not §M-5's recorded 952 — another session cut 24 words in the interval, and
`index-next.html`'s mtime moved during this pass. **No edit was made to the page**: the pass's
whole finding is that there was nothing left to place (§R-19, §R-20). Still 35 words under the
963 live-page ceiling.

---

# PASS 4 CARRY-FORWARD — written 2026-08-29 at the end of passes 1–3

## §X. HOW THE LOOP ITSELF FAILED, AND THE FIX FOR EACH

**X-1. Agents wrote to the file directly instead of returning edits.**
Four of five units in the finish pass had already applied themselves before the synthesizer
read the file, so 15 of its 39 proposed `old` strings no longer existed. It survived only
because one agent noticed and edited their output instead of re-applying. Three workflows were
live on one file at once with no lock.
FIX: agents return edits ONLY. A single applier writes. If an agent must experiment, it works
on a copy. State this in every prompt; it is not obvious to them.

**X-2. Two passes ran on a premise that was false.**
Both media briefs asserted the page was starved of imagery. It uses **49 distinct assets** and
`#portfolio` already showed both walls. The "obvious gap" did not exist.
FIX: the first instruction in any unit brief is VERIFY THE BRIEF. An agent that finds the
premise false should say so and stop, and that is a success, not a failure.

**X-3. Net-negative was claimed twice while the page grew.**
Pass 1 said −21 words; it had added 65. Pass 2 said 975-under-978; the instrument said 991.
FIX: `python3 tools/measure.py` before and after, every pass, quoted verbatim. No prose claim
about size is admissible.

**X-4. The slop lens produced false positives for two passes.**
Its catalogue was built on encyclopedic text, where promotional register IS the tell. On
marketing copy that collapses to near zero — em dashes, tricolons and enthusiasm are native to
the genre. What survives: the era-banded lexical set, structural uniformity, the appended
significance clause, and content emptiness.
FIX: use the marketing-calibrated list. Flagging an em dash on a sales page is noise.

**X-5. Per-unit cold readers were worthless.**
A stranger cannot judge a fragment. Every high-value finding — the "Join a club" bait, the four
names, `link` appearing zero times, "the recurring hour you've got people" reading as a typo —
came from a WHOLE-PAGE read.
FIX: whole-page only, and run three with different priors (never made anything / already runs a
group / arrived from Instagram). Their disagreement is the signal.

**X-6. Section-owning reviewers cannot see cross-section defects, even in principle.**
Four names for one object survived two passes because it belonged to no section.
FIX: `tools/coherence-lens.js` exists and has never been executed. Run it.

**X-7. Screenshots came back blank and nearly became findings.**
The browser is shared machine-wide and other sessions navigate it away.
FIX, state it in every visual prompt: unseal first
(`document.documentElement.classList.remove('sealed')` — the page ships SEALED and reports 83
words otherwise), re-goto immediately before every capture, retake blanks, never report one.

**X-8. The linter's best work was eliminating false positives BEFORE reporting.**
It ruled out six artifact classes — union boxes on wrapped inline spans, AABB growth from
rotation, `display:none` ancestors — and reported 22 real contrast failures instead of 60 noisy
ones.
FIX: require every lint-type agent to publish its false-positive eliminations alongside its
findings. An agent that reports raw counts has not finished.

## §Y. WHAT WORKED AND MUST BE KEPT
- The cold stranger outranking everyone. Every finding that mattered came from there.
- The claims auditor reading actual product code and ledgers, not opinion. It caught a false
  claim already shipped to production.
- Rendering assets at their ship size. That is how the signed reflection on `cover-3am.jpg` was
  found.
- Adversarial default-REJECT. Merely-plausible proposals died.
- Measurement over assertion.

## §Z. OPEN AND UNSOLVED GOING INTO PASS 4
- **Z-1. The marginalia is generated, not drawn.** `balanceMarginalia()` injects 5.2 scraps per
  1000px keyed to section HEIGHT, random ink, rotation and width, from a pool that includes
  washi tape — so tape gets dropped into empty gutters, pinning nothing. The page manufactures
  the appearance of a hand. Biggest open design question.
- **Z-2. The page documents craft it no longer has.** `.how-center` and the `.how .step::before`
  sticky notes have CSS and explaining comments but are absent from the DOM.
- **Z-3. Oats is 79.9% of painted pixels** against the book's 25% target and 45% ceiling. And
  warm cream is now itself an AI-default surface, so the palette is not differentiating.
- **Z-4. Five of six maker quotes are placeholders**, and one is now PINNED as the most
  prominent sentence in its section (`.mb-pull`, @falcon). Verify or remove.
- **Z-5. `#seewhat` at 18 words** is still the thinnest section on the page.
- **Z-6. One heading rank, two typefaces** — six h2s Space Grotesk, four Courier Prime italic.
- **Z-7. Issues render as tall scroll strips** where each photograph is a few pixels high, so
  the craft is present but never legible. Scale problem, not a content problem.
