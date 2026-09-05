#!/usr/bin/env python3
"""substitution.py — the founder's own test, made falsifiable.

    python3 tools/substitution.py              # full report
    python3 tools/substitution.py --json
    python3 tools/substitution.py --corpus     # just dump the corpus with sources

WHAT THIS IS
------------
The founder's argument, stated in Slack 2026-09-02:

    "flatten it to plain words and it's 'we help you improve your craft in a group, and
     maybe turn it into a career.' any of those could say that word for word. ...
     a bootcamp can't say 'clubs run their own magazine, each issue a challenge with a
     deadline', not because we won a comparison but because that isn't what a bootcamp
     is. differentiation is a byproduct of naming the thing."

That is a testable claim about a SENTENCE, not about a market. It says: a headline's
worth is inversely proportional to how many other companies could truthfully print it.
This file operationalises it against a hand-collected corpus of 27 real landing pages
fetched 2026-09-02, and it can come back NEGATIVE.

HOW IT CAN FAIL — DECLARED IN ADVANCE, BEFORE THE NUMBERS WERE COMPUTED
-----------------------------------------------------------------------
The hypothesis ("naming the mechanism differentiates; promising an outcome does not")
is FALSIFIED if any of these hold:

  F1. PORTABILITY COLLAPSE. The current Drex H1 is truthfully sayable by >= 6 of 27
      competitors (>=22%). Then the fold is a promise wearing a mechanism's clothes and
      the founder's fold is no better than the flattened form it replaced.

  F2. NO SEPARATION. The flattened form ("improve your craft in a group, maybe a
      career") scores within 4 competitors of the current H1. Then the rewrite bought
      nothing and the founder is arguing about wording after all, which she says she
      isn't.

  F3. REVERSE SYMMETRY BREAKS. Drex can truthfully say >= 60% of competitor H1s. A
      headline set that Drex can mostly wear is a set of headlines that name nothing —
      but if Drex can wear them, so can everyone, and "naming" is not what separates
      the sayable from the unsayable. The interesting result requires that the H1s Drex
      CANNOT say are the mechanism-naming ones, and that is checked explicitly.

  F4. THE SUCCESS CORRELATION POINTS THE OTHER WAY. If the biggest companies in the
      corpus lead with mechanism and the smallest lead with outcome, the whole thesis is
      backwards and the page should be reverted. (SPOILER, and it must be read: on the
      2026 snapshot this check FAILS. See the STAGE control below, which is the only
      thing that rescues it, and which is itself falsifiable.)

  F5. THE STAGE CONTROL FINDS NOTHING. The rescue for F4 is that today's pages are
      post-fame and therefore not comparable to a cold page for an unknown product. That
      predicts that the SAME companies, when unknown, led with mechanism or category.
      If >= 2 of the 5 traced companies led with a vacuous outcome line at launch, the
      rescue is dead and F4 stands unopposed.

If this file only ever prints "the founder is right", it is worthless and it is the
exact failure she is diagnosing. Read the FAIL lines first.

SCORING RULES (so a later pass can argue with the judgements, not guess at them)
-------------------------------------------------------------------------------
"Truthfully sayable" = the company could print the sentence on its own homepage without
a customer who bought it feeling misled. Not "is it on-brand", not "would they" —
COULD they, truthfully. Aspirational-but-true counts as true. Metaphor does not.
Every judgement below carries a one-line reason so it can be overturned by argument.

SOURCES: every H1/sub in CORPUS was fetched from the live page on 2026-09-02 (via
r.jina.ai render for JS-heavy pages, raw HTML otherwise). WAYBACK entries are dated
snapshots from web.archive.org. Both are recorded per-entry.
"""

import json
import sys

# --- the three sentences under test -----------------------------------------

DREX_H1 = "Accountability buddies running their own magazine."
DREX_SUB = "Every issue: a new challenge, a deadline, proof you've improved."
DREX_FLAT = "We help you improve your craft in a group, and maybe turn it into a career."

