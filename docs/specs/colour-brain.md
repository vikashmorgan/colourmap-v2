# Colour Brain

**Status:** branch model built and tested. Figure, extraction and deployment not started.
Written 2026-09-19.

The app stops being a cockpit with thirty rooms and becomes the index of a life that is lived in
several apps. This spec covers the rename, the branch structure, what leaves, how the pieces
connect, and what a day looks like.

---

## The name

`docs/product.md` already contains it:

> **"Life doesn't have compartments.** The notebook, the missions, the check-ins, the songs — all
> one brain."

Colour Brain is not a rebrand. It is the app being called what its own product document says it is.
"Colourmap V2" describes a file; "Colour Brain" describes the thing.

---

## Three branches and a still centre

| | Under it | What it is |
| --- | --- | --- |
| **Art** | Writing · Visual · Music | What gets made |
| **Admin** | *Life:* Money · Messages · Papers<br>*Professional:* Masters · Shipping & trading · Network | What must be handled, and what is being built toward |
| **Energy** | Routines · Habits · How the body is | What you are running on |
| **Centre** | Check-in, notebook, journey | How you are |

Implemented in [`lib/branches.ts`](../../lib/branches.ts), asserted in `lib/branches.test.ts`.

### The rule that makes this compatible with "no compartments"

> **A branch is computed, never stored.**

Nothing is filed anywhere. The database knows what a thing *is*; which branch it appears under is a
pure function over that. Changing the function re-sorts the whole app without a migration. The
branches are how you stand inside one brain, not how you cut it into three.

The figure obeys the same rule: focusing one branch makes the others **recede rather than
disappear**. A reader who cannot see what they turned away from has been navigated, not oriented.

### Why three

Adapted from ColourMesh's `lib/trees.ts`, which uses five and argues the case for evenness: the
scheme it replaced was 3 / 11 / 1, and "rendered as sections it is a heading with eleven things
under it and a heading with one, so it had to stay a filter."

**Five was never the point — evenness was.** Five is what fifteen interest categories divide into.
This is one person's life, and it divides into three.

### Why the centre is not a branch

Check-in, the notebook and how-you-are were nearly filed under Energy, beside sleep and routines.
That would have demoted the trunk into a spoke and cost the product its subject.

**How your body is** belongs in Energy. **How you are** is the middle. Everything else arranges
around it.

### Why Energy and not Feeling

"Feeling" was proposed and rejected for one reason: it collides with the centre. The product's own
first line is *"From energy to clarity"* — Energy is already this product's word for the fuel side,
and clarity is what the centre produces.

### Why Admin forks

Life admin and Professional are different in kind, and Professional is three months old. A branch of
its own would be mostly empty. The fork is declared in code so that promoting it later is a two-line
change rather than a redesign.

---

## Two findings the map produced

Writing the map down turned a naming exercise into a diagnosis. Both are now tests that break when
they stop being true.

**Life admin has no surfaces at all.** Insurance, payments, people owed a reply — the heaviest part
of the owner's week, and none of it exists in this app. The tree renders that half nearly empty on
purpose. It is the clearest available statement of what to build next.

**Art outweighs Admin and Energy combined.** Ten of thirty surfaces are generative visual work. That
is not a branch of a life organiser; it is a second product living inside one.

---

## The ecosystem

Four apps, one database.

