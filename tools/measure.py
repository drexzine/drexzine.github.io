#!/usr/bin/env python3
"""measure.py — a reproducible measuring stick for the drex.style landing page.

    python3 tools/measure.py index.html
    python3 tools/measure.py index.html index-next.html    # side-by-side + delta
    python3 tools/measure.py --json index-next.html        # machine-readable

WHY THIS FILE EXISTS
--------------------
Two agent loops have edited this page. Both produced good copy. Both also produced a
structural failure that no amount of taste would have caught:

  - Pass 1 reported "trimmed 21 words". The page had actually GROWN by 65 (978 -> 1043).
    Nobody noticed until pass 2 counted properly. A claim about a number, made without
    a number.
  - The core object of the product carries FOUR names on one page (zine / issue /
    magazine / portfolio). A cold reader cannot tell whether those are four things or
    one. It survived both passes because it belonged to no single section, and every
    reviewer owned a section.

Neither failure is a taste failure, so no reviewer catches them by reading harder. They
are measurement failures, and the fix for a measurement failure is an instrument. Run
this before a pass and after it; diff the two outputs. That replaces "I think it reads
tighter now" with a signed number.

DESIGN RULE: THIS IS AN INSTRUMENT, NOT A GATE.
It always exits 0. It prints no verdicts, no grades, no "consider rewording". The moment
a measuring tool starts failing builds, people start writing copy to satisfy the tool,
and every heuristic in here is far too crude to deserve that power. Section 4 in
particular (unfalsifiable claims) is a keyword heuristic wearing a serious name — it
finds candidates for a human to look at, and it will have both false positives and false
negatives. The output says so out loud, on purpose.

ZERO DEPENDENCIES, per the repo's rule (README: "Zero-dependency, no-build"). Standard
library only: no lxml, no beautifulsoup, no html5lib. That constraint is the reason for
most of the interesting decisions below — a real HTML5 parser and a real CSS engine would
make several of these problems disappear, and we do not get to have either.
"""

import argparse
import bisect
import json
import re
import sys
from html.parser import HTMLParser


# ==============================================================================
# CONFIG — the knobs. Everything a future pass is likely to want to change lives
# here, at the top, so nobody has to read the parser to retune the report.
# ==============================================================================

# Load-bearing vocabulary. The question each answers is "does the page say this word,
# and does it say it before the reader has given up?" — hence count AND depth, never
# count alone. A word used ten times, all of them below the fold, is absent as far as
# a bouncing visitor is concerned.
#
# The defaults are the words the product's own positioning rests on. Findings this list
# was built to catch, from earlier passes: "finish" appeared once at 76% depth, "craft"
# once at 92%, "belong" once at 91%, and "link" — the thing you actually receive at the
# end — appeared zero times.
TERMS = [
    "finish", "craft", "belong", "free", "link", "deadline", "club",
    "zine", "issue", "magazine", "portfolio", "challenge", "friends", "host",
    # 2026-09-01: "get good" tracked alongside "craft". The promise moved onto the page
    # as "how you get good" while "craft" stayed at 87% depth, so tracking only "craft"
    # made a real improvement invisible to the instrument.
    "good",
]

# Synonyms that all name the SAME object. This is the metric that exists because of a
# specific defect (four names for one thing), so it is deliberately its own section with
# its own klaxon rather than something you have to infer by reading the TERMS table.
#
# To measure a different collision (say "Club Hour" vs "meetup" vs "session"), replace
# this list. The warning threshold is "more than two names in use" — see WHY below.
# 2026-08-29: "portfolio" REMOVED from this group. It is not a fourth name for the
# artefact - it names the ACCUMULATION (the body of work over time), where issue/zine/
# magazine all name the one thing you open and read. Keeping it here made the detector
# fire every time the page used the correct word for a different object, which is a
# false positive that would push an editor toward deleting the one noun makers use
# unprompted about their own work. The detector should catch synonyms, not taxonomy.
OBJECT_NAMES = ["zine", "issue", "magazine"]

# Two names for one object is often deliberate and fine: a formal name plus a casual one
# ("magazine" in the pitch, "zine" in the body) is a normal register split that readers
# handle without help. Three is where a cold reader starts building a taxonomy that does
# not exist, and asking "so what's the difference between an issue and a zine?" — a
# question the page cannot answer because there is no difference. So the threshold is
# >2, not >1. Set to 1 if you want the stricter house style.
OBJECT_NAME_WARN_ABOVE = 2

