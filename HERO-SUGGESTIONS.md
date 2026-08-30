# HERO-SUGGESTIONS.md

Written 2026-08-29 for a cold morning read. **Nothing in this pass was edited.** The hero
is untouchable by your instruction; this file is the options, ranked, with what each one
actually costs measured rather than guessed.

Every candidate below was rendered on a throwaway copy in `/tmp` at 390×844 and 1440×900
and measured with `tools/measure.py`. Where I say "fits" or "breaks", I looked.

---

## THE ONE-PARAGRAPH VERSION

The fold is fine. The reader who said it got them "about 70% there" was right, and the
missing 30% is **one fact the page never states in words a reader can see: the thing you
make is a web page you open at a link.** I checked. In the rendered text of
`index-next.html`, `scrollable` appears **0 times**, `URL` **0 times**, `phone` **0 times**,
and `link` twice — both below the fold, the first at 28.8% depth. Meanwhile the picture
next to the headline says PAPER three times in the same red, and holds that state for
**77 seconds**.

So the cheapest fixes are not copy fixes. **My top two recommendations change zero words.**
The best copy option costs one word and is a fold line, so it should be fielded, not shipped.

---

## 1. VERIFYING THE BRIEF (do this before believing the rest)

| brief said | against the file |
|---|---|
| "SCROLLABLE appears once, halfway down the page" | **FALSE — it appears zero times in visible copy.** It survives only in a JSON-LD FAQ answer (`:253`), which no reader reads, and in three block comments. The reader's note "the fold should probably steal it" is *more* urgent than it sounded: there is nothing to steal it from. |
| hero captioned "make a paper zine about your hobby" while a link beneath says "scroll the issue" | **TRUE, and worse than stated.** See §2. |
| "The three lines are load-bearing in the meta, og and twitter descriptions too" | **HALF TRUE.** The H1 and line two are quoted verbatim in three meta strings (`:112`, `:114`, `:130`). **Line three is in none of them** — the meta continues with the summary band's three fragments instead. This matters: it makes line three the only fold line with zero downstream cost. |
| current word count | **992** (`python3 tools/measure.py index-next.html`, run at the top of this pass). Ceiling 963, target ≤900. `document.body.innerText` after un-sealing says 968; both are right, they measure different things (§R-12). **Another session was editing `index-next.html` during this pass** — `git status` showed it modified — so re-measure before acting. |

---

## 2. THE DIAGNOSIS, IN ONE PICTURE

At 390×844, the fold as a stranger meets it, top to bottom:

1. **Clubs run their own magazine.**
2. Each issue is a new `CHALLENGE` with a deadline.
3. *Accountability buddies with* `something to show!`
4. Join the waitlist
5. A red Dymo label: **MAKE A PAPER ZINE ABOUT YOUR HOBBY**
6. Inside the picture, a second red slab: **THE CHALLENGE: MAKE A PAPER ZINE**
7. A drawn pair of **scissors**
8. …and then, clipped off the bottom edge, the yellow post-it: *scroll the issue*

Three print signals, all above the one web signal, which is cut off. On desktop the post-it
is visible but small and low. **A reader is not confused because the copy is unclear. They
are confused because the picture argues the opposite of the truth**, and the picture is
bigger.

Two compounding facts, both verified in the code:

- **The paper state lasts 77 seconds.** The plate's layer 0 is `zinemachine.mp4` (77s), and
  `app-post-beta.js:3022` sets `dwellMs = Math.max(6000, (v.duration + 3) * 1000)` — about
  80 seconds — and layer 1 is another video (`cafe.mp4`, 24s). The first *scrolling issue*
  (`hero/silkroad.jpg`) is layer 2, so it arrives around **100 seconds in**. Nobody is there.
- **The page already decided this, on a premise that has since gone false.** The comment at
  `:603` records why "scrollable" left the headline on 2026-08-17: *"'online' disambiguates
  URL-not-paper without spending a word on 'scrollable', which the moving spreads below
  demonstrate for free in 200ms."* The moving spreads no longer demonstrate it in 200ms. They
  demonstrate it in 100 seconds, behind two videos of people cutting paper. **That is the new
  evidence LOOP-FINDINGS §R requires to re-open a rejected idea** — and it argues for fixing
  the picture first, not for putting the word back.