# --- the corpus -------------------------------------------------------------
# fields: key, name, category, h1, sub, cta, lead ("mechanism"|"outcome"|"category"),
#         scale (rough, cited in the report), and the four substitution judgements:
#         h1_ok / sub_ok / sub_loose_ok / flat_ok  = could THEY truthfully say ours
#         drex_ok = could DREX truthfully say THEIR h1
#         each with a reason.

C = lambda **k: k  # noqa: E731

CORPUS = [
    C(key="circle", name="Circle", category="community platform",
      h1="A new era for digital businesses",
      sub="Build a home for your community, events, and courses — all under your own brand.",
      cta="Start for free", lead="outcome", scale="$30.2M raised, ~$250M valuation",
      h1_ok=False, h1_why="Circle hosts communities; it does not produce a magazine and has no issue object.",
      sub_ok=False, sub_loose_ok=False, sub_why="No challenge, no deadline, no recurring artefact of its own.",
      flat_ok=True, flat_why="Hosts sell craft communities on Circle; 'improve in a group, maybe a career' is exactly the pitch.",
      drex_ok=False, drex_why="Drex is not a platform for digital businesses; nobody sells anything on it."),

    C(key="skool", name="Skool", category="community platform",
      h1="Discover communities or create your own",
      sub="Skool is a community platform. You can discover communities or create your own. Some are free, some paid.",
      cta="Browse / Create a community", lead="category", scale="Hormozi-partnered, large; no public valuation found",
      h1_ok=False, h1_why="No magazine. Skool's artefact is a course + a feed.",
      sub_ok=False, sub_loose_ok=False, sub_why="Courses have modules, not issues; no set deadline.",
      flat_ok=True, flat_why="Verbatim their promise — 'earn full-time incomes building communities around the thing they love'.",
      drex_ok=True, drex_why="Drex IS join-or-start-a-club. This is the one competitor H1 Drex could print unchanged."),

    C(key="mighty", name="Mighty Networks", category="community platform",
      h1="The Community Platform That Delivers",
      sub="Community. Courses. Events. $500M earned on Mighty in 2025.",
      cta="Try Mighty for Free", lead="outcome", scale="$67.9M–$71.8M raised",
      h1_ok=False, h1_why="No magazine, no issue.",
      sub_ok=False, sub_loose_ok=False, sub_why="Events have dates, but nothing closes and nothing is produced together.",
      flat_ok=True, flat_why="'Community. Courses.' is the craft-in-a-group promise with an earnings number attached.",
      drex_ok=True, drex_why="Technically true and completely empty — which is the point of the reverse test."),

    C(key="geneva", name="Geneva (Bumble)", category="group chat with friends",
      h1="The online place to find your offline people",
      sub="Find natural explorers in Los Angeles on Geneva",
      cta="Download", lead="outcome", scale="acquired by Bumble Inc. 2024",
      h1_ok=False, h1_why="Group chat. No artefact of any kind.",
      sub_ok=False, sub_loose_ok=False, sub_why="No challenge, no deadline, no proof.",
      flat_ok=False, flat_why="Geneva makes no craft or career claim; it claims friendship.",
      drex_ok=True, drex_why="Drex clubs meet in person; an online place that produces offline meetings is literally true."),

    C(key="discord", name="Discord", category="group chat / discord",
      h1="Group chat that's all fun & games",
      sub="Discord is great for playing games and chilling with friends, or even building a worldwide community.",
      cta="Download for Windows", lead="mechanism", scale="$1B+ raised, ~200M MAU",
      h1_ok=False, h1_why="No magazine.",
      sub_ok=False, sub_loose_ok=False, sub_why="Nothing in Discord has a deadline.",
      flat_ok=False, flat_why="Discord does not claim craft improvement or career; servers do, Discord doesn't.",
      drex_ok=False, drex_why="Drex is not chat and is not games. Mechanism named = Drex locked out."),

    C(key="meetup", name="Meetup", category="classroom/community",
      h1="The people platform.",
      sub="Where interests become friendships.",
      cta="Join Meetup", lead="outcome", scale="~60M members; sold twice (WeWork, Bending Spoons)",
      h1_ok=False, h1_why="Meetup events produce no artefact.",
      sub_ok=False, sub_loose_ok=False, sub_why="An RSVP date is not a submission deadline and nothing is made.",
      flat_ok=False, flat_why="Meetup claims friendship from interests, not craft improvement or career.",
      drex_ok=True, drex_why="Vacuous enough that Drex, Slack, and a phone book could all print it."),

    C(key="focusmate", name="Focusmate", category="creative accountability",
      h1="Focused. Productive. Together.",
      sub="Virtual coworking for getting anything done.",
      cta="Join for free", lead="mechanism", scale="bootstrapped, 7-figure ARR, ~5–13 staff",
      h1_ok=False, h1_why="THE HALF-MATCH: 'accountability buddies' is Focusmate's own category word — a Focusmate user IS an accountability buddy. 'running their own magazine' is what stops it. The object is doing all the work.",
      sub_ok=False, sub_loose_ok=False, sub_why="A 50-minute session has an end, not a deadline, and produces no proof.",
      flat_ok=False, flat_why="Focusmate is craft-agnostic and makes no career claim.",
      drex_ok=True, drex_why="Three adjectives. Anyone can say it."),

    C(key="caveday", name="Caveday", category="creative accountability",
      h1="Work feels better in The Cave",
      sub="Guided Focus Sessions all day, every day.",
      cta="Start For Free", lead="mechanism", scale="small, indie",
      h1_ok=False, h1_why="No artefact.",
      sub_ok=False, sub_loose_ok=False, sub_why="Sessions, not issues.",
      flat_ok=False, flat_why="No craft, no career.",
      drex_ok=False, drex_why="'The Cave' is a proper noun Drex does not own."),

    C(key="flown", name="FLOWN", category="creative accountability",
      h1="Body doubling & virtual co-working for focus",
      sub="Accountability groups, accountability coaching, ADHD coaching",
      cta="Start free trial", lead="mechanism", scale="small, VC-seeded",
      h1_ok=False, h1_why="FLOWN literally sells 'Accountability groups' — the first half is theirs. The magazine is not.",
      sub_ok=False, sub_loose_ok=False, sub_why="No issue, no challenge set by a host.",
      flat_ok=False, flat_why="Focus product, not a craft product.",
      drex_ok=False, drex_why="Drex does no body doubling and no coaching."),

    C(key="maven", name="Maven", category="cohort-based courses",
      h1="Unlock your career growth",
      sub="Live courses with real-world experts in AI, Product, Leadership, Design, Data & engineering.",
      cta="Browse courses", lead="outcome", scale="$25M Series A (a16z)",
      h1_ok=False, h1_why="A cohort has an instructor and a syllabus, not a magazine it owns.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="FLATTEN 'issue'→'module' and Maven says this word for word: every module a new assignment, a deadline, a demonstrable skill.",
      sub_why="Only the noun 'issue' stops it.",
      flat_ok=True, flat_why="This IS Maven's H1, near-verbatim.",
      drex_ok=True, drex_why="Drex says 'maybe turn it into a career' already — same claim, weaker."),

    C(key="ga", name="General Assembly", category="bootcamp",
      h1="Tech Training in AI, Coding, Data, & UX",
      sub="Limited spots remain for the Adobe Digital Academy application process.",
      cta="Apply Now", lead="category", scale="acquired by Adecco for $412.5M",
      h1_ok=False, h1_why="Students, not buddies. No publication.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="A bootcamp sprint is exactly 'a new challenge, a deadline, proof you've improved'.",
      sub_why="Only 'issue' stops it — and this is the founder's own named enemy.",
      flat_ok=True, flat_why="Word for word the bootcamp promise.",
      drex_ok=False, drex_why="Drex teaches nothing and has no curriculum."),

    C(key="lewagon", name="Le Wagon", category="bootcamp",
      h1="Build your future. Learn Tech & AI.",
      sub="Join our immersive courses in web development, data and AI to transform your career.",
      cta="Find your program", lead="outcome", scale="global, 25k+ alumni",
      h1_ok=False, h1_why="No member-owned artefact.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="Same as GA — weekly challenges with deadlines and a demo day as proof.",
      sub_why="Only 'issue' stops it.",
      flat_ok=True, flat_why="'transform your career' + 'learn' + cohort = the flattened sentence.",
      drex_ok=False, drex_why="Drex teaches no tech and runs no program."),

    C(key="skillshare", name="Skillshare", category="creative-practice / classroom",
      h1="Creative Classes Taught by the Best Creative Pros",
      sub="Get 7 free days of Skillshare",
      cta="Sign up", lead="category", scale="$100M+ raised",
      h1_ok=False, h1_why="One-to-many classes; the student is alone.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="Skillshare classes end in a class project posted for feedback — challenge and proof, minus the deadline.",
      sub_why="No enforced deadline and no issue.",
      flat_ok=True, flat_why="Creative skills, community projects, freelance career — their own funnel.",
      drex_ok=False, drex_why="Drex has no classes and no pros teaching. Mechanism named = Drex locked out."),

    C(key="domestika", name="Domestika", category="creative-practice / classroom",
      h1="Domestika is the leading platform to learn and develop creative skills.",
      sub="The largest creative community. Learn and share from anywhere with online courses.",
      cta="Browse courses", lead="category", scale="$110M raised",
      h1_ok=False, h1_why="Courses, not a co-produced publication.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="Course projects with feedback; no deadline.",
      sub_why="No issue, no deadline.",
      flat_ok=True, flat_why="Verbatim.",
      drex_ok=False, drex_why="'Leading platform' is false and 'courses' is not what Drex does."),

    C(key="creativelive", name="CreativeLive", category="creative-practice / classroom",
      h1="This Is CreativeLive",
      sub="Join live classes every week, ask questions during interactive Q&A, and explore 2,100+ on-demand courses.",
      cta="Explore Classes", lead="category", scale="acquired by Fiverr, 2021",
      h1_ok=False, h1_why="No publication.",
      sub_ok=False, sub_loose_ok=False, sub_why="Weekly live classes have a time, not a deadline, and produce nothing.",
      flat_ok=True, flat_why="Creative skill + career is their stated pitch.",
      drex_ok=False, drex_why="Proper noun."),

    C(key="substack", name="Substack", category="publishing",
      h1="Make money doing the work you believe in",
      sub="You always own your intellectual property, mailing list, and subscriber payments.",
      cta="Start your Substack", lead="outcome", scale="$100M+ raised, ~$45M ARR",
      h1_ok=False, h1_why="CLOSEST IN THE PUBLISHING SET AND STILL NO: a Substack is one writer to an audience. There are no buddies. 'Running their own publication' would be true; 'accountability buddies' is the word that fails.",
      sub_ok=False, sub_loose_ok=False, sub_why="Substack issues have no challenge and no deadline — that is precisely the pain Drex claims to solve.",
      flat_ok=False, flat_why="Substack claims career/money but explicitly NOT 'in a group'.",
      drex_ok=False, drex_why="Drex has no monetisation at all. Would be a lie."),

    C(key="newspaperclub", name="Newspaper Club", category="publishing / zine tool",
      h1="Print your own newspaper",
      sub="Print 1 copy or 1000s, with free templates and super fast delivery",
      cta="let's get started", lead="mechanism", scale="small UK indie, ~15 yrs old",
      h1_ok=False, h1_why="THE OTHER HALF-MATCH: the OBJECT half is shared ('your own newspaper' ≈ 'their own magazine'), but Newspaper Club is a print shop — no group, no recurrence, no buddies.",
      sub_ok=False, sub_loose_ok=False, sub_why="A print order has a delivery date, not a challenge.",
      flat_ok=False, flat_why="No craft teaching and no career claim.",
      drex_ok=False, drex_why="Drex does not print anything. The zine is a URL."),

    C(key="lulu", name="Lulu", category="publishing",
      h1="Print Your Books",
      sub="Instantly and efficiently, create and sell your book through retailers and your own website.",
      cta="Get started", lead="mechanism", scale="~$100M+ rev, 20 yrs old",
      h1_ok=False, h1_why="Solo authors, one-off books.",
      sub_ok=False, sub_loose_ok=False, sub_why="No challenge, no deadline.",
      flat_ok=False, flat_why="No group, no craft improvement.",
      drex_ok=False, drex_why="Drex prints nothing and sells nothing."),

    C(key="blurb", name="Blurb", category="publishing",
      h1="Your story starts here",
      sub="Create. Print. Sell. Share. Blurb specializes in custom books and book printing services.",
      cta="Get started", lead="outcome", scale="~$100M rev",
      h1_ok=False, h1_why="No group, no issue.",
      sub_ok=False, sub_loose_ok=False, sub_why="No challenge, no deadline.",
      flat_ok=False, flat_why="No craft improvement claim.",
      drex_ok=True, drex_why="Pure vacuity. Drex, Lulu, a therapist and a bank could all print it."),

    C(key="patreon", name="Patreon", category="creator platform",
      h1="Creativity powered by fandom",
      sub="Where Creator Communities Thrive",
      cta="Get started", lead="outcome", scale="$400M+ raised, ~$8B lifetime payouts",
      h1_ok=False, h1_why="Creator-to-fan, not peer-to-peer. No shared artefact.",
      sub_ok=False, sub_loose_ok=False, sub_why="No deadline, no challenge.",
      flat_ok=False, flat_why="Career yes, 'improve your craft in a group' no."),

    C(key="toastmasters", name="Toastmasters International", category="the club analogue",
      h1="Express Yourself Better",
      sub="Practice the skills you need to communicate with confidence and excellence. It all starts with a fun club environment where you will learn and practice together—to grow individually.",
      cta="Find/visit a club", lead="outcome", scale="~270k members, 14k clubs, since 1924",
      h1_ok=False, h1_why="STRUCTURALLY THE NEAREST THING ALIVE — clubs, a manual, a standing meeting, peer evaluation — and it still cannot say ours, because a Toastmasters club produces a MEETING, not a publication. This is the single strongest evidence that the object noun is what differentiates.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="Flatten 'issue'→'Pathways project' and Toastmasters says it exactly: a new assignment, a meeting date, a written evaluation as proof.",
      sub_why="Only the noun 'issue' stops it.",
      flat_ok=True, flat_why="'improve your craft in a group, maybe advance your career' is their own bullet list.",
      drex_ok=True, drex_why="Vacuous imperative; anyone can say it."),

    C(key="lws", name="London Writers' Salon", category="creative accountability",
      h1="The Writing Community You've Been Looking For.",
      sub="The home for writers to build a writing practice, deepen their craft, find creative friends, and realise their creative ambitions.",
      cta="Join Us", lead="outcome", scale="small, ~100k+ writers reached",
      h1_ok=False, h1_why="Writers' Hour is a daily session; the magazine that exists is editorial, not member-run.",
      sub_ok=False, sub_loose_ok=False, sub_why="A daily hour has no challenge and closes nothing.",
      flat_ok=True, flat_why="Their sub IS the flattened sentence with 'writing' substituted for 'craft'.",
      drex_ok=False, drex_why="Writing-specific. Drex is craft-agnostic, so it would be a narrowing lie."),

    C(key="coachme", name="Coach.me", category="coaching network",
      h1="The Coaching Platform That Turns Goals Into Reality",
      sub="Connects you with expert coaches and the proven tools to keep you consistent.",
      cta="Get coached", lead="outcome", scale="small, long-running",
      h1_ok=False, h1_why="Expert-to-client, not peers. No artefact.",
      sub_ok=False, sub_loose_ok=False, sub_why="Habit streaks, not issues.",
      flat_ok=True, flat_why="Improve, with people, toward a career — their pitch.",
      drex_ok=False, drex_why="Drex has no coaches. Mechanism named = Drex locked out."),

    C(key="betterup", name="BetterUp", category="coaching network",
      h1="Powering performance-ready workforces in the AI era",
      sub="Coaching, AI, and behavioural science for enterprise.",
      cta="Request a demo", lead="outcome", scale="~$4.7B peak valuation",
      h1_ok=False, h1_why="B2B enterprise coaching.",
      sub_ok=False, sub_loose_ok=False, sub_why="No artefact, no deadline.",
      flat_ok=True, flat_why="Growth in a coached group, toward career — verbatim in kind.",
      drex_ok=False, drex_why="Drex sells to no workforce."),

    C(key="750words", name="750 Words", category="creative practice",
      h1="Practice Writing Every Day",
      sub="Helping you practice one of the most important habits in life: private journaling.",
      cta="Sign up", lead="mechanism", scale="one-person site, ~15 yrs",
      h1_ok=False, h1_why="Private and solo — the opposite of both halves.",
      sub_ok=False, sub_loose_ok=False, sub_why="Daily streak, not an issue with a challenge.",
      flat_ok=False, flat_why="Explicitly private; no group, no career.",
      drex_ok=False, drex_why="Drex is not daily and not writing-only."),

    C(key="campfire", name="Campfire", category="creative-practice tool",
      h1="Where Stories Come to Life",
      sub="Choose Your Quest",
      cta="Start writing", lead="outcome", scale="small indie SaaS",
      h1_ok=False, h1_why="A solo worldbuilding tool.",
      sub_ok=False, sub_loose_ok=False, sub_why="No deadline.",
      flat_ok=False, flat_why="No group, no career.",
      drex_ok=True, drex_why="Metaphor with no referent; Drex could print it and say nothing."),

    C(key="100day", name="The 100 Day Project", category="creative practice",
      h1="Show up to your creative practice every day for 100 days",
      sub="A free, global art project built around a simple idea. Subscribe for daily creative prompts.",
      cta="Subscribe", lead="mechanism", scale="67k+ subscribers, free, run by one person",
      h1_ok=False, h1_why="No group ownership and no publication — 100k people doing the same solo thing in parallel.",
      sub_ok=False, sub_loose_ok=True, sub_loose_why="NEAREST MISS ON THE SUB: a daily prompt IS a new challenge, the day IS the deadline, and the 100-image grid IS proof you improved. Only 'issue' and the group stop it.",
      sub_why="No issue, no group, and the deadline is self-imposed.",
      flat_ok=False, flat_why="No career claim; explicitly a practice, not a ladder.",
      drex_ok=False, drex_why="Drex is per-issue, not daily; and it is not free-form solo practice."),
]

