#!/usr/bin/env python3
"""substitution_candidates.py — the founder's test, run to KILL 20 candidate folds.

    python3 tools/substitution_candidates.py

WHAT IS DIFFERENT FROM substitution.py
--------------------------------------
substitution.py scored the frozen fold against 27 COMPANIES and got 0/27. That corpus
was the wrong universe and this file is the correction. Of those 27, not ONE is an
instance of the thing Drex actually is: a small group of peers that publishes together
on a recurring deadline. The corpus held platforms (Circle, Skool, Mighty), schools
(GA, Le Wagon, Domestika), print shops (Newspaper Club, Lulu, Blurb) and focus tools
(Focusmate, Caveday, FLOWN) — every adjacent thing EXCEPT the adjacent thing.

So a mechanism sentence could not lose. This panel adds the missing universe: the
club-publication traditions, and the software already sold to them.

THE PANEL (every entry verified this session unless marked)
-----------------------------------------------------------
P1 AMATEUR PRESS ASSOCIATIONS — live. American Amateur Press Association, founded 1936,
   ~150 members today: "Members' papers are combined in a monthly mailing called a
   'bundle,' distributed by our mailing bureau." General APA form: each member produces
   pages, an Official Editor (a MEMBER) collates them into a NUMBERED mailing with a
   table of contents, against a mailing deadline; many run minimum-activity rules
   ("at least two A4 pages to at least two out of every three mailings"); and some
   "simply accumulate contributions between deadlines and mail out whatever is
   available at the mailing deadline."
P2 YEARBOOK SAAS — Flipsnack: "Invite students, teachers, or committee members into the
   same yearbook. Everyone can add photos, leave comments, and edit their own pages."
   / "Share your finished yearbook via a link." Entourage: "Invite each team member to
   your yearbook project and easily assign pages to them." / "real-time collaboration" /
   "See your pages, progress, page assignments, and more from the fast-loading ladder."
   SPC Yearbook Hub: "a yearbook countdown clock to remind you of your print deadline."
P3 STUDENT-NEWSROOM SAAS — SNO Sites: "SNO FLOW ... helps manage assignments, track
   deadlines, and foster collaboration across teams." School Press Club: "a real
   newsroom workflow with roles, draft stages, teacher comments, and both online and
   PDF publishing."
P4 LIBRARY / CAMPUS ZINE CLUBS — Barnard Zine Club members "make pages for their club
   zine Sticks and Stones"; Hallowzine: "participants are invited to create one page to
   be added to a collective zine project"; New Paltz Zine Collective meets weekly.
P5 CAMERA CLUBS — member-set monthly themes ("competition topics will be decided by the
   Board"), hard entry deadlines ("digital entries must be filed on the club website no
   later than midnight of the Tuesday prior"), club newsletter.
P6 DISCORD ART SERVERS — mod-set weekly/monthly prompt challenges with deadlines and a
   showcase. On the founder's OWN list of alternatives.
P7 CO-EDITING COMMODITY — Figma (owns "one file, everyone at once" since 2017), Google
   Docs, Canva for Education.
P8 PORTFOLIO / BYLINE PRODUCTS — Behance, ArtStation, Muck Rack, Contently, Devpost.
P9 THE ORIGINAL 27 — substitution.py's corpus, carried forward unchanged.
P10 UNIVERSITY PUBLICATION CLASSES — Duke's The Archive (real biannual magazine),
   Columbia Publishing Course, high-school journalism and lit-mag classes.

SCORING
-------
DISTINCTIVENESS 1-5. 5 = essentially nobody on the panel can truthfully print it.
1 = everybody can. A candidate scoring <=3 FAILS. "Truthfully sayable" allows a noun
swap ONLY where the swap is a synonym in the same structural role (issue/mailing/
bundle/volume/edition). A sentence that survives purely because we said "magazine"
where they say "newspaper" has a synonym-thin moat and is scored as sayable — the
founder's claim is structural impossibility, not vocabulary luck.

HOW THIS INSTRUMENT CAN BE WRONG — DECLARED BEFORE SCORING
----------------------------------------------------------
I1. NOT DISCRIMINATING. If >= 12 of 20 candidates pass, the panel is too soft and the
    run tells us nothing. (Result below.)
I2. NOT RANKING. If 0 of 20 pass, the panel is too broad to choose with, and the honest
    report is "the panel is wrong", not "the candidates are bad". (Result below.)
I3. CONTROL — THE ONE THAT MATTERS. The frozen H1 is scored on this panel too. It
    measured 0/27 (perfectly unsayable) on substitution.py. If it scores <= 3 here,
    this panel is materially stricter than the loop's and I am grading 20 candidates on
    a curve the frozen fold never faced — in which case every "no competitor can say
    this" verdict in LOOP-FINDINGS needs re-running before any candidate is killed.
"""

