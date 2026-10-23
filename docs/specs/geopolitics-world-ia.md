# Geopolitics "World mode" — Information Architecture Evolution

**Status:** Specced, not yet built. Deferred 2026-06-19.
**Owner:** Martin
**Branch when picked up:** `feature/world-mode-ia`
**Protected path note:** touches `docs/specs/**` → Lane B (human review before merge).

## Why this exists

The World mode (`/education/world`, code in `components/GeopoliticsWorld.tsx`,
data in `lib/geopolitics-content.ts`) is content-rich but the navigation
overwhelms. Martin's aim, in his words: *"a clearly organised menu and
progression so the user is clear and not overwhelmed."*

This spec captures the full restructure agreed in the 2026-06-19 design
session so it can be implemented later as one PR.

## The root problem

The data model nests four levels — **Category → Program → Chapter → Page** —
and the hub (`CategoryGrid`, `GeopoliticsWorld.tsx:125-415`) renders all four
at once on every card: tier header → category title → category blurb → program
title → program blurb → duration → a full `<ol>` of every chapter. Six text
layers per card × 7 cards. That is the overwhelm.

Confirmed structural issues:

1. **Category and Program are duplicates.** Every one of the 7 categories in
   `GEOPOLITICS_CATEGORIES` (`geopolitics-content.ts:1774`) contains exactly one
   program. The user reads "Hormuz Crisis" (category) then "Hormuz Crisis
   Briefing" (program) — an extra level and a duplicate title for no meaning.
2. **Two timescale enums that disagree.** `Category.tier` = `now | decade |
   horizon` (`:121`) and `Page.timeframe` = `now | this-decade | long-arc`
   (`:18`). Same concept, different names, never reconciled — a page can sit in
   the `decade` tier yet carry `timeframe: 'now'`.
3. **"What do I read next?" has five competing answers** in the reader:
   `dependsOn` chips ("Read first"), `feedsInto` chips ("Then go"), `related`
   (defined in the type, never rendered), chapter prev/next, and the segment
   pills. Choice paralysis.
4. **No back-trail.** Following a `feedsInto` chip jumps you into a different
   chapter/program; the breadcrumb silently swaps and "back" goes to the
   library, not where you came from. Users get lost after a jump.
5. **Intel dashboard is orphaned.** `ShippingIntelDashboard` (the live
   operational layer, most valuable surface) is reachable only as a small
   header pill next to Map/Graph/Space and is visually equal to unfinished
   shells.

## Target information architecture

Replace the all-at-once hub with a calm **three-step spine**, each screen
answering exactly one question. Add a visible **read-progress** model so the
user always knows where they are.

```
① HUB  "Which world?"          ② WORLD  "Where am I in it?"      ③ READER  "The claim"
─────────────────────────      ─────────────────────────         ──────────────────
NOW                            ‹ Hormuz Crisis        #B85A2E    ‹ back to Hormuz Crisis
  ┌────────┐ ┌────────┐         75 min · 3 chapters · 4/12 read
  │ tint   │ │ tint   │
  │ Hormuz │ │ M.East │         ① What is the Strait?  ✓✓✓✓✓     Chapter 2 · page 1 of 5
  │ 1 line │ │ 1 line │         ② Escalation 2026      ✓✓·· ·    ───────────────
  │ 75min  │ │ 40min  │         ③ Alignment            · · · · ·  [ the page, one primary next ]
  └────────┘ └────────┘            ↑ tap a chapter → jump in
DECADE …                          per-page read ticks
HORIZON …
+ a "Today / Intel" entry
  pinned in the NOW tier
```

### ① Hub — a scannable menu

- Lean card per world: tint cover · title · one-line blurb · quiet meta
  (`75 min · N chapters · X/Y read`). **Remove** the program button, the
  program blurb, and the inline chapter list from the hub.
- Keep the three tiers (Now / Decade / Horizon) as the menu's shape, with their
  existing one-liners (`TIER_DEFINITION`).
- Tapping a card opens its **World screen** (not the reader directly).
- **Pin the Intel dashboard** as a first-class entry inside the NOW tier
  (e.g. a "Today — live shipping & chokepoints" card), not a header pill.

### ② World screen — the progression (NEW)

- Header: world title, blurb, tint, aggregate progress (`4 of 12 pages read`).
- Body: chapters as a **numbered vertical path**, each chapter expandable to its
  pages, with a per-page read tick. This is the screen that was missing — it is
  where "progression" lives.
