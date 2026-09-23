# The Presence Sheet

The dot in the bottom-right corner, and what opens from it.

## The claim

> **Two doors. One question each. No decision before you can write.**

You open this to put something down. Everything below serves that and nothing else.

## Two doors, not three

| Door | For | Lands in |
| --- | --- | --- |
| **Build** | something the app should do | `prompts` |
| **Note** | a thought worth keeping | `notebook_entries` |

The test is one question: **is this for the app, or for me?** Answerable in under a second, half asleep, which is when this gets used.

An earlier sketch had three compartments — prompts, reflect, notes. Three is a taxonomy: you must decide what *kind* of thought you are having before you may write it, and the thought most worth catching is exactly the one that is all three (*"should ColourMesh become network mapping?"* is a prompt and a reflection and a note). Two is a fork, and a fork does not stall you.

## Where a note goes, and why it matters

**`notebook_entries`** — the same store behind the Notes page, where the existing entries live. One notebook, two doors into it: this sheet for capture, `/notebook` for working with them.

A second notes table would have been the exact confusion this was asked to avoid. The sheet is a faster door into something that already exists, not a parallel system.

`title` is derived from the first line, never asked for. Being asked for a title is the moment somebody decides not to write the note.

## The prompt queue

`prompts` is separate from `missions` on purpose. Missions are what a person does; prompts are what gets built. Holding both in one list made the mission list two-thirds noise to the person reading it, and a list you scroll past is a list you stop reading.

The stronger argument is lifecycle: a mission is done when a person did it; a prompt is done when code shipped, and it carries the pull request that answered it.

| Status | Means |
| --- | --- |
| `queued` | written down, nobody started |
| `taken` | a session is working on it |
| `done` | shipped — `pr_url` usually says where, `done_at` always says when |
| `parked` | deliberately not now |

**`parked` exists so that deciding against something is recorded rather than deleted.** A queue whose only exits are *did it* and *gone* loses the reason a thing was dropped, and the same idea returns in three months with nothing to argue against it.

**The open queue reads oldest-first** — the only list in this product that does. A queue read newest-first is a stack, and the thing written at midnight when it mattered most sinks under everything written since.

## How a prompt reaches Claude

**It does not send itself.** A prompt written on a train sits in Supabase, costs nothing, and wakes nothing.

```
you write  →  Supabase  →  (a session runs)  →  brain-read.ts prompts  →  work  →  PR
```

`scripts/brain-read.ts prompts [--all]` reads the queue, oldest first, and shows status, body, note and shipped link.

The automatic version is `.github/workflows/agent.yml`, which is written and merge-ready and needs `ANTHROPIC_API_KEY`. It was declined on cost — roughly $0.50–$2 per run, $20–60/month at realistic use, for a benefit that had not been demonstrated. **That is a price decision, not a design one**, and the workflow stays in the repository for when the answer changes.

Capture was always the hard part. The thought arrives on the train and is gone by evening; the laptop being shut was never what stopped it.

## The sheet is opaque

Not decoration. You open this to put something down, and a panel you can read the page through leaves the page competing for attention. Opaque says the rest can wait.

- `background: var(--card)` at full opacity, plus a scrim over the page
- rises from the bottom edge; rounded top corners only, because it is anchored to the floor
- full width on a phone, capped at 520px
- Escape or a tap on the scrim closes it

## The dot

56px, ochre, bottom-right, clearing the *All one brain* bar rather than sitting on it. It shows `+` closed and `×` open.

This is the same dot that opened the AI presence chat. **The dot was already muscle memory; only what it is for changed.** The chat asked Claude a question and billed per message; this puts something down and costs nothing.

`GlobalAIPresence.tsx` and `app/api/ai/presence` remain in the repository, unmounted. The chat may come back as a third door if it ever earns its cost.

## Failure

**The field clears only on success.** Losing dictated text to a failed request is the same class of failure the voice rebuild existed to remove — the error says *"could not save it — the text is still here"*, and it is.

## Requires

Migration `0023_prompts.sql`. Applied and verified: 8 columns, 4 policies, RLS on.

---

## Reflection

### 2026-09-23 — three compartments, argued down to two

The first proposal was three doors: prompts, reflect, notes. It was argued down to two on the grounds that three forces a classification before the writing, and the ambiguous thought is the valuable one.

Worth recording that **the objection was to three, not to sorting.** Sorting is right; doing it *before* capture is not. That is the same principle the voice rebuild ran on one level up — record first, understand later — and it would have been strange to fix that in the microphone and reintroduce it in the panel above it.

The placeholder **"Drop the fragment here. What is happening?"** is inherited from the chat this replaced. It is the best line in the product and it belongs to Note. A test pins it, because it is exactly the kind of thing a refactor loses without noticing.

**The reading side was deliberately left thin.** No filters, no search, no archive — just the last five under the field. This panel is for putting things down; looking things up is a different posture and deserves a page, not a sheet opened one-handed. A panel that tries to be both becomes a small bad version of each.

**What is most likely wrong:** `parked` may never be used. It is there on the argument that recording a decision against something is valuable, and that argument is untested — if six months pass with no parked prompts, it is a state carrying its own weight for nothing.