CTRL_H1 = "Accountability buddies running their own magazine."

# (n, headline, score, [ (who, why-they-can-say-it) ])
CANDS = [
 (1,"Issue 001, 002, 003 — the magazine your club keeps making.",3,[
   ("P1 AAPA / any APA","Bundles are numbered and monthly; the association keeps making them. 'Mailing 001, 002, 003 — the bundle your association keeps making.'"),
   ("P4 Barnard Zine Club","Sticks and Stones is a recurring club zine made of members' pages."),
   ("P10 school yearbook staff / lit mag","Volume 87, 88, 89 — the book the staff keeps making. Serial, group-owned, non-terminal for the STAFF even though terminal for each student."),
   ("P5 camera club journal","Numbered club journal, issue after issue."),
 ]),
 (2,"A magazine nobody made alone.",1,[
   ("Every magazine ever published","Condé Nast, The New Yorker, any title on any newsstand can print this truthfully. No magazine is made alone. The sentence reads as a co-authorship claim and is literally true of the entire industry."),
   ("P2 Flipsnack/Entourage","'A yearbook nobody made alone' — 'Everyone can add photos... and edit their own pages.'"),
   ("P10 Duke's The Archive","A real magazine nobody made alone."),
 ]),
 (3,"What your club makes is a magazine, at a link you can send.",2,[
   ("P2 Flipsnack","'Share your finished yearbook via a link, embed it on your school or university website.' Verbatim same promise."),
   ("Issuu / Joomag / Publuu","Digital-magazine-at-a-link IS the product, sold to clubs and schools."),
   ("P3 SNO Sites","Student publication at a URL."),
   ("P4 / P5 / P10","Any club that puts its zine, journal or lit mag online."),
 ]),
 (4,"Every magazine here was made by a club, on a deadline.",4,[
   ("P3 SNO Sites — NEAREST MISS","Could say 'every site here is run by a student newsroom, on deadline' — needs two noun swaps (club->newsroom, magazine->site) and cannot claim an enforced close."),
   ("Devpost — NEAREST MISS","'Every project here was made by a team, at a hackathon.' Same shape, no magazine, no club, teams don't recur."),
   ("Issuu — NEAREST MISS","Hosts club magazines but knows nothing about a deadline and cannot claim one."),
   ("Skillshare / Domestika / CreativeLive","Have public galleries of student work — but individual work, no club, no deadline."),
 ]),
 (5,'"Our Favorite Drinks," by Beans. "Dropcaps," by Penmanship.',2,[
   ("P4 Barnard Zine Club","'Sticks and Stones, by the Barnard Zine Club' is the same sentence with different proper nouns."),
   ("P3 SNO Sites member list","Lists titled student publications by named school staffs — identical shape."),
   ("P1 APA official organs","Titled, by-lined to the association."),
   ("P5 camera club journals","'The F-Stop, by Gaithersburg Camera Club.'"),
   ("NOTE","Highest VERBATIM uniqueness in the set (nobody else has those titles) and among the lowest STRUCTURAL uniqueness. A proper noun is not a mechanism."),
 ]),
 (6,"The club meets, publishes, and starts the next issue.",2,[
   ("P3 student newsroom / P10 journalism class","'The staff meets, publishes, and starts the next issue' is the literal job description, and SNO sells the software for it. This is the founder's own 'classroom' saying the line with one noun changed."),
   ("P5 camera club","Meets, publishes the newsletter, sets next month's theme."),
   ("P1 APA","Publishes the bundle, starts the next one."),
   ("P4 Barnard Zine Club","Weekly meeting, recurring club zine."),
 ]),
 (7,"On the date your club set, submissions close and the issue publishes.",2,[
   ("Literary magazines on Submittable/Moksha","Reading period closes automatically on the date the magazine set; that issue publishes. The exact workflow, at thousands of titles."),
   ("Devpost","Hackathon submissions hard-close at the deadline, automatically."),
   ("P5 camera clubs","Club-set date, entries close on the club's own website at a stated minute, results published."),
   ("P1 APAs","'Accumulate contributions between deadlines and mail out whatever is available at the mailing deadline.'"),
   ("CORRECTION TO THE RECORD","substitution.py concluded 'no page in the corpus has a deadline that actually closes — the only fully unclaimed mechanism Drex has.' True of that corpus, false of the market."),
 ]),
 (8,"Issue 001, then 002, then 003. Your club's, each with a date.",2,[
   ("P1 APA","Numbered mailings, each with a mailing deadline. Since the 1870s."),
   ("P10 yearbook staff","Numbered volumes, each with a print deadline."),
   ("P5 camera club","Numbered monthly competitions, each with an entry deadline."),
   ("NOTE","Weaker than #1: the extra clause spends the headline on 'date', the noun Research 5 already falsified."),
 ]),
 (9,"Your club owns the clock: its hour, its deadline, its issue.",3,[
   ("P5 camera club","Owns its meeting night, its entry deadline, its journal. All three."),
   ("P1 APA","Owns its mailing schedule, its deadline, its bundle."),
   ("P4 zine clubs","Own their weekly hour and their zine."),
   ("NOTE","Separates cleanly from bootcamp/class/coaching and collapses entirely against peer groups — which is the comparison that actually decides Drex vs 'a group chat with my friends'."),
 ]),
 (10,"The same hour comes back, and so does the next issue.",2,[
   ("P3 student newsroom","Weekly staff period, next issue. Verbatim true."),
   ("P5 camera club","Monthly meeting, monthly competition, newsletter."),
   ("P1 APA","Quarterly/monthly mailing."),
   ("Every periodical publisher","A periodical is BY DEFINITION a recurring production hour and a next issue."),
 ]),
 (11,"One issue. Everyone in the club making it at the same time.",1,[
   ("P2 Flipsnack","'Invite students, teachers, or committee members into the same yearbook. Everyone can add photos, leave comments, and edit their own pages.'"),
   ("P2 Entourage","'real-time collaboration'; 'Invite each team member to your yearbook project.'"),
   ("P7 Figma / Google Docs / Canva","'One file, everyone at once' is the most commoditised claim in software; Figma has owned the construction since 2017."),
   ("NOTE","The research note conceded 'a classroom that runs a class magazine' as one partial leak. It is not one classroom, it is a software category."),
 ]),
 (12,"A host sets the date. The club makes the issue. Then it's public.",2,[
   ("P6 Discord art servers","'Weekly Challenges are published every week with a prompt' set by a mod; deadline; public showcase. On the founder's own list."),
   ("P5 camera clubs","'Competition topics will be decided by the Board'; entries close; results published."),
   ("P1 APA","Official Editor sets the mailing deadline; members contribute; the bundle goes out."),
   ("P3 student newsroom","Editor sets deadline, staff makes the issue, it publishes."),
   ("NOTE","Included as a control for 'concrete is boring'. It does not fail on boringness. It fails on universality."),
 ]),
 (13,"Your club's issue closes on its deadline. Whatever's in is what publishes.",2,[
   ("P1 APA — VERBATIM","'Some APAs simply accumulate contributions between deadlines and mail out whatever is available at the mailing deadline.' A century old and still running."),
   ("Literary magazines on Submittable","Reading period closes; that issue is what publishes."),
   ("P10 yearbook adviser","Print deadline lands, whatever is on the ladder prints. Every adviser's line."),
   ("Devpost","Submissions close; whatever is in is what is judged."),
   ("NOTE","Carries the loop's single best field signal (§F-1: the deadline was the ONLY thing strangers understood) and that is exactly why this failure matters: the thing they understood is the thing competitors already own."),
 ]),
 (14,"Your club's issue 001, due on a date the host set. Then 002.",2,[
   ("P1 APA","Numbered mailing, Official Editor's deadline, then the next one."),
   ("P10 yearbook / lit mag","Numbered volume, adviser's deadline, then the next."),
   ("P5 camera club","Same."),
 ]),
 (15,"Everyone's pages, one issue, one date the host set.",1,[
   ("P1 APA — THE DEFINITION","AAPA verbatim: 'Members' papers are combined in a monthly mailing called a bundle.' Each member produces pages; a member-Official-Editor collates them into one numbered issue against one mailing deadline. This candidate is the dictionary definition of a form that has run since the 1870s."),
   ("P4 Hallowzine","'Participants are invited to create one page to be added to a collective zine project.'"),
   ("P2 Entourage","'Invite each team member to your yearbook project and easily assign pages to them' + one print deadline."),
   ("P4 Barnard Zine Club","'Members sit around the table and make pages for their club zine.'"),
 ]),
 (16,"You're a name on the contents page, issue after issue.",2,[
   ("P1 APA","The Official Editor adds 'a ToC' to every bundle. A contents page listing every contributor, mailing after mailing."),
   ("P10 school lit mag / Duke's The Archive","Contents page, issue after issue."),
   ("P5 camera club journal","Same."),
   ("NOTE","The codebase-verified credit rule (credit computed from work, not roster) IS distinctive — but the headline does not say it, and a masthead has always meant it."),
 ]),
 (17,"The person who sets your challenge is somebody in the club.",2,[
   ("P6 Discord art servers","Mod-set weekly prompts; mods are members. Discord is on the founder's OWN list, which is the worst place to lose."),
   ("P5 camera clubs","'Competition topics will be decided by the Board' — the Board is members."),
   ("Toastmasters","The VP Education, a member, assigns the projects."),
   ("Book clubs, writing groups, running clubs, D&D groups","All peer-set, all in the skeptic's list."),
   ("CORRECTION","The candidate note calls this 'the one structural impossibility on the list.' It tested only the INSTITUTIONAL half of the founder's list (bootcamp/class/coaching) and skipped the peer half (Discord/group chat), where it dies."),
 ]),
 (18,"One file, one issue, your whole club inside it.",1,[
   ("P7 Figma","Owns the construction outright since 2017."),
   ("P2 yearbook SaaS","'One file, one book, the whole school inside it' is the yearbook pitch, verbatim in spirit."),
   ("P7 Google Docs / Canva","Same claim, free."),
 ]),
 (19,"The rest of your club can see whether your pages went in.",2,[
   ("P2 Entourage — PRODUCT FEATURE COLLISION","'See your pages, progress, page assignments, and more from the fast-loading ladder.' The staff sees whose pages are in."),
   ("P1 APA — SOCIAL MECHANISM COLLISION","Minimum-activity rules: 'at least two A4 pages to at least two out of every three mailings' — the whole membership sees who contributed, and non-contributors are dropped."),
   ("P6 Discord challenge channel","Everyone sees who posted."),
   ("P5 camera club","Everyone sees who entered this month."),
 ]),
 (20,"The issues you're in pile up on your wall, under your name.",1,[
   ("P8 Behance / ArtStation / Dribbble","A body of work under your name is the entire product. 'Wall' is already Facebook's and Behance's."),
   ("P8 Muck Rack / Contently","Literally 'the issues you're in, collected under your name', automatically."),
   ("P8 Devpost / Medium / Substack","Contributor profiles."),
   ("NOTE","This is the 'portfolio' claim in other words, and §R kills 'portfolio' outright."),
 ]),
]