- **Flatten the Program layer here:** because each category has one program,
  render chapters directly with no program-title row. If a category ever gains
  a second program, render programs as labelled sections within the world.
- Tapping a chapter or page opens the **reader** at that point.

### ③ Reader — one claim, one primary next

- Keep the page content (BLUF, body, sources, trust badge) as-is.
- **Back returns to that world's screen**, not the library.
- Make chapter prev/next the spine (segment pills stay).
- **Demote** `dependsOn` + `feedsInto` into a single collapsible "Connected"
  section below the primary Next, instead of two competing chip rows.
- Either **wire up `related`** inside that same section or **delete it** from
  the `Page` type — do not leave it defined-but-unused.
- **Back-trail:** maintain a small in-session navigation stack so a graph jump
  is reversible ("‹ back to <previous page>"), distinct from "back to world".

## Read-state / progress model

- Track read pages in `localStorage` (key e.g.
  `colourmap:geopolitics-world:read`), later syncing to Supabase per the
  platform pattern. A page counts as read when opened (or scrolled to end —
  decide at build time; opened is simplest for V1).
- Expose helpers in `geopolitics-content.ts`:
  - `markPageRead(slug)`, `isPageRead(slug)`
  - `worldProgress(categorySlug) -> { read: number, total: number }`
  - `chapterProgress(chapterSlug) -> boolean[]` (per-page ticks)
- The hub meta line and the World-screen ticks both read from these.

## Data-layer changes

- **Merge Category + Program (optional, lower priority).** Cleanest end state:
  drop `Program` and hang `durationMinutes` + `chapters` directly on `Category`
  (rename concept to "World"). **Risk:** `program` is referenced by
  `geopolitics-content.ts`, `GeopoliticsWorld.tsx`, `geopolitics-graph.ts`,
  `GeopoliticsSpace.tsx`, and `geopolitics-content.test.ts`, plus helpers
  `firstPageOf(programSlug)`, `pagesByTag` (returns `programSlug`), `locatePage`
  (returns `program`). If merging, update all of these together. If the festival
  or other priorities make this risky, **flatten visually only** (keep the type)
  — the user-visible win is identical.
- **Unify the timescale enum.** Keep `tier` on the world; drop `Page.timeframe`
  or derive it from the world's tier. Reconcile naming (`now | decade | horizon`).

## Files to change

| File | Change |
|---|---|
| `components/GeopoliticsWorld.tsx` | Add third view state (`activeWorld`); split `CategoryGrid` into lean `HubMenu` + new `WorldScreen`; reader back→world; demote graph chips to one "Connected" block; add back-trail; pin Intel into hub. |
| `lib/geopolitics-content.ts` | Read-state + progress helpers; (optional) Category/Program merge; enum unification. |
| `components/ShippingIntelDashboard.tsx` | Surface from the hub as a NOW-tier entry; ensure `onOpenPage` round-trips back into the reader. |
| `components/GeopoliticsWorld.test.tsx` | Rewrite for the 3-step flow (old test clicks hub-level `open-program-*` buttons and asserts `world-hub` on back — both move). |
| `lib/geopolitics-content.test.ts` | Tests for new progress helpers; update if types merge. |
| `docs/specs/geopolitics-platform.md` | Update the IA section to match (protected path). |

## Testing requirements (per `rules/testing.md`)

- Component tests for each of the three view states and the transitions between
  them (hub→world→reader→back-to-world→back-to-hub).
- Unit tests for every new progress/read-state helper (happy path + empty +
  fully-read).
- Behaviour-based, not snapshot. Coverage must not regress.
- This is a **user-visible behaviour change** → NOT `no-spec-impact`. Update
  `geopolitics-platform.md` first, then tests, then code.

## Phasing (if not done in one PR)

1. **Spine + hub clarity** — `HubMenu` + `WorldScreen` + reader back-to-world.
   Highest UX impact, lowest risk (no data migration). Visually flatten Program.
2. **Read-state / progress** — helpers + ticks + hub meta.
3. **Reader "next" cleanup** — collapse chips into "Connected", add back-trail,
   resolve `related`.
4. **Intel re-home** — NOW-tier entry.
5. **Data-type merge + enum unification** — internal, do last, its own commit.

(Martin asked for all of this in one PR; phasing above is the fallback if scope
or the Gstaad festival deadline forces a split.)