# --- Unfalsifiable-claim heuristic -------------------------------------------------
# A soft-benefit verb is only a smell when the PRODUCT is the one doing it. "Someone in
# your club sets it" is a fact about a person; "Drex helps you finish" is a claim a
# reader cannot check and therefore discounts. So the pattern is SUBJECT + VERB, and
# both halves are required.
#
# WHY THE SUBJECT LIST IS NOT OPTIONAL: matching soft verbs alone was tried first, and
# on index-next.html it returned 7 hits, of which 7 were false positives — it fired on
# "makers" (contains "make"), "letterers" (contains "let"), and "models". Requiring a
# product subject immediately before the verb took that to 0 hits on the same text,
# which is the correct answer: this page currently makes its claims through worked
# examples rather than through assertions about itself. A heuristic that cannot return
# zero on clean copy is not measuring anything.
CLAIM_SUBJECTS = [
    "drex", "we", "our", "it", "the app", "the site", "the platform", "the product",
    "the club", "your club", "clubs", "the zine", "the magazine", "the issue",
]
CLAIM_VERBS = [
    "helps", "help", "makes", "make", "enables", "enable", "lets", "let",
    "empowers", "empower", "allows", "allow", "provides", "provide",
    "gives", "give", "supports", "support", "simplifies", "simplify",
]

# --- AI-slop tells ------------------------------------------------------------------
# Reported as counts and line numbers, never as a verdict, because every single one of
# these is legitimate in the right sentence. An em dash appositive is good writing when
# it earns the interruption; it is a tell when there are nine of them and they all do
# the same job. The instrument's job is to tell you there are nine.
INTENSIFIERS = [
    "simply", "truly", "genuinely", "actually", "really", "just",
    "seamlessly", "effortlessly",
]

# Gerund-noun compounds ("unlocking potential", "building community", "fostering
# engagement") are the most reliable LLM fingerprint in marketing copy, and the hardest
# of the four to detect without a part-of-speech tagger — which would be a dependency.
#
# The trick that makes it tractable without one: the tell is not the gerund, it is the
# ABSTRACT noun after it. "Cutting paper" is concrete and fine; "cutting complexity" is
# the slop. So we match -ing followed by an abstract noun, identified either by an
# abstraction suffix or by membership in a short list of nouns that have no suffix to
# give them away. Bare "-ing + any noun" was rejected: it flags "making zines", which is
# what this entire website is about.
ABSTRACT_SUFFIXES = ("ment", "tion", "sion", "ity", "ance", "ence", "ness", "ship", "ism")
ABSTRACT_NOUNS = [
    "potential", "community", "journey", "impact", "experience", "value", "growth",
    "insight", "insights", "outcome", "outcomes", "workflow", "workflows", "synergy",
    "momentum", "clarity", "focus", "confidence", "results", "success",
]