def main():
    print("="*78); print("SUBSTITUTION TEST — 20 CANDIDATE FOLDS"); print("="*78)
    surv=[c for c in CANDS if c[2]>=4]; fail=[c for c in CANDS if c[2]<=3]
    for n,h,s,who in CANDS:
        v="SURVIVES" if s>=4 else "FAILS"
        print(f"\n[{n:2}] {v:8} distinctiveness {s}/5\n     {h}")
        for w,y in who: print(f"       - {w}: {y}")
    print("\n"+"="*78)
    print(f"SURVIVE: {len(surv)}/20  ->  {[c[0] for c in surv]}")
    print(f"FAIL:    {len(fail)}/20")
    print("="*78)
    print("\nDECLARED FAILURE CONDITIONS FOR THE INSTRUMENT ITSELF:")
    print(f"  I1 (>=12 pass => panel too soft) : {'FIRED' if len(surv)>=12 else 'did not fire'} ({len(surv)} passed)")
    print(f"  I2 (0 pass => panel too broad)   : {'FIRED' if len(surv)==0 else 'did not fire'}")
    print(f"  I3 CONTROL — frozen H1 on THIS panel: {CTRL_H1}")
    print("     Hits: P1 APAs (minimum-activity rules ARE peer accountability, and the")
    print("     association runs its own magazine). Misses: zine clubs (friends, not")
    print("     accountability buddies), camera clubs, yearbook staffs (a graded class),")
    print("     student newsrooms (staff, not buddies), Discord servers (no magazine).")
    print("     SCORE 4/5 — passes, but NOT the clean 0/27 sheet substitution.py recorded.")
    print("     => I3 fires PARTIALLY: this panel is stricter than the loop's. The 0/27")
    print("        was produced by a corpus containing no club-publication tradition at")
    print("        all. Report that, do not quietly grade candidates on a harder curve.")

if __name__=="__main__": main()
