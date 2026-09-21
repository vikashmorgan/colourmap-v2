# The integrated system

**Status:** specified, not built. Written 2026-09-20.

The app is where a life is recorded. The terminal is where it gets thought about. This spec says how
the two connect, which direction data flows, and the rule that keeps the notebook honest.

Companion to [`colour-brain.md`](colour-brain.md).

---

## The shape

> **The app is the record. The terminal is the thinking. The confirmation stays with the person.**

Writing happens in the app — on a phone, in the morning, in thirty seconds. Reading and reasoning
happen in a terminal session with an agent that can hold a month of notes at once and notice what a
person rereading their own journal cannot.

Nothing generated in the terminal is written into the notebook.

---

## The rule this rests on

`docs/product.md` already states it:

> **"The AI proposes, the user confirms. The user writes the story. The app holds the pen."**

That sentence decides the architecture, not just the tone.

**Reading is free. Writing is not.** The agent reads notes, check-ins and missions. It never writes
into them. Anything it produces — a proposed mission, a pattern, a question worth sitting with —
lands in a separate **proposals** table that the app surfaces for acceptance or rejection.

The reason is not caution about quality. It is that **a journal an AI has quietly edited is no
longer a record of what the person thought.** The value of six months of notes is that they are
uncontaminated. One round of helpful rephrasing destroys the only thing that made them worth
keeping.

---

## Three ways to connect, and the order to do them in

### 1. A read script in the repo — build this first

`scripts/brain-read.ts`, taking a question and printing structured output:

```
bun scripts/brain-read.ts notes --since 2026-09-01
bun scripts/brain-read.ts checkins --last 30
bun scripts/brain-read.ts missions --open
```

The elegant part is the boundary it respects. **The script reads the service key from `.env.local`;
the agent reads only the script's output.** The repo's Claude settings hard-deny `Read(.env*)` and
`Write(.env*)`, and this design keeps that intact rather than working around it — the secret is used
without ever being seen.

An afternoon's work, and it is enough for the weekly session.

### 2. The Supabase MCP server — add when the script chafes

Live queries with no script per question. Better once the questions stop being predictable. Slightly
more setup, and it hands the agent broader database access, which is a reason to do it second rather
than first.

### 3. An authenticated export route — probably never

Most work, least benefit, and it puts a data-egress endpoint on a public deployment for the sake of
a local convenience.

---

## What the agent may read, and what it may not

| | |
| --- | --- |
| **Read** | Notes, check-ins, missions, branch activity, what moved and when |
| **Write** | Only the `proposals` table. Never notes, never check-ins, never missions directly |
| **Never** | Anything belonging to another person. ColourMesh's data is a different app and a different question |

### Handling, stated plainly

A journal is the most personal data this person holds, and reading it into a session puts it in the
agent's context. That is the price of the work being possible, and it makes two rules non-negotiable:

- **Raw journal content never leaves the machine.** Not in a commit message, not in a pull request,
  not in an artifact, not in a summary sent anywhere.
- **Structured output, never bulk dumps.** The reader returns what was asked for. There is no
  `--everything`.

---

## The weekly session

The thing the terminal can do that rereading cannot:

- **Contradiction over time.** *You wrote this in week one and the opposite in week three.*
- **Silence.** *Energy has had nothing in it for eleven days.* Absence is invisible when scrolling
  and obvious in a query.
- **Drift between stated and actual.** Missions say one thing; where the time went says another.
- **Proposals.** Missions for the coming week, written as suggestions, confirmed in the app.

Not summarising the week back at the person. They were there. The value is the pattern they cannot
see from inside it.

---

## How the branches get fed

Each branch shows one live thing, pulled from wherever the work happened. One Supabase project,
several front doors — see [`colour-brain.md`](colour-brain.md).

| Branch | Fed by |
| --- | --- |
| **Art** | Colour Studio, Colour Sound — last piece, last track |
| **Admin · professional** | Shipping Map, the masters calendar |
| **Admin · life** | The tracking documents — see below |
| **Energy** | Routines, habits, how the body is |
| **Centre** | Today's check-in |

### Life admin is where this starts paying

Life admin is the branch with the most weight in a real week and **no surfaces at all**
(`colour-brain.md` records this as a finding, with a test that breaks when it stops being true).

Its prototype already exists and lives in the wrong place: two HTML tracking documents on a desktop,
written by the agent, holding deadlines, what is waiting on whom, and reference numbers. They work
— and they are invisible from a phone and unknown to the app.

**Bringing them in is the first real test of this whole design**: the agent maintains them from the
terminal, the app displays them under Life admin, and the person reads them on a phone. Every part
of the loop is exercised by something already useful.

---

## Build order

1. **`scripts/brain-read.ts`** — the reader. Afterwards the weekly session works.
2. **The `proposals` table and its surface** — so the agent has somewhere to put things that is not
   the notebook.
3. **Life admin as a real surface**, fed from the terminal, read on the phone.
4. **The Supabase MCP server**, when the script starts feeling narrow.