# ==============================================================================
# EXTRACTION — HTML in, rendered text out.
# ==============================================================================
#
# THE TARGET: this must land close to what a browser's document.body.innerText yields,
# because that is the text a human actually reads, and the headline number is worthless
# if it counts things nobody sees.
#
# THE GROUND TRUTH, measured (headless Chromium, page unsealed, document.body.innerText
# split on whitespace):
#
#                        browser     this file     bias
#     index.html             944           963      +19
#     index-next.html        972           991      +19
#     delta (next - live)    +28           +28        0
#
# 2.0% high on both, and — the line that matters — THE BIAS IS THE SAME +19 ON BOTH
# FILES, so the DELTA IS EXACT. That is the property this tool is actually for. It was
# built because a pass claimed a 21-word shrink that was a 65-word growth, and catching
# that needs a correct difference, not a correct absolute. An instrument with a constant
# offset is a perfectly good instrument; one with a drifting offset is a liar. The
# residual is accounted for at the bottom of this comment, and it is not fudge: every
# remaining word is genuinely IN the markup and genuinely hidden by a CSS rule we
# cannot see, and it is the same handful of words in both files.
#
# RE-VALIDATE AFTER ANY CHANGE TO THE EXTRACTOR, and re-validate against a browser, not
# against the numbers above — they are a record of one measurement, not a target to hit:
#     python3 -m http.server 8899          # then, in a headless browser on the page:
#     document.documentElement.classList.remove('sealed')   # open the cut-gate first,
#     document.body.innerText.split(/\s+/).filter(Boolean).length
# The unseal step is not optional and is the trap: the page ships sealed, and a browser
# reports 83 words for index-next.html if you forget it. Anyone comparing that against
# this file's 991 would conclude the extractor is catastrophically broken.
#
# --- WHY NOT REGEX TAG-STRIPPING ----------------------------------------------------
# The obvious one-liner is re.sub(r'<[^>]+>', ' ', html). It was written first, and it
# is wrong by 3.8% — it returned 1049 against the browser's 972. The bug is that
# replacing EVERY tag with a space splits inline markup: <em>magazine</em>. becomes
# "magazine ." — two tokens where the browser renders one. On this page that alone
# invented 37 phantom words, mostly bare "." and "," tokens. Replacing tags with the
# empty string instead is worse in the other direction: it welds "…yourself."</q><cite>
# @tergel" into one token and UNDERcounts.
#
# The browser's actual rule is display-based: a block-level box forces a line break in
# innerText, an inline box does not. So we need the tag NAME to decide, which means a
# parser, which means html.parser. Everything below follows from that one fact.
#
# --- WHAT WE SKIP, AND WHY EACH ONE ------------------------------------------------
# script/style/svg/head/title/template/noscript: none of it is rendered prose. <svg> is
# the one worth naming, because it is the trap — this page has 58 of them and they are
# full of <title> and <text> nodes that a naive stripper counts as body copy.
#
# The `hidden` ATTRIBUTE: dropped, subtree and all. This is not a guess about CSS, it is
# the UA stylesheet ([hidden] { display: none }), so a browser genuinely does not put it
# in innerText. On this page that is the two modal dialogs (#bdModal, #deckModal) — 29
# words that a regex stripper counts and a reader never sees.
#
# --- WHAT WE CANNOT SKIP, AND WHY WE DON'T PRETEND OTHERWISE -----------------------
# CSS `display: none` from the stylesheet. app-post-beta.css has 102 display:none rules,
# and honouring them would require parsing the CSS, resolving the cascade, and knowing
# the viewport — a browser, in other words, which is the dependency we are not allowed
# to have and would not want on a metric that must be reproducible offline.
#
# So this is the honest, documented residual, and it is worth understanding rather than
# tuning away, because ALL of it is one phenomenon: the page is a state machine. The
# hero is a sealed envelope you cut open, and the stylesheet swaps content between
# `html.sealed` and `html:not(.sealed)`. Copy exists in the markup for BOTH states —
# the "cut here" prompt, the "drag me down!" hint, the waitlist/invite-only footer —
# and a browser shows you exactly one branch at a time while this counter sees both.
#
# That is the right failure for a diff tool to have. It is STABLE (the same words are
# double-counted every run, so a before/after delta is still exact) and it is
# CONSERVATIVE (it over-counts, so the page is never longer than reported). Chasing the
# last 1.9% would mean hardcoding this page's class names into a general instrument, and
# the moment the cut-gate is redesigned the correction silently becomes a lie. A stable
# known bias beats a fragile correction.
#
# --- ONE THING WE DELIBERATELY DO NOT REPRODUCE ------------------------------------
# CSS text-transform: uppercase. The browser returns "INSTAGRAM" where the source says
# "Instagram", so a case-sensitive diff against innerText looks alarming (78 mismatches
# on this page). It is entirely cosmetic: it changes no token boundaries and therefore
# no counts. Every comparison in this file is case-folded, so it cannot bite us.

# Per the HTML spec's default rendering: these generate inline boxes, so they do NOT
# force a line break in innerText. Anything not on this list is treated as block.
#
# This is a static approximation of a computed style, and it is wrong in both directions
# on any page that restyles an element — <cite> set to display:block, or a <span> made a
# grid item, will be joined here and broken by the browser. Measured cost on this page:
# a handful of glued tokens ("jul15" for a date chip, "yourself.”—" for a pull-quote
# attribution). Small, and it fails toward UNDER-counting, which partly offsets the
# state-machine over-count above. Add a tag here only if it is inline BY DEFAULT — this
# list must stay a fact about HTML, not a patch for one page's stylesheet, or it stops
# transferring to index.html.
INLINE_TAGS = {
    "a", "abbr", "b", "bdi", "bdo", "big", "button", "cite", "code", "data", "del",
    "dfn", "em", "font", "i", "ins", "kbd", "label", "mark", "nobr", "output", "q",
    "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time",
    "tt", "u", "var", "wbr",
}

SKIP_TAGS = {"script", "style", "svg", "head", "title", "template", "noscript", "math"}

# Void elements never have an end tag. They must be tracked separately or the tag stack
# desynchronises: <img> would be pushed and never popped, and every subsequent skip
# region would unwind to the wrong depth.
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
}

HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}


