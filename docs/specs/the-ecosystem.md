# The ecosystem

**Status:** figure built, argument settled, two decisions outstanding. Written 2026-09-21.

Four projects by one person, and what actually connects them.

Drawn in the bottom band of Colour Brain, under **The apps**. Model in
[`lib/ecosystem.ts`](../../lib/ecosystem.ts).

---

## The spine is the operator, not the data

There is one spine and it is not a schema.

> **Victor states an intention in one place, an agent executes it against repos, and a digest
> reports back.**

Colour Brain already *is* that place — check-in, notebook, missions, `brain-read.ts`,
`brain-digest.ts`. So the honest integration is that **Colour Brain becomes the cockpit for the
others, and the others never touch each other's data at all.**

The pull toward a *data* spine is strong, because all four smell alike: computed-never-stored
branches, reasons-never-scores, edges-derived-never-asserted, refuses-to-rank. That resemblance is
real. It is a shared **creed**, not a shared **layer**.

A creed belongs in each repository restating it in its own terms. The moment two of these share a
table, the creed becomes a dependency — and a dependency between a private life index and an
evidential public ledger is a bug in both.

---

## Counted honestly, it is two and a half products

**Network Map is not a fourth thing.** It is a view inside Shipping Map, specified as such: edges
derived from who-bears-the-block, inheriting the sourcing of the fact underneath. Any impulse to
"integrate Network Map with the others" is a category error — it has no independent existence to
integrate.

That leaves three, and one is drifting.

**ColourMesh is floating, and the figure says so.** Nothing depends on it; it depends on nothing.
Its bridging thesis is genuinely good and transfers to Network Map **as an idea** — the alumni
graph's most valuable feature will be the structural holes between Geneva desks, not the
similarities. *Take the sentence, leave the codebase.*

The recommendation, not yet acted on: **park it deliberately — frozen, not deleted.** It serves no
ranked goal in the current situation, has no users, and carries the heaviest guardrail overhead of
the four. Letting it die of neglect while consuming CI minutes and attention is the worst of both.

That is a decision for its owner, so `lib/ecosystem.ts` still records it as `built`, and a test
asserts it is the only isolated node. Whoever breaks that test should have made the call.

---

## The fake overlap, refused by name

**ColourMesh and Network Map are "both people graphs"** the way a diary and a deposition are both
writing.

| | ColourMesh | Network Map |
| --- | --- | --- |
| Node | A person | An organisation |
| Truth condition | Self-reported | Established by a dated, sourced fact |
| Consent | Constitutive — they joined | An exception, for the few people who agree |
| Location | Jittered, never exact | Public record |
| Failure mode | A leaked directory | An unsourced assertion |

Different truth conditions, different ethics, different failure modes. A merged schema would either
leak the evidential standard into personal data, which is absurd, or the consent standard into
public facts, which is crippling.

**This is the seductive integration, and it is refused.**

Also fake: Colour Brain and Shipping Map as "both indexes". One indexes a self for one reader; the
other indexes the world under an evidence discipline. Interview *scheduling* belongs in Brain's
missions; interview *content* belongs in Shipping Map as graded facts. **The pipe between them is
human judgement, on purpose** — automating it would launder ungraded notes into the ledger.

---

## The day

**Morning, phone.** Check in. Read the digest — which should grow from weekly to daily and report
across *all* repos: what shipped, which PRs await approval, which facts are ungraded. Then write
missions. Missions are the command channel. Five minutes, and it is the whole integration surface.

**During the day.** Capture only. A raw note into Shipping Map's inbox as an **ungraded** fact,
never silently promoted; a check-in into Brain. Capture must be dumb and fast. Grading is evening
work or agent-assisted work, never thumb work.

**Evening, laptop optional.** The laptop is for the two things a phone genuinely cannot do:
designing — specs, schema decisions, arguments about what a field means — and looking at UI in a
browser. Everything else the agent should already have done.

---

## Where the agent fits

It does not need the laptop; it needs a filesystem, and GitHub Actions has one.
`scripts/brain-digest.ts` already proves the pattern.

The extension: a runner per repo pulls open missions tagged for it, works on a branch under the
existing guardrails, opens a PR, and writes a line back to the digest. PRs get approved from GitHub
mobile.

**The guardrail apparatus turns out to be the most valuable shared asset across all four projects** —
more valuable than any data integration. No direct push to main, protected paths, Lane B human
review: that is exactly what makes unattended execution safe.

**The honest limit.** UI work still needs eyes on a browser, and grading facts needs judgement about
sources. The agent may draft a grade and a `because` line; it must never finalise one. An agent
assigning confidence to evidence about the industry you want to be hired into is an agent writing
your epistemic reputation for you.

---

## The highest-leverage integration

**Missions as the agent queue, plus a cross-repo daily digest.**

Small, built on tables and scripts that already exist, makes the laptop genuinely optional, and
integrates the *operator* while keeping the products separate. Every other candidate moves data
between products; this one moves intent from person to agents and results from agents to person.

Build it before anything else.

---

## What breaks first

**Not the code — the grading discipline, the moment interviews start.**

Twenty conversations produce hundreds of claims, each needing a date, a source, a confidence, a
`because`, and for people, consent. Under phone-first capture that overhead gets skipped "for now",
and within a month the ledger is a notes app wearing a ledger's schema. That destroys the thing that
makes Network Map trustworthy, since its edges inherit the sourcing underneath.

**The defence is structural rather than disciplinary:** an explicit `ungraded` state, loudly visible
in the digest, and excluded from Network Map rendering. Debt quarantined instead of denied.

Second to break: four repositories of guardrail machinery maintained by one person. Sync scripts
drift, CI multiplies, and the apparatus built to protect focus starts consuming it. Parking
ColourMesh cuts that surface by the largest single amount, which is the practical argument for the
strategic call above.

**Integration here is mostly subtraction**: one cockpit, one agent discipline, one ledger, and one
fewer live product.

---

## Still open

- **Whether to park ColourMesh.** Argued for above; not acted on.
- **Whether Colour Sound is an app or a room inside Colour Studio.** The figure draws the
  dependency either way.
- **Whether `ungraded` becomes a real confidence level** in Shipping Map, or a separate inbox that
  never enters the corpus until promoted.

---

## Reflection

Newest first.

### 2026-09-21 — the figure was built to answer a question it then changed

The ask was a lattice mapping the apps: where they are and what needs evolving. The obvious build is
a prettier version of the branch tree with app names in it.

Two things made it a different figure. **Distance from the middle is reachability, not importance** —
the natural reading of a circle is that the centre matters most, and here the centre is only what
someone who is not you could use today. And **an edge must name what passes along it**, because four
projects by one person resemble each other constantly without depending on each other at all.

Applying that second rule is what produced the finding: ColourMesh has no edge in either direction.
That was not visible in any document, and it was visible in the drawing within a minute of the rule
being enforced.

The part most likely to be wrong is the parking recommendation. It is argued from attention cost and
the absence of users, both real — but ColourMesh holds the bridging thesis, and a thesis is easier to
lose than a repository.