# --- the stage control (F5) -------------------------------------------------
# The same companies, at the point where nobody knew what they were.
WAYBACK = [
    dict(key="substack", when="2018-06", line="Paid newsletters made simple",
         lead="mechanism", note="Names the object and the business model in four words.",
         url="https://web.archive.org/web/20180601000000/https://substack.com/"),
    dict(key="substack", when="2023-06", line="Do your best work, supported by your subscribers",
         lead="outcome", note="Object gone; outcome only.",
         url="https://web.archive.org/web/20230601000000/https://substack.com/"),
    dict(key="substack", when="2026-09", line="Make money doing the work you believe in",
         lead="outcome", note="Fully abstract. Any patronage product could say it.",
         url="https://substack.com/"),
    dict(key="circle", when="2020-06", line="The modern community platform for creators.",
         lead="category", note="Names the category flatly. Waitlist-stage.",
         url="https://web.archive.org/web/20200601000000/https://circle.so/"),
    dict(key="circle", when="2022-06", line="The all-in-one community platform for creators & brands / Group chats, live streams, events, rich profiles, and more.",
         lead="mechanism", note="Category PLUS an explicit mechanism list.",
         url="https://web.archive.org/web/20220601000000/https://circle.so/"),
    dict(key="circle", when="2026-09", line="A new era for digital businesses",
         lead="outcome", note="Names nothing. Post-fame.",
         url="https://circle.so/"),
    dict(key="discord", when="2016-06", line="It's time to ditch Skype and TeamSpeak.",
         lead="mechanism", note="Zero-awareness Discord did the comparison the founder says we should NOT do — and it worked. Counter-evidence, logged.",
         url="https://web.archive.org/web/20160601000000/https://discordapp.com/"),
    dict(key="discord", when="2026-09", line="Group chat that's all fun & games",
         lead="mechanism", note="Still names the mechanism 20 yrs on. The one big company that never abstracted.",
         url="https://discord.com/"),
    dict(key="mighty", when="2018-09", line="Grow your niche brand or business - all in one platform",
         lead="outcome", note="Led with OUTCOME while unknown. Counts AGAINST the stage rescue.",
         url="https://web.archive.org/web/20180901000000/https://www.mightynetworks.com/"),
    dict(key="patreon", when="2015-06", line="Patreon is empowering a new generation of creators to make a living from their passion",
         lead="outcome", note="Led with OUTCOME while unknown. Counts AGAINST the stage rescue.",
         url="https://web.archive.org/web/20150601000000/https://www.patreon.com/"),
]