class RenderedTextExtractor(HTMLParser):
    """Walks the document once and emits (text, source_line, section_path) pieces.

    ONE PASS, ONE SOURCE OF TRUTH. Every metric in this file — word count, term depth,
    claim line numbers, section weights, slop line numbers — is derived from the piece
    list this builds. The alternative (a pass per metric) is how you end up with a
    section inventory whose word counts do not add up to the headline number, which is
    exactly the kind of quiet inconsistency that let the 978->1043 regression through.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)  # entities: see decode note below
        self.pieces = []       # (text, line, section_path_tuple)
        self.tag_stack = []    # (tag, is_skip_root)
        self.skip_depth = 0
        self.section_stack = []
        self.sections = []     # {id, class, line, heading, words}
        self._heading_for = None   # section index currently collecting a heading
        self._heading_buf = []
        self._in_heading = False
        self._seen_body = False

    # -- helpers ---------------------------------------------------------------
    def _emit(self, text):
        if self.skip_depth or not text:
            return
        self.pieces.append((text, self.getpos()[0], tuple(self.section_stack)))

    def _break(self):
        """Block boundary. Emits a newline, not a space.

        Word counts are identical either way (both are whitespace), but sentence
        segmentation is not: the claim and slop heuristics split on sentence
        boundaries, and without a newline here two unrelated blocks run together into
        one pseudo-sentence. That is not hypothetical — it is why the first draft of
        the claim detector "found" the sentence "start a club for your thing Join the
        waitlist MAKE A PAPER ZINE ABOUT YOUR HOBBY scroll the magazine", which is four
        separate elements and no sentence at all.
        """
        self._emit("\n")

    # -- parser callbacks ------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        if tag == "body":
            # Belt and braces. SKIP_TAGS already drops <head>, but a stray text node
            # between </head> and <body> would otherwise be counted as body copy.
            # Discarding everything seen so far is unconditionally correct and costs
            # nothing.
            self.pieces = []
            self._seen_body = True

        attr = dict(attrs)

        if tag in VOID_TAGS:
            if tag not in INLINE_TAGS:
                self._break()
            return

        # The `hidden` attribute is display:none in the UA stylesheet. Guard against
        # hidden="false", which is not how the attribute works but does appear in the
        # wild and would otherwise hide visible copy.
        is_hidden = "hidden" in attr and (attr["hidden"] or "").lower() != "false"
        is_skip_root = tag in SKIP_TAGS or is_hidden

        self.tag_stack.append((tag, is_skip_root))
        if is_skip_root:
            self.skip_depth += 1
            return

        if tag == "section":
            idx = len(self.sections)
            self.sections.append({
                "index": idx,
                "id": attr.get("id"),
                "class": attr.get("class"),
                "line": self.getpos()[0],
                "heading": None,
                "words": 0,
            })
            self.section_stack.append(idx)

        if tag in HEADING_TAGS and self.section_stack:
            owner = self.section_stack[-1]
            if self.sections[owner]["heading"] is None:
                self._in_heading = True
                self._heading_for = owner
                self._heading_buf = []

        if tag not in INLINE_TAGS:
            self._break()

    def handle_endtag(self, tag):
        if tag in VOID_TAGS:
            return

        # Unwind to the nearest matching open tag rather than assuming the document is
        # well-formed. Real HTML has unclosed <p> and stray </div>; html.parser reports
        # them verbatim and does not fix them up for us (that is exactly the service a
        # real HTML5 parser would provide, and it is the dependency we do not have).
        # Popping blindly on every end tag desynchronises skip_depth, and a
        # desynchronised skip_depth swallows the rest of the page in silence.
        for i in range(len(self.tag_stack) - 1, -1, -1):
            if self.tag_stack[i][0] == tag:
                for _, was_skip in self.tag_stack[i:]:
                    if was_skip:
                        self.skip_depth -= 1
                del self.tag_stack[i:]
                break
        else:
            return  # end tag with no matching open tag: ignore it entirely

        if tag in HEADING_TAGS and self._in_heading:
            text = " ".join("".join(self._heading_buf).split())
            self.sections[self._heading_for]["heading"] = text or None
            self._in_heading = False

        if tag == "section" and self.section_stack:
            self.section_stack.pop()

        if tag not in INLINE_TAGS:
            self._break()

    def handle_data(self, data):
        if self._in_heading:
            self._heading_buf.append(data)
        self._emit(data)

    # convert_charrefs=True handles entity decoding for us, and handles it better than a
    # hand-rolled table would: &mdash; &rsquo; &amp; &hellip; &nbsp; and every numeric
    # form (&#9654;, &#x2014;) all arrive here already decoded, via the full HTML5 named
    # character reference table. Worth stating because "decode entities" reads like a
    # thing we need code for, and the correct amount of code is zero.
    #
    # ONE CONSEQUENCE TO KNOW: &nbsp; decodes to U+00A0, which str.split() treats as
    # whitespace. So "watch on Instagram" separated by &nbsp; counts as separate words —
    # which is what a browser does too, so this is correct, not a leak.


class Document:
    """A parsed page: the rendered text, plus the maps every metric reads off it."""

    def __init__(self, path):
        self.path = path
        with open(path, encoding="utf-8") as fh:
            source = fh.read()

        parser = RenderedTextExtractor()
        parser.feed(source)
        parser.close()

        self.sections = parser.sections

        # Flatten the pieces into one string, keeping a char-offset index alongside so
        # any regex match anywhere in this file can be mapped back to a source line.
        # Building this once is what lets the slop and claim detectors report line
        # numbers without re-parsing.
        chunks, starts, meta = [], [], []
        pos = 0
        for text, line, sect in parser.pieces:
            chunks.append(text)
            starts.append(pos)
            meta.append((line, sect))
            pos += len(text)
        self.text = "".join(chunks)
        self._starts = starts
        self._meta = meta

        # Tokens are whitespace-separated runs, which is the definition the brief asks
        # for and the same one document.body.innerText.split(/\s+/) uses.
        self.tokens = []       # normalised word, lowercase, punctuation-stripped
        self.raw_tokens = []
        self.token_lines = []
        self.token_sections = []
        for m in re.finditer(r"\S+", self.text):
            line, sect = self._at(m.start())
            self.raw_tokens.append(m.group(0))
            self.tokens.append(self._normalise(m.group(0)))
            self.token_lines.append(line)
            self.token_sections.append(sect)

        self.word_count = len(self.raw_tokens)

        for sect in self.sections:
            sect["words"] = sum(1 for s in self.token_sections if sect["index"] in s)
        self.unsectioned_words = sum(1 for s in self.token_sections if not s)

    def _at(self, offset):
        i = bisect.bisect_right(self._starts, offset) - 1
        return self._meta[i] if i >= 0 else (0, ())

    def line_at(self, offset):
        return self._at(offset)[0]

    @staticmethod
    def _normalise(token):
        # Strip leading/trailing punctuation so "magazine." and "(magazine" both match
        # the term "magazine", but keep INTERNAL punctuation so "invite-only" and
        # "it's" stay single words. Curly apostrophes are in the class because this page
        # uses them exclusively (&rsquo;), and a stripper that only knows ASCII ' would
        # leave a trailing ” on every closing quote.
        return token.strip("\"'“”‘’.,;:!?()[]{}—–-…·→×©").lower()


# ==============================================================================
# METRICS
# ==============================================================================

def _term_pattern(term):
    """Match a term and its short inflections, and nothing else.

    Exact matching was rejected after measuring it: on index-next.html "finish" occurs
    0 times exactly and 3 times as "finished", and "friends" is present only in the
    plural. Reporting "finish: 0" there is a false negative that sends a writer to add
    a word the page already has.

    Unbounded stemming (finish\\w*) was rejected in the other direction: it lets "club"
    swallow "clubhouse" and "art" swallow "artisan", quietly inflating exactly the
    counts this tool exists to be trusted on.

    Three trailing letters is the sweet spot — it covers -s, -es, -ed, -ing, which is
    every inflection these words actually take on this page, and stops well short of
    compounds. Known and accepted leak: "free" also matches "freely" and "freedom".
    """
    return re.compile(r"^" + re.escape(term) + r"[a-z]{0,3}$")


def term_stats(doc, terms):
    out = []
    total = max(doc.word_count, 1)
    for term in terms:
        pat = _term_pattern(term)
        hits = [i for i, tok in enumerate(doc.tokens) if pat.match(tok)]
        out.append({
            "term": term,
            "count": len(hits),
            # Depth is a percentage of the RENDERED TEXT, not of the file and not of
            # scroll height. It answers "how much reading does it take to reach this
            # word", which is the reader-facing question. Pixel depth would be a
            # different and also useful metric, and it needs a browser.
            "first_depth": (hits[0] / total * 100) if hits else None,
            "first_line": doc.token_lines[hits[0]] if hits else None,
            "forms": sorted({doc.tokens[i] for i in hits}),
        })
    return out


def object_collision(doc, names):
    stats = term_stats(doc, names)
    in_use = [s for s in stats if s["count"] > 0]
    return {
        "names": stats,
        "distinct_in_use": len(in_use),
        "warn": len(in_use) > OBJECT_NAME_WARN_ABOVE,
    }


def _sentences(doc):
    """Split rendered text into sentence-ish spans, keeping char offsets for line lookup.

    Block boundaries (newlines) end a sentence just as firmly as a full stop does — on
    a landing page most "sentences" are a heading or a button label with no terminal
    punctuation at all, and running them together produces sentences that exist in no
    reader's experience.
    """
    for m in re.finditer(r"[^.!?\n]+[.!?]*", doc.text):
        s = m.group(0).strip()
        if s:
            yield s, m.start() + (len(m.group(0)) - len(m.group(0).lstrip()))


def unfalsifiable_claims(doc):
    subj = "|".join(sorted((re.escape(s) for s in CLAIM_SUBJECTS), key=len, reverse=True))
    verb = "|".join(sorted((re.escape(v) for v in CLAIM_VERBS), key=len, reverse=True))
    # \b on both ends is the whole ballgame: without it "let" matches inside "letterers"
    # and "make" inside "makers", which is how the unbounded first draft scored 7/7 false
    # positives on this page.
    pat = re.compile(r"\b(" + subj + r")\s+(" + verb + r")\b", re.IGNORECASE)
    found = []
    for sentence, offset in _sentences(doc):
        m = pat.search(sentence)
        if m:
            found.append({
                "line": doc.line_at(offset + m.start()),
                "match": m.group(0),
                "sentence": " ".join(sentence.split())[:110],
            })
    return found


def slop_tells(doc):
    text = doc.text
    tells = {}

    def collect(key, pattern, flags=re.IGNORECASE):
        hits = []
        for m in re.finditer(pattern, text, flags):
            hits.append({
                "line": doc.line_at(m.start()),
                "match": " ".join(m.group(0).split())[:70],
            })
        tells[key] = hits

    # An appositive is the PAIR — "the thing, — an aside — that does the work". A lone em
    # dash is ordinary punctuation, so both are reported: the pair count is the tell, the
    # total is context for it.
    collect("em_dash_appositive", r"\w+\s*—[^—\n]{1,60}—\s*\w+")
    collect("em_dash_total", r"—")
    # Bounded to one clause. Unbounded, "not" and "but" find each other across three
    # sentences and every page on earth scores badly.
    collect("not_x_but_y", r"\bnot\b[^.!?\n]{1,70}?\bbut\b")
    collect("intensifier", r"\b(" + "|".join(INTENSIFIERS) + r")\b")
    abstract = "|".join(re.escape(n) for n in ABSTRACT_NOUNS)
    collect(
        "gerund_noun",
        r"\b\w{3,}ing\s+(?:\w+(?:" + "|".join(ABSTRACT_SUFFIXES) + r")|" + abstract + r")\b",
    )
    return tells


def measure(path):
    doc = Document(path)
    return doc, {
        "file": path,
        "word_count": doc.word_count,
        "terms": term_stats(doc, TERMS),
        "object_collision": object_collision(doc, OBJECT_NAMES),
        "claims": unfalsifiable_claims(doc),
        "sections": doc.sections,
        "unsectioned_words": doc.unsectioned_words,
        "slop": slop_tells(doc),
    }


# ==============================================================================
# RENDERING
# ==============================================================================
# Plain ASCII, fixed columns, no colour. Colour codes are the reason so much tool output
# is unreadable when redirected to a file or pasted into a review — and the primary use
# of this tool is `measure.py > before.txt`, edit, `measure.py > after.txt`, `diff`.

W = 78


def rule(ch="="):
    return ch * W


def head(title):
    return "\n".join([rule("="), title, rule("=")])


def signed(n):
    """Sign always shown, and shown for zero too.

    The entire reason this tool exists is a pass that reported a shrink when the page
    had grown. "+65" and "-21" must be impossible to skim past, so a bare number is
    never printed in a delta column.
    """
    return f"{n:+d}" if isinstance(n, int) else f"{n:+.1f}"


def fmt_depth(d):
    return "  --  " if d is None else f"{d:5.1f}%"


def bar(depth, width=20):
    """Where in the page the word first lands. A picture beats a number for this one:
    a column of bars makes a page whose vocabulary all arrives in the last third
    visible at a glance, which is precisely the 'craft at 92%' finding."""
    if depth is None:
        return "." * width
    pos = min(width - 1, int(depth / 100 * width))
    return "." * pos + "#" + "." * (width - pos - 1)


def render_single(res):
    L = []
    L.append(head(f"  RENDERED TEXT MEASUREMENT — {res['file']}"))
    L.append("")
    L.append(f"  RENDERED WORD COUNT{'':>36}{res['word_count']:>6}")
    L.append("")
    L.append("  (Approximates document.body.innerText. Counts markup hidden by CSS")
    L.append("   display:none, which on a page with show/hide states means some copy")
    L.append("   is counted in both states. Stable run to run, so deltas stay exact.)")

    L.append("")
    L.append(rule("-"))
    L.append("  1. FIRST-APPEARANCE DEPTH   (0% = top of page, 100% = bottom)")
    L.append(rule("-"))
    L.append(f"  {'term':<12}{'count':>6}  {'first at':>8}  {'line':>6}  {'top':<20}bottom")
    for t in res["terms"]:
        forms = ""
        if len(t["forms"]) > 1 or (t["forms"] and t["forms"][0] != t["term"]):
            forms = "  as: " + ", ".join(t["forms"])
        line = f"{t['first_line'] or '-':>6}"
        L.append(f"  {t['term']:<12}{t['count']:>6}  {fmt_depth(t['first_depth']):>8}  "
                 f"{line}  {bar(t['first_depth'])}{forms}")

    oc = res["object_collision"]
    L.append("")
    L.append(rule("-"))
    L.append("  2. OBJECT-NAME COLLISION    (names for one and the same thing)")
    L.append(rule("-"))
    for t in oc["names"]:
        L.append(f"  {t['term']:<12}{t['count']:>6}  {fmt_depth(t['first_depth']):>8}  "
                 f"{(t['first_line'] or '-'):>6}  {bar(t['first_depth'])}")
    L.append("")
    if oc["warn"]:
        L.append("  " + "!" * (W - 4))
        L.append(f"  !! {oc['distinct_in_use']} DIFFERENT NAMES ARE IN USE FOR ONE OBJECT.")
        L.append("  !! A cold reader cannot tell whether these are one thing or "
                 f"{oc['distinct_in_use']}.")
        L.append("  !! Pick one primary name; make every other use visibly a synonym.")
        L.append("  " + "!" * (W - 4))
    else:
        L.append(f"  OK — {oc['distinct_in_use']} name(s) in use "
                 f"(warns above {OBJECT_NAME_WARN_ABOVE}).")

    L.append("")
    L.append(rule("-"))
    L.append("  3. UNFALSIFIABLE CLAIMS     (HEURISTIC — product-subject + soft verb)")
    L.append(rule("-"))
    if not res["claims"]:
        L.append("  none found.")
    for c in res["claims"]:
        L.append(f"  line {c['line']:<6} [{c['match']}]")
        L.append(f"    {c['sentence']}")
    L.append("")
    L.append("  Keyword heuristic, not a parser: it has false positives and false")
    L.append("  negatives. A claim a reader cannot check gets discounted as marketing;")
    L.append("  these are candidates to replace with something checkable.")

    L.append("")
    L.append(rule("-"))
    L.append("  4. SECTION INVENTORY        (document order — where the weight sits)")
    L.append(rule("-"))
    L.append(f"  {'line':>6}  {'words':>6}  {'%':>5}  section")
    total = max(res["word_count"], 1)
    for s in res["sections"]:
        name = s["id"] and f"#{s['id']}" or (s["class"] and f".{s['class'].split()[0]}") or "(anon)"
        heading = s["heading"] or "(no heading)"
        L.append(f"  {s['line']:>6}  {s['words']:>6}  {s['words'] / total * 100:>4.0f}%  "
                 f"{name:<16} {heading[:36]}")
    L.append(f"  {'':>6}  {res['unsectioned_words']:>6}  "
             f"{res['unsectioned_words'] / total * 100:>4.0f}%  "
             f"{'(outside any <section>)':<16}")
    L.append("  Nested sections count toward every section they sit in, so these need")
    L.append("  not sum to the headline number.")

    L.append("")
    L.append(rule("-"))
    L.append("  5. AI-SLOP TELLS            (counts and locations, not verdicts)")
    L.append(rule("-"))
    for key, label in [
        ("em_dash_appositive", "em-dash appositives"),
        ("em_dash_total", "em dashes (total)"),
        ("not_x_but_y", "'not X but Y'"),
        ("intensifier", "empty intensifiers"),
        ("gerund_noun", "gerund-noun compounds"),
    ]:
        hits = res["slop"][key]
        lines = ", ".join(str(h["line"]) for h in hits[:12])
        if len(hits) > 12:
            lines += ", ..."
        L.append(f"  {label:<24}{len(hits):>4}   {'lines: ' + lines if hits else ''}")
        if key != "em_dash_total":
            for h in hits[:5]:
                L.append(f"      line {h['line']:<6} {h['match']}")
    L.append("")
    return "\n".join(L)


def render_dual(a, b):
    """Both columns and a signed delta on every metric.

    The delta column is the product. Everything else here is available by running the
    tool twice; what could not be gotten any other way is the sign, sitting next to the
    two numbers it was computed from, where a claim of "I trimmed it" can be checked in
    one glance instead of trusted.
    """
    L = []
    L.append(head("  RENDERED TEXT MEASUREMENT — A vs B"))
    L.append(f"  A = {a['file']}")
    L.append(f"  B = {b['file']}")
    L.append("")
    L.append(f"  {'metric':<34}{'A':>8}{'B':>8}{'delta (B-A)':>14}")
    L.append(rule("-"))
    d = b["word_count"] - a["word_count"]
    L.append(f"  {'RENDERED WORD COUNT':<34}{a['word_count']:>8}{b['word_count']:>8}"
             f"{signed(d):>14}")
    pct = d / a["word_count"] * 100 if a["word_count"] else 0.0
    L.append(f"  {'  as % of A':<34}{'':>8}{'':>8}{signed(pct) + '%':>14}")

    L.append("")
    L.append(rule("-"))
    L.append("  1. FIRST-APPEARANCE DEPTH")
    L.append(rule("-"))
    L.append(f"  {'term':<12}{'A n':>5}{'A at':>8}{'B n':>6}{'B at':>8}"
             f"{'d n':>7}{'d depth':>10}")
    bmap = {t["term"]: t for t in b["terms"]}
    for ta in a["terms"]:
        tb = bmap[ta["term"]]
        dn = tb["count"] - ta["count"]
        if ta["first_depth"] is None or tb["first_depth"] is None:
            dd = "  --  "
        else:
            dd = signed(tb["first_depth"] - ta["first_depth"]) + "%"
        L.append(f"  {ta['term']:<12}{ta['count']:>5}{fmt_depth(ta['first_depth']):>8}"
                 f"{tb['count']:>6}{fmt_depth(tb['first_depth']):>8}"
                 f"{signed(dn):>7}{dd:>10}")

    L.append("")
    L.append(rule("-"))
    L.append("  2. OBJECT-NAME COLLISION")
    L.append(rule("-"))
    oa, ob = a["object_collision"], b["object_collision"]
    L.append(f"  {'distinct names in use':<34}{oa['distinct_in_use']:>8}"
             f"{ob['distinct_in_use']:>8}"
             f"{signed(ob['distinct_in_use'] - oa['distinct_in_use']):>14}")
    bn = {t["term"]: t for t in ob["names"]}
    for ta in oa["names"]:
        tb = bn[ta["term"]]
        L.append(f"  {'  ' + ta['term']:<34}{ta['count']:>8}{tb['count']:>8}"
                 f"{signed(tb['count'] - ta['count']):>14}")
    for tag, oc in (("A", oa), ("B", ob)):
        if oc["warn"]:
            L.append(f"  !! {tag}: {oc['distinct_in_use']} names for one object — "
                     "a cold reader cannot tell them apart.")

    L.append("")
    L.append(rule("-"))
    L.append("  3, 4, 5. CLAIMS / SECTIONS / SLOP")
    L.append(rule("-"))
    rows = [("unfalsifiable claims", len(a["claims"]), len(b["claims"])),
            ("sections", len(a["sections"]), len(b["sections"]))]
    for key, label in [
        ("em_dash_appositive", "em-dash appositives"),
        ("em_dash_total", "em dashes (total)"),
        ("not_x_but_y", "'not X but Y'"),
        ("intensifier", "empty intensifiers"),
        ("gerund_noun", "gerund-noun compounds"),
    ]:
        rows.append((label, len(a["slop"][key]), len(b["slop"][key])))
    for label, va, vb in rows:
        L.append(f"  {label:<34}{va:>8}{vb:>8}{signed(vb - va):>14}")

    L.append("")
    L.append("  Per-line detail is in single-file mode: measure.py <one-file>")
    L.append("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(
        description="Reproducible copy metrics for the drex.style landing page.")
    ap.add_argument("files", nargs="+", metavar="FILE", help="one file, or two to diff")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    results = []
    for path in args.files[:2]:
        try:
            _, res = measure(path)
        except OSError as exc:
            # Print and carry on rather than raising. An instrument that dies on a bad
            # path in two-file mode throws away the good half of the measurement.
            print(f"could not read {path}: {exc}", file=sys.stderr)
            continue
        results.append(res)

    if not results:
        return

    if args.json:
        print(json.dumps(results[0] if len(results) == 1 else results,
                         indent=2, ensure_ascii=False))
    elif len(results) == 2:
        print(render_dual(results[0], results[1]))
    else:
        print(render_single(results[0]))


if __name__ == "__main__":
    # ALWAYS 0. See the header: this measures, it does not judge. A non-zero exit would
    # invite someone to wire it into CI, and then the page gets written to please the
    # heuristics in this file instead of to please a reader.
    #
    # The try/except is not decoration. argparse calls sys.exit(2) on a usage error, so
    # `main(); sys.exit(0)` still exits 2 when run with no arguments — measured, not
    # assumed. A usage error exiting 2 is defensible on its own terms, but "always 0"
    # is only a useful guarantee if it holds without an asterisk: the first time this
    # is called from a shell script with a mistyped path and takes the whole script
    # down with it, the guarantee was worth nothing. Errors still print to stderr and
    # are still visible; only the status code is flattened.
    try:
        main()
    except SystemExit:
        pass
    sys.exit(0)