---

## 3. THE SUGGESTIONS, RANKED

### S1 · Make the plate show a scrolling issue within ten seconds — **zero words** ⭐ ship

**What changes:** not a word of copy. One number in `app-post-beta.js:3022`:

```
dwellMs = Math.max(6000, (v.duration + 3) * 1000);      // today: ~80s on layer 0
dwellMs = Math.min(12000, Math.max(6000, (v.duration + 3) * 1000));   // proposed
```

so the first hand-off happens at ~12s instead of ~80s, and reorder the layers so the layer
after the Zine Machine clip is a **scroll strip** (`hero/silkroad.jpg`, already `loading="eager"`)
rather than `cafe.mp4`.

**What it fixes:** the whole missing 30%, without a word. Within fifteen seconds the reader
sees people making a paper thing *and then sees a real issue scroll* — which is the actual
product, demonstrated rather than claimed. It restores the exact premise the word "scrollable"
was cut on in the first place.

**What it risks:** the Zine Machine clip is the best 77 seconds on the page and cutting it at
12s leaves it unfinished. Mitigation: it already loops back round; a reader who wants it can
step to it with the chevrons, which give a 20s courtesy dwell.

**How to field it:** you don't. This is a defect against the page's own stated design intent,
recorded in its own comment. Ship it and watch scroll depth.

---

### S2 · Put "scroll the issue" above the fold on a phone — **zero words** ⭐ ship

**What changes:** the `.zc-note` post-it moves to the **top** of the plate under ~430px,
the way `.zc-tag` (the green door) already does — the markup comment at `:1263` sets that
precedent explicitly, for the same reason: *"at the foot of a 473px-tall cover it would land
exactly where the button it replaces used to sit, which is under the fold."*

**What it fixes:** the fold's only web-verb currently falls off the bottom of a phone screen.
This costs nothing and puts *scroll* on the fold.

**What it risks:** two paper objects (post-it + green door) crowding the plate's top corner on
a phone. Check them together at 360, 390 and 430.

**How to field it:** you don't. Look at it on your own phone and decide in five seconds.

---

### S3 · Put a date on the picture — **zero words** ⭐ ship

The one thing ~15 real people understood at Manny's was **the deadline**, and several said
unprompted that it should *lead* and be *bigger* (§F-1). Today "deadline" is the last,
deliberately unmarked word of line two, and **nothing on the fold carries a date**.

The fix is not a fourth type mark — the file's own argument at `app-post-beta.css:6991` is
right that another mark would empty the three that are there. The fix is the **picture**:
the spine below already owns a red `due` tab (`.dd-due-tab`, `:1926`) and a `due friday`
stamp (`.cm-due`, `:2100`). Put one on the plate.

**What it fixes:** promotes the only thing that ever landed with strangers, in a drawn object
rather than a word, on the fold, at zero word cost. It also puts a second non-print signal
next to the paper video.

**What it risks:** a real date on the fold is a claim that rots (see §K-1 and §K-3 — this page
has been burned twice by dated claims going stale). Use the club's live date from the carousel
data, or a relative stamp, never a hardcoded one.

---

### S4 · Fix the share card — **zero words, and it is the hero most people meet first**

`assets/og.png` is what renders on every link to drex.style, and it is the **retired
headline**: *"Show-and-tell with deadlines. / Join or create a club that answers its own
challenges with a magazine."* That fold was replaced on 2026-08-24. So anyone who shares
the link shows a stranger one hero and lands them on a different one. `og:image:alt`,
`og:title` and `twitter:title` all still describe the old card too.

Note the irony worth keeping: **the retired card leads with DEADLINES**, which is exactly
what the field test said to do.

**How to field it:** you don't. Re-render `og-card.html` against the current three lines.

---

### S5 · "Each **scrollable** issue is a new challenge with a deadline." — +1 word · **test before shipping**

