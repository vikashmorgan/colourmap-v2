# The Phone Workflow

`integrated-system.md` states the shape: **the app records, the terminal thinks, the person
confirms.** This spec is the narrower question that shape leaves open —

> **Can the whole loop run with the laptop shut?**

Everything below exists to answer yes, except for one step that is deliberately left as no.

---

## The loop, in five steps

```
  you speak   →   the queue   →   the agent   →   a pull request   →   you merge
   (phone)       (Supabase)     (GitHub CI)         (GitHub)            (phone)
```

Four of those five happen without you. The fifth is the product.

**Only the last step is a decision.** Recording is not a decision — that is why it must never be
able to fail. Merging *is* a decision, which is why it is the one thing that stays manual no matter
how convenient it would be to automate.

---

## What exists, and what does not

| Piece | Where | State |
| --- | --- | --- |
| Record a thought by voice | `MicDot` → `voice_notes` | **Built.** PR #232, unmerged |
| Read it back as text | `lib/transcribe.ts`, Gemini Flash | **Built**, needs a key |
| Missions as a queue | `missions`, `scripts/brain-read.ts` | **Live** |
| Weekly digest, unattended | `.github/workflows/digest.yml` | **Live** |
| Agent that writes code | `.github/workflows/agent.yml` | **Built.** PR #234, needs three secrets |
| Trigger it from the app | `repository_dispatch` | **Not built.** Needs a token first |
| Read and merge PRs on the phone | `/shipyard` | **Built.** PR #235, needs a token |
| The admin document on the phone | title → About dialog | **Built.** PR #233 |

Nothing in the *Built* column has run end to end. Each is unit-tested and each is inert without a
key. **The first real run of each is the actual test**, and that is a statement about tomorrow
rather than an apology.

---

## The four keys, and where each one goes

They live in three separate vaults that cannot see each other. That is the cause of most of the
confusion here, so it is worth stating plainly rather than discovering twice.

| Key | Vault | For |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Vercel → Environment Variables | Reading voice notes |
| `GITHUB_TOKEN` | Vercel → Environment Variables | `/shipyard` listing and merging |
| `ANTHROPIC_API_KEY` | GitHub → Settings → Secrets → Actions | The agent |
| `DATABASE_URL`, `BRAIN_USER_ID` | GitHub → Settings → Secrets → Actions | The agent reading the queue |

Two rules that do not bend:

- **Never `NEXT_PUBLIC_`.** Anything with that prefix is compiled into the bundle and served to
  every browser that opens the page. A token that can push to the repository, in a JavaScript file
  anyone can read, is a repository that is no longer yours.
- **The GitHub token is fine-grained and scoped to this repository.** `Actions: write` and
  `Contents: write` and nothing else.

---

## Tomorrow, in order

Each step is verifiable on its own, and each one earns the next. Stop at any point and what you
have still works.

**1. Run the migration.** Supabase → SQL Editor → paste `drizzle/migrations/0022_voice_notes.sql`
→ Run. It is idempotent; running it twice is safe. *This can be done from the phone.*

**2. Merge the two clean ones.** #233 (admin door) and #235 (shipyard) are Lane A, green, and
touch no protected path.

**3. Add `GITHUB_TOKEN` to Vercel and redeploy.** Open `/shipyard`. It should list the remaining
pull requests with their check state. **If it lists them, the phone can now review.**

**4. Add `GOOGLE_GENERATIVE_AI_API_KEY`, then merge #232.** Record one voice note. Say something
in French with an Italian word in it, on purpose — that is the case the old implementation could
not do at all, and the fastest way to know this one is different.

**5. Add the three GitHub secrets and merge #234.** Then run the agent once from the GitHub app
with an explicit, small task typed into the input. **Watch it.** Read the pull request it opens
before deciding whether the cron ever gets uncommented.

---

## What is deliberately not automated

**The merge.**

It would be one line in `agent.yml` and it is the line that must never be written. The reasoning,
stated once so it does not have to be re-argued at 1am:

A queue filled by voice will eventually contain a misheard note. Not *might* — a transcription
layer that never errs does not exist, and the notes are being dictated in three languages while
walking. The pull request is the only place that gets caught.

`/shipyard` exists for the same reason and is worth reading in the same light. It is a **narrower**
door than the GitHub app, not a faster one: it refuses red checks, refuses unfinished checks,
refuses branches where no checks ran, and refuses Lane B outright — because
`rules/guardrails.md` records that GitHub Free cannot enforce branch protection on a private
repository, so the rule has to live somewhere and here is somewhere.

**The moment `/shipyard` becomes the faster way to merge rather than the safer one, it has stopped
being worth having.** If it is ever tempting to add a "merge anyway", the honest move is to pay for
branch protection instead.

---

## Two things that look like bugs and are not

**Onboarding reappears on a new domain.** `FirstRunOnboarding` stores `colourmap:onboarded` in
`localStorage`, which is per-origin. A new deployment URL means a fresh one. It says nothing about
whether your data is there.

**You are logged out on a new domain.** Cookies are per-origin too. One login, not a recurring one.
The session itself persists correctly — `lib/supabase/proxy.ts` refreshes it server-side on every
request.

The real one, which *is* worth knowing: **an installed iOS PWA has a separate cookie jar from
Safari.** Signing in through Safari does not sign you in inside the installed app. Sign in once
from within the installed app.

---

## Open questions

**Does the agent produce anything worth merging?** Unknown, and unknowable until it runs a few
times. The cron stays commented out until there is evidence. An agent running unattended before
anybody has watched it run once is how a repository fills with plausible nonsense at 6am.

**What happens when a voice note is a mission?** `transcribe()` returns `isIntention`, and nothing
consumes it yet. The obvious move — auto-create a mission — is the wrong first version: it would
make the queue fill with half-thoughts. It should sort a review list first.

**Is one queue enough?** Missions, voice notes and proposals are three tables that a person reads
as one list of *things waiting*. They may want to be one surface. They should not be one table.

---

## Reflection

### 2026-09-21 — the laptop-shut test, and what it exposed

The workflow was designed top-down and then checked against one question: *if the laptop never
opens, where does this stop?* It stopped in three different places, and only one of them was the
one being worked on.

**It stopped at capture**, because voice notes kept only the text the browser produced and the
browser produced nothing on iOS. Fixed by recording first and reading second.

**It stopped at review**, because a PR could only be read properly at a desk — and the obvious fix,
linking to the GitHub app, would have quietly removed the Lane B rule that GitHub Free cannot
enforce anyway. That is how a convenience becomes a regression.

**It stopped at the keys**, which is the least interesting failure and the one that cost the most
time. Three vaults, none of which can see the others, and a `DATABASE_URL` pointing at `127.0.0.1`
that made a migration appear to run and reach nothing. The lesson generalises: *a command that
prints a spinner has told you nothing.* Verify against the thing itself.

The part most likely to be wrong is the optimism in the table above. Eight rows, five of them
built today, none of them run end to end. The honest reading of that table is not "nearly done" —
it is "five separate first runs are still ahead, and first runs are where the design meets what is
actually true."