# rough size ranking, for the F4 correlation. "big" = >$100M raised, acquired >$100M,
# or >1M users. "small" = indie / bootstrapped / one-person.
BIG = {"circle", "skool", "mighty", "geneva", "discord", "meetup", "maven", "ga",
       "lewagon", "skillshare", "domestika", "creativelive", "substack", "lulu",
       "blurb", "patreon", "betterup", "toastmasters"}
SMALL = {"focusmate", "caveday", "flown", "newspaperclub", "lws", "coachme",
         "750words", "campfire", "100day"}


def run():
    n = len(CORPUS)
    h1_yes = [c for c in CORPUS if c["h1_ok"]]
    sub_yes = [c for c in CORPUS if c["sub_ok"]]
    sub_loose_yes = [c for c in CORPUS if c.get("sub_loose_ok")]
    flat_yes = [c for c in CORPUS if c["flat_ok"]]
    drex_yes = [c for c in CORPUS if c.get("drex_ok")]

    out = {
        "corpus_size": n,
        "forward": {
            "h1_sayable_by": len(h1_yes),
            "sub_sayable_by_strict": len(sub_yes),
            "sub_sayable_by_flattened_noun": len(sub_loose_yes),
            "flattened_pitch_sayable_by": len(flat_yes),
            "flattened_names": [c["name"] for c in flat_yes],
            "sub_flattened_names": [c["name"] for c in sub_loose_yes],
        },
        "reverse": {
            "drex_could_say": len(drex_yes),
            "names": [c["name"] for c in drex_yes],
            "pct": round(100 * len(drex_yes) / n),
        },
    }

    # F4: does leading with mechanism correlate with size?
    big_mech = [c for c in CORPUS if c["key"] in BIG and c["lead"] == "mechanism"]
    big_out = [c for c in CORPUS if c["key"] in BIG and c["lead"] in ("outcome", "category")]
    small_mech = [c for c in CORPUS if c["key"] in SMALL and c["lead"] == "mechanism"]
    small_out = [c for c in CORPUS if c["key"] in SMALL and c["lead"] in ("outcome", "category")]
    out["correlation"] = {
        "big_lead_mechanism": len(big_mech), "big_lead_outcome_or_category": len(big_out),
        "small_lead_mechanism": len(small_mech), "small_lead_outcome_or_category": len(small_out),
        "big_mech_pct": round(100 * len(big_mech) / max(1, len(big_mech) + len(big_out))),
        "small_mech_pct": round(100 * len(small_mech) / max(1, len(small_mech) + len(small_out))),
    }

    # F5: stage control
    launch = [w for w in WAYBACK if w["when"] < "2021"]
    launch_mech = [w for w in launch if w["lead"] in ("mechanism", "category")]
    launch_vague = [w for w in launch if w["lead"] == "outcome"]
    out["stage_control"] = {
        "traced": len(launch),
        "led_with_mechanism_or_category_when_unknown": len(launch_mech),
        "led_with_outcome_when_unknown": len(launch_vague),
        "counterexamples": [w["key"] for w in launch_vague],
    }

    verdicts = []
    verdicts.append(("F1 portability collapse", len(h1_yes) >= 6,
                     f"H1 sayable by {len(h1_yes)}/{n} (threshold >=6)"))
    verdicts.append(("F2 no separation", abs(len(flat_yes) - len(h1_yes)) <= 4,
                     f"flattened {len(flat_yes)} vs H1 {len(h1_yes)}; gap {len(flat_yes)-len(h1_yes)} (threshold gap <=4)"))
    verdicts.append(("F3 reverse symmetry breaks", len(drex_yes) / n >= 0.60,
                     f"Drex could say {len(drex_yes)}/{n} = {out['reverse']['pct']}% (threshold >=60%)"))
    verdicts.append(("F4 success correlation inverted", out["correlation"]["small_mech_pct"] > out["correlation"]["big_mech_pct"],
                     f"mechanism-leading: big {out['correlation']['big_mech_pct']}% vs small {out['correlation']['small_mech_pct']}%"))
    verdicts.append(("F5 stage rescue dead", len(launch_vague) >= 2,
                     f"{len(launch_vague)}/{len(launch)} traced companies led with a vacuous outcome when unknown (threshold >=2)"))
    out["falsification"] = [{"test": t, "FAILED_HYPOTHESIS": bool(f), "detail": d} for t, f, d in verdicts]
    return out