**Exact proposed line:** Each scrollable issue is a new `challenge` with a `deadline`.

**Measured:** 992 → **993** words. Fits at 390×844 in the same two lines as today — the block
height, the plate position and the CTA position are **pixel-identical** to the control. Fits at
1440×900 with no reflow. No layout cost at all.

**What it fixes:** the missing 30%, in words, in the one place a stranger is guaranteed to read
it, attached to the correct noun. It does not say HOW anything works, so it does not violate
the §F-1 rule.

**What it risks:**
- It is a fold line and it is quoted verbatim in three meta strings. Changing it means editing
  `:112`, `:114`, `:130` in the same commit or the meta silently drifts (§K-5's failure mode).
- "scrollable" is a slightly technical adjective on a page whose every other noun is ordinary.
  The 2026-08-17 note removed it for exactly that reason.
- It front-loads an adjective onto the mechanism line, which flattens it a little.

**How to field it:** this is the two-arm test worth paying for. Same prompt as Manny's — *"who
are we, what do we do, do you see value"* — but add one question at the end: **"what do you
actually end up with, and where is it?"** That question is the whole hypothesis. If the control
arm cannot answer "a web page at a link" and the treatment arm can, ship it. ~10 people per arm.

---

### S6 · "A creative posse with something to show!" — +1 word, **zero meta cost** · **test before shipping**

**Exact proposed line:** *A creative posse with* `something to show!`

**Measured:** 992 → **993** words ("A creative posse" is three words to "Accountability
buddies"' two). But it is **six characters shorter**, and that buys something real: at 390px
it sets on **one line instead of two**, which lifts the whole plate ~28px and — measured —
**pulls "scroll the issue" fully above the fold on a phone without touching anything else.**
It also restores the payoff rag the line-three note recorded as lost: *"a short line three
under a long line two was the payoff shape no CSS could buy."* This wording is that shape.

**What it fixes:** register. "Accountability buddies" is productivity-app vocabulary on a page
made of paper, which the file already concedes and accepts. It swaps gym-partner baggage for
aspiration, and keeps every structural job: still people, still ends on **show**, still the
exclamation carrying the payoff beat.

**What it risks:**
- **These are your own verbatim words** (2026-08-26). That is a real cost and only you can price it.
- "Posse" is 90s slang to some ears and has policing/vigilante overtones in US English to
  others. It is the single most testable word on the page and has never been tested.
- It goes singular where the current line is plural, so it stops mirroring the H1's "Clubs" and
  starts mirroring *the reader's* group. I think that is an improvement; it is a change.
- **One side effect, measured:** the `.ed-point` arrow is absolutely positioned at the right
  edge of the line-three block, not to the end of the text. With a shorter line three it detaches
  — a ~40px gap opens between "show!" and the arrow at 1440. Geometry is otherwise identical
  (arrow 46px, block right edge 545px, both arms). One CSS fix: anchor it to the inline end of
  `.hl`. It cannot bite under 900px, where the arrow is hidden.

**How to field it:** cheapest test on the page — no meta to move, no layout to re-derive. Run it
as the second arm alongside S5 if you are testing anyway; ask which line makes them want it,
not which they understand.

---

### S7 · "Get good in community" — **not for the H1. For the sealed line.**

Your cofounder's phrase is the tightest what-statement anyone has written, and it should not
be spent on the H1: the H1's job is to name the **artifact** ("magazine"), and "Get good in
community" names the benefit and drops the object. A stranger who reads only that line has no
idea a thing gets made.

Where it fits is the **cut-hook** — `.cut-hook-line` at `:1341`, currently *"Make friends by
making with them."* That is the **only readable copy while the envelope is sealed**, i.e. the
literal first sentence of the page, and it is **not one of your three frozen lines.** Its stated
job is belonging, which is the same job.

**Exact proposed line:** Get good in community.

**What it fixes:** it is shorter, it is plainer, and "get good" states a benefit the current
line only implies. −2 words.

**What it risks:** the current line has an active verb and a warmth the swap loses; "in
community" is a slightly in-group construction. And the sealed state is pre-cut, so it is the
line doing the work of *earning the drag* — a benefit statement may earn that less well than
an invitation does.

**How to field it:** A/B the drag-completion rate. This is the one line on the fold with a
built-in behavioural metric, which makes it the cheapest thing on the page to test honestly.

---

### S8 · What I would NOT do: put "scrollable" in the H1 — **it breaks the layout** ✗

Recording this so nobody spends another pass on it.

**Tested wording:** Clubs run their own scrollable magazine.

**Measured result: hard layout break at 390×844.** `.nb` welds "own …magazine." into a single
nowrap unit, so the added word makes that unit wider than the card: the H1 runs off the right
edge, and the overflow drags line two, line three and the whole plate off-screen with it. The
markup warns about exactly this at `:766` — the type ramp was re-derived for the binding line
`"Clubs run their "` at `app-post-beta.css:3715`, `:6263` and `:6954`. Any word added to the H1
requires re-deriving all three plus re-cutting the weld. It also costs three meta strings, two
titles and the `og:image:alt`.

Also tested and **not recommended**: *"Each issue is a new challenge with a deadline, at a link."*
(+3 words, fits, but "at a link" attaches to the nearest noun and reads for a beat as though the
*deadline* is at a link).

---

## 4. WHAT MUST NOT CHANGE, AND WHY

- **"their own" in the H1.** It does two jobs nothing else does: it forecloses the
  prompt-app misread, and it carries authorship — the club writes its own challenges — which
  is why line two no longer has to.
- **"deadline" in line two.** The only element ~15 real strangers understood. Make it bigger
  with a picture (S3), never smaller with an edit.
- **The fold says WHAT, never HOW.** The version that carried "How show-and-tell works:"
  scored 1.5 / 15. Any suggestion that moves mechanism above the fold is a proposal to rebuild
  that page.
- **Three lines, not four.** Every measurement above assumes the plate's position; a fourth
  line pushes it under the fold on a phone.
- **Line three ends on "show".** The show-and-tell verb is the fold's last word. S6 keeps it;
  anything that doesn't, drop.
- **Do not change the H1 and the meta separately.** `:112`, `:114`, `:130` quote it verbatim,
  plus `og:title`, `twitter:title` and `og:image:alt`, which have **already drifted** (S4).
  Six strings, one commit.
- **The word "zine" stays off the fold's copy.** The whole page's taxonomy was rebuilt around
  the H1's two nouns (magazine + issue) precisely because the H1 is frozen. Changing the H1's
  nouns re-opens a page-wide sweep.

---

## 5. IF YOU ONLY DO ONE THING

**S1.** The fold's problem is that a picture of paper is arguing against it for the first
minute and a half. Nothing you can write in the three lines wins that argument as cheaply as
letting the reader watch a real issue scroll ten seconds in — and it is the only item here
that costs no words, no meta, no layout, and no field test.

---

## APPENDIX · HOW THESE WERE MEASURED

- `python3 tools/measure.py index-next.html` → **992 rendered words** (start of pass; no edits
  made, so also the end of pass). Candidate copies measured with the same tool: S5 993, S6 993,
  S8-H1 993, "at a link" 995.
- Rendered-text facts from `document.body.innerText` after
  `document.documentElement.classList.remove('sealed')` at 1440×900: 968 words, `scrollable` 0,
  `scroll` 1, `URL` 0, `phone` 0, `link` 2 (both below the fold).
- Candidates built as throwaway copies under the session scratchpad with the repo's assets
  symlinked, served on port 8932. **`index-next.html` and `app-post-beta.css` were not touched.**
- Screenshots at 390×844 and 1440×900, un-sealed first, re-navigated immediately before each
  capture, blanks retaken.
- Two things I noticed outside this unit and did not act on: **`portfolio` is not dead** —
  `measure.py` reports 3 uses, first at 18.2% depth, `:1480` reads *"A portfolio, so you can
  see you got better."*, so LOOP-FINDINGS §R-9's "portfolio = KILLED, 0 uses" is stale; and
  another session had `index-next.html` and `app-post-beta.css` modified while this ran.