| App | Holds | Status |
| --- | --- | --- |
| **Colour Brain** | The index. Check-in, notebook, journey, the tree | This repo |
| **Colour Studio** | Geometry field, figures, star figures, dot-walker, build lab, proportion buddy, atlas, studios, diaporama | To extract |
| **Colour Sound** | Music, sounds | To extract, possibly a room in Studio |
| **ColourMesh** | Sparks, circles, Today's Field | Exists |
| **Shipping Map** | World mode (PRs #210, #212) | Exists |

**One Supabase project, separate repos, separate deployments.** It is always the same person behind
the same login, and RLS already scopes everything by `auth.uid()`. Studio writes a row when a piece
is finished; Brain reads it under Art. No API between apps, no duplicated auth, no sync.

The alternative — a database per app with Brain calling APIs — buys nothing and costs a sync problem
maintained forever.

### The governing line, borrowed

ColourMesh's spec says *"the product is the index, not the conversation."* The same shape applies
here: **Brain is the index of a life; the apps are where the work happens.** Brain does not contain
the sculptures or the tracks. It knows they exist, when they were last touched, and which branch
they belong to.

---

## What leaves, and what is cut

**Extract to Colour Studio** — `/geometry-field`, `/figures`, `/figure-stars`, `/figure-stars-trio`,
`/dot-walker-arena`, `/build-lab`, `/proportion-buddy`, `/atlas`, `/studios`, diaporama.

**Extract to Colour Sound** — `/music`, `/sounds`.

**Move to ColourMesh** — Sparks, Today's Field, Circles. These are the eleven local commits on
`main` that never reached GitHub: posting intentions, finding people nearby with PostGIS, a
resonance inbox, a collective pulse. Good code pointing the wrong way. A solo app does not need
PostGIS, and ColourMesh is literally the product for *who you should meet*.

**Move to Shipping Map** — PRs #210 and #212, twenty thousand lines of world-mode geopolitics.

**Cut** — `/entertainment`, `/extras`, `/proposal`, `/workshop` (981 lines of app architecture
documentation rendered as a page), `/research` pending a look.

**Roughly thirty surfaces become ten**, with most of the loss being relocation rather than deletion.

---

## Deployment and the phone

Nothing is deployed. The app runs on `localhost` only, which means there is no app — there is a
thing on a laptop. This blocks everything else.

**Deploy** — import the repo at vercel.com, set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, deploy. The CLI route needs an interactive login and cannot
be automated from here; the dashboard is faster regardless.

**Do not set `DEV_BYPASS_AUTH`.** `lib/supabase/server.ts` throws on import if it is ever `true` in
production, so a leak breaks the deployment loudly rather than silently serving a fake user.

**Phone** — once deployed, add to home screen. A `manifest.json` and a few meta tags make it open
without browser chrome. No app store, no build step. That is what turns a URL into something opened
at eight in the morning.

**Google OAuth** — the Supabase project needs the production URL in *Authentication → URL
Configuration → Redirect URLs*, alongside `http://localhost:3000/**`.

---

## The daily loop

**Morning, phone.** Open Brain. Check in — one slider, thirty seconds. The three branches sit around
it, each showing one live thing: what is due in the masters, what is unfinished in Studio, whether
yesterday had any movement.

**During the day.** Work happens in the specialist app. Brain is closed.

**Evening.** One note. What moved, what did not.

**Weekly, at a desk.** The admin pass — chase what is outstanding, read what arrived, update the
trackers. This is the session that already happens; it gains a slot.

---

## Build order

1. **Deploy.** An hour, and it unblocks the phone entirely. Everything else is theory until this.
2. **The figure.** A Brain-native `BranchTree` on `/day`, replacing the flat nav. Whole → focused,
   others recede, all text horizontal.
3. **Life admin, for real.** The two tracking documents currently sitting on the desktop as HTML
   files are the prototype of the emptiest branch. Bringing them in closes the loop between the work
   and the app.
4. **Extract Studio.** The largest job, and the one the tree makes obvious rather than guessed.
5. **Move Sparks to ColourMesh.**
6. **Extract Sound.**

---

## Not decided

- **Whether the local `main` and `origin/main` histories get merged or one is abandoned.** They have
  genuinely forked: eleven local commits of social features against Martin's diaporama, visitor mode
  and festival work. See *What leaves* — the answer is probably neither, since the local work belongs
  in another app.
- **Whether the GitHub repository is renamed.** Held until the fork above is resolved, so the URL
  change lands on a settled history.
- **Whether the repository stays public.** It currently is. If that is not deliberate it should
  change, and either way the history wants checking for committed secrets.
- **Whether People becomes a fourth branch.** Friends and family currently live nowhere: not
  Professional contacts, not "people owed a reply". The gap is real; the branch may not be.
- **What `/research` actually is** — 203 lines, no imports, unclear subject.

---

## Reflection

Newest first. What was tried, what was wrong, what replaced it.

### 2026-09-19 — the tree was the wrong first question

The request was to bring ColourMesh's organisation tree into this app, and the obvious move was to
port `LatticeTree.tsx` — 673 lines that already do whole → focused beautifully.

That would have been wrong, and not because of the code. The file depends on ColourMesh's demo data
layer, its mandala types and its self model, none of which exist here. Porting it wholesale means
dragging another product's data shape across to draw a picture.

**What transferred was the reasoning, not the file.** Evenness over count. Computed, never stored.
Recede rather than disappear. Horizontal text. Those are four paragraphs of argument in
`lib/trees.ts`, and they are the valuable part; the geometry is a morning's work in either codebase.

The second correction was larger. The tree is not a feature to add to thirty surfaces — **thirty
surfaces is the problem the tree exists to expose.** Writing the map down immediately produced the
two findings above, and the second of them, that Art outweighs everything else combined, is the
whole argument for extracting Studio. A picture drawn over the existing flat nav would have looked
fine and taught nothing.