def main():
    if "--corpus" in sys.argv:
        for c in CORPUS:
            print(f'{c["name"]} [{c["category"]}] lead={c["lead"]}')
            print(f'  H1:  {c["h1"]}')
            print(f'  SUB: {c["sub"]}')
            print(f'  CTA: {c["cta"]}')
        return
    r = run()
    if "--json" in sys.argv:
        print(json.dumps(r, indent=2))
        return
    print("=" * 74)
    print("SUBSTITUTION TEST — drex fold vs 27 real landing pages (fetched 2026-09-02)")
    print("=" * 74)
    print(f'\nH1  under test: "{DREX_H1}"')
    print(f'SUB under test: "{DREX_SUB}"')
    print(f'FLAT (founder\'s own flattening): "{DREX_FLAT}"')
    f = r["forward"]
    print("\n-- FORWARD: how many of the 27 could truthfully print OUR line? --")
    print(f'  H1                                  {f["h1_sayable_by"]:>2} / 27')
    print(f'  SUB (as written, with "issue")      {f["sub_sayable_by_strict"]:>2} / 27')
    print(f'  SUB (flatten "issue"->module/project) {f["sub_sayable_by_flattened_noun"]:>2} / 27   <- {", ".join(f["sub_flattened_names"])}')
    print(f'  FLATTENED PITCH                     {f["flattened_pitch_sayable_by"]:>2} / 27')
    print(f'     -> {", ".join(f["flattened_names"])}')
    rv = r["reverse"]
    print("\n-- REVERSE: how many competitor H1s could DREX truthfully print? --")
    print(f'  {rv["drex_could_say"]} / 27 ({rv["pct"]}%): {", ".join(rv["names"])}')
    co = r["correlation"]
    print("\n-- F4 CORRELATION: does leading with mechanism track with success? --")
    print(f'  BIG   companies leading with mechanism: {co["big_lead_mechanism"]}/{co["big_lead_mechanism"]+co["big_lead_outcome_or_category"]} ({co["big_mech_pct"]}%)')
    print(f'  SMALL companies leading with mechanism: {co["small_lead_mechanism"]}/{co["small_lead_mechanism"]+co["small_lead_outcome_or_category"]} ({co["small_mech_pct"]}%)')
    sc = r["stage_control"]
    print("\n-- F5 STAGE CONTROL: the same firms, when nobody knew them --")
    for w in WAYBACK:
        print(f'  {w["key"]:<10} {w["when"]}  [{w["lead"]:<9}] {w["line"][:78]}')
    print(f'\n  led with mechanism/category when unknown: {sc["led_with_mechanism_or_category_when_unknown"]}/{sc["traced"]}')
    print(f'  counterexamples: {", ".join(sc["counterexamples"]) or "none"}')
    print("\n" + "=" * 74)
    print("FALSIFICATION VERDICTS  (True = the founder's hypothesis FAILED this test)")
    print("=" * 74)
    for v in r["falsification"]:
        mark = "FAILED  " if v["FAILED_HYPOTHESIS"] else "survived"
        print(f'  [{mark}] {v["test"]:<34} {v["detail"]}')
    print()


if __name__ == "__main__":
    main()