---

## Where the asking happens

This inverts the line at the top of this spec, and the inversion is right.

"The app is the record, the terminal is the thinking" put every *question* in the
terminal. But the questions arrive on a phone, in a queue, across several
projects at once — and a terminal you have to be sitting at is a bad place to
collect them. So:

> **The app is the queue and the map. The terminal is the worker.**

You write missions in Colour Brain. They land on the tree under the branch they
belong to. The terminal reads the queue, does the work, and writes status back.
Nothing about the reasoning changes — the notebook still nobody's to edit but
yours — what changes is that the *asking* no longer requires a keyboard in a
repo.

**Execution stays in the terminal, and that is not a staging post.** An agent
doing real work needs the filesystem, the repos, the test suites and the git
history. A phone has none of those and will not grow them. The hybrid is the
end state, not a step toward running everything in the app.

### What the tree gains

Today the figure counts routes: a picture of structure, true but static. With
missions on it, it shows **state** — which is what makes it worth keeping
permanently on screen rather than being a diagram you look at once.

| Shown | What it actually means |
| --- | --- |
| **Moving** | Something happened recently — a commit, a status write-back, a file changed |
| **Stalled** | Open, and nothing has touched it in a while |
| **Urgent** | Carries a date, and the date is close |
| **Waiting** | Blocked on somebody who is not you |

### The rule that keeps this honest

**"Actively growing" has to be a fact or it is decoration.** Movement means a
real event was recorded against the mission. It must never be inferred from
enthusiasm, from how recently you looked at it, or from anything the app can
generate about itself.

And it must not become a scoreboard. Urgency from a date is a fact. Movement is
a fact. *"Art is your most productive branch"* is a ranking, and this product
does not rank — the same line `lib/branches.ts` holds when it forbids counts in
a branch blurb.

---

## Shaping your own tree

Right now the structure is a constant in `lib/branches.ts`. The next step is
editing it from the app: renaming branches, adding and removing groupings,
changing what sits where.

That appears to collide with the governing rule, **a branch is computed, never
stored**. It does not, once the layers are separated:

- **The structure is stored.** Branches, groupings, names, order — this is *your*
  tree, and it is data.
- **Placement is still computed.** A thing is never filed into a branch by hand.
  It matches a rule in the structure, and changing the structure re-sorts
  everything with no migration.

So the rule narrows rather than breaks: an item's branch is computed *from a
stored structure*. What it was always protecting — no per-item filing, no
migration when you change your mind — survives intact.

**You first, then everyone else.** The tree gets built for one life before it is
built for many, which is the right order: a structure derived from one real week
beats a configurable one derived from nobody's.

The thing to keep clean meanwhile is the **boundary**, not the generality. As
long as the app reads the tree only through `lib/to-mandala.ts`, a second
person's tree is another row behind that function rather than a rewrite of
everything above it. Generality is cheap later if the seam is honest now; it is
very expensive later if it is not.

---

## Open questions

- **Does the agent get write access to `proposals`, or does it print and the person pastes?**
  Printing is safer and clumsier; a table is smoother and is a write path into the database.
- **How long is the window?** A month of notes is readable; a year is not. Some summarisation has to
  happen somewhere, and if the agent does it, the summary becomes a thing that can be wrong.
- **What happens on a bad week?** A system that notices silence in Energy for eleven days can be
  useful or can be a nagging machine. The difference is tone, and tone is not specified here.
- **Does the check-in history belong in the same read path as the notebook**, or is emotional data
  a separate consent?

---

## Reflection

Newest first.

### 2026-09-21 — the asking moved into the app

This spec opened by putting the record in the app and the thinking in the
terminal. That split was too clean. It quietly assumed every *question* starts
at a keyboard in a repo, and in practice they start on a phone, in a queue,
across several projects at once.

So the app takes the queue and the map, the terminal keeps execution, and the
tree stops being a picture of structure and starts showing state. The part of
the original that survives untouched is the important one: reading is free,
writing lands in proposals, and nobody edits the notebook.

The second change is larger and was nearly refused on principle. "A branch is
computed, never stored" reads like it forbids an editable tree. It does not —
it forbids *per-item filing*. Storing the structure while computing placement
from it keeps everything that rule was protecting, and the refusal would have
cost the product the thing that makes the tree someone's own.

### 2026-09-20 — written

The obvious design was to give the agent write access to the notebook so it could enrich entries
directly. That is wrong for a reason the product document had already worked out and the spec nearly
walked past: **the notebook's value is that nobody has edited it.** An agent improving the prose of
a journal is destroying the evidence it was collecting.

The second thing nearly got designed away: the `.env` block. The repo's settings deny the agent any
access to `.env*`, and the first instinct was to treat that as an obstacle to route around. It is
not an obstacle, it is the design — a script can hold a secret the agent never sees, and building to
that constraint produced a cleaner architecture than ignoring it would have.
