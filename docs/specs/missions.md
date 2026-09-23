# Current Mission

> Active objectives you're working toward today — with space to name the challenge and define the target.

## Context

Tasks without awareness become a grind. Awareness without tasks becomes navel-gazing. Missions sit on the right side of the cockpit so you see what you're doing alongside how you're feeling. The interaction between the two columns IS the product.

## Behavior

- Missions live in a card titled "Current Mission" on the right column.
- Add via a + button in the header. Clicking + reveals an input field. Input hides after adding.
- Each mission is a collapsible card showing the title.
- Clicking the title expands the card to show three collapsible fields:
  - **Objective** — single-line input. "Define the target."
  - **Challenge** — single-line input. "What's making this hard?" Red accent when filled.
  - **Notes** — multiline textarea. "Background, links..." Hidden behind toggle.
- Collapsed mission text must stay readable. User-written mission titles and previews wrap naturally
  to at least two lines, and three or more lines when needed; they must not be cut with ellipsis,
  single-line truncation, or hidden overflow.
- Only one field open at a time within a card.
- Fields auto-save with 800ms debounce.
- Circle checkbox to mark complete. Completed missions move to a "Done" section with strikethrough.
- Delete via ✕ button.

## States & Edge Cases

- Zero missions: show "No missions yet. What are you working toward?"
- New mission: auto-expands after creation so you can fill in details.
- All fields empty: valid. A mission can just be a title.
- Challenge filled: card border tints red to signal a blocker at a glance.
- Completed missions: can be unchecked to reactivate.
- Fetch failure: keep showing the current mission state instead of clearing the card.
- Completion toggle is optimistic. If the patch fails, the mission returns to its prior completed state.
- Delete is optimistic. If the delete fails, refresh missions from the API.

## Done When

- Missions persist across page loads (Supabase).
- Missions load from `/api/missions` for the authenticated user rather than local-only storage.
- All fields auto-save without a save button.
- The card is minimalist when collapsed, detailed when expanded.
- Adding a mission takes one click + typing. No friction.
- Mission text remains readable across Current Mission, Daily Missions, Push for Tomorrow, Mission
  Overview, and Mission Control. Long user-written text wraps instead of disappearing.

## Dependencies

- Supabase auth and database.
- Missions table with: id, userId, title, description, blocking, nextStep, completed, createdAt.

## Next Direction: Mission Control

The current mission card is useful for adding and editing work, but it is not yet a full life-organisation surface. The better version should become **Mission Control**: a page or mode that helps the user sort life into a few active fronts, convert vague pressure into next actions, and connect doing back to feeling.

The Focus mission tab now supports a small design-format pill:

- **Format 1** reads as three parts: the existing **Areas** section, a proper full-width **Tasks**
  collapsible pill, and the existing **Daily Rituals** pill for rituals. Tasks is closed by default.
  Opening Tasks shows the mission cards directly as one flat list. Do not show nested headers for
  Current Mission, Daily Missions, or Push for Tomorrow inside Tasks.
- **Format 2** opens the Mission Control organisation view using the same stored mission data.

Format 2 is an alternative organisation surface, not a separate data model. Users can switch between
formats without duplicating missions. The second format keeps capture simple, then helps the user sort
missions by today, later, and life area. Do not add a separate work-type layer such as Free, Think,
Pro, or Real; those labels made Format 2 feel crammed and too conceptual. The organising spine is
Today / Later / Life Areas, with blocker and next-step context inside each mission.

In Paper, Golden, and light Beige design modes, all mission labels and pills must use dark ink text on
light surfaces. Ochre/gold text is reserved for dark panels where it has enough contrast.

Mission area names and area controls must be readable, not mini chips. Use clear labels such as
`Add area`, `Vertical`, and `Horizontal`; avoid tiny symbolic controls, unlabeled dots, or `+ area`
microcopy for important organisation actions. Area text must adapt to light and dark backgrounds
using theme foreground variables, with dots/color used as support rather than the only identifier.

User-created areas are not only containers for compartments. Each area must also allow the user to
add missions directly inside that area, because the point of Areas is to ask: what do I have to do
in this part of life? Area-created missions should use the normal mission storage shape and carry an
area tag/category id so Mission Control can group them with the rest of the user's active work.

Daily Rituals text must stay readable in dark palettes. Ritual names, section labels, add controls,
counters, and quotes use the same golden/ochre text family as the `Daily Rituals` title rather than
faded muted typography.

### Product Shape

Mission Control should have five zones:

1. **Command Line** — one fast input for dumping tasks, worries, plans, or vague obligations. The user should not have to categorize before capturing.
2. **Daily Focus** — the few things that matter today. This is not a giant todo list; it is the current operating lane.
3. **Life Fronts** — missions grouped by life category such as Body, Organisation, Music, Work, Social, Money, Home. These are the stable areas of life.
4. **Road View** — a visual sequence from current mission to next steps to later objectives. It should show movement, not just a list.
5. **AI Organiser** — a scoped assistant that can read the mission dump and suggest grouping, next steps, blockers, and category links. Suggestions are never applied silently.

### Mission Anatomy

A mission should eventually carry:

- **Why** — what this mission serves.
- **Next visible step** — the smallest concrete action.
- **Blocker** — what is making it hard.
- **Life category** — the area of life it belongs to.
- **Time horizon** — today, this week, later, someday.
- **Energy mode** — admin, creative, body, social, focus, recovery.
- **Evidence trail** — linked check-ins, reflections, day-map blocks, and notes.

### Better UX Principles

- Capture should be frictionless; organisation can happen later.
- The page should distinguish `mission`, `task`, `habit`, and `worry`. Mixing them creates overwhelm.
- Only a small number of missions should be active at once. The rest belong in later/someday lanes.
- Completing a mission should feed the reflection layer: what changed in mood, pressure, or clarity?
- The AI should help the user see the real structure: "these five tasks are all Organisation," or "this blocker has appeared three times this week."
- Missions should connect to the block/flow pattern system. A mission is not only a task; it can be
  evidence that an area is blocked, flowing, avoided, repeated, or ready for a bridge action.

### Progress Pattern Link

Future Progress should read mission history alongside check-ins, categories, day-map blocks, and
notes. The goal is to show repeated life patterns such as:

- an Organisation task appearing for days while Education activity increases
- a Body mission improving mood after completion
- a creative flow repeatedly used as recovery after admin pressure
- a blocker reappearing across unrelated-looking missions

The UI should express this as simple visual paths first: colour-dot trails, repeated loops, blocked
river segments, and possible bridge roads. AI can name the pattern and offer interpretations, but it
must show the evidence and ask before saving any new category, pattern, or mission change.

### AI Mission Agent

The AI assistant can support missions through confirmable actions:

- Turn a vague note into a mission proposal.
- Break a mission into 3 next steps.
- Identify the likely blocker.
- Suggest a life category.
- Move non-urgent items out of Today.
- Create a weekly mission summary.

The assistant must ask before writing changes. It can propose: "I can turn this into three missions: Shoulder, Admin, Music. Save these?" The user confirms or edits.

---

## Standing dates — the admin the app has to remember for you

Some obligations are not missions. A mission is something you could do today. These are things that
**cannot be done yet** and that become worthless if the date passes unnoticed.

They need a different treatment for a specific reason: a to-do list shows them constantly and you
learn to scroll past them, or it hides them until they are due and nothing surfaces them in time.
Both fail. A standing date is stored once, stays silent, and speaks in a window before it lands.

Recorded here rather than only in a database because `0021_mission_movement_and_digests.sql` — which
adds `due_on` to missions — has not been run. Until it has, this file is the record, and that is
the honest place for it. When the migration runs these become rows, and this section becomes the
seed list rather than the storage.

| Date | What | Why it is easy to lose |
| --- | --- | --- |
| **2027-09-07** | **Re-file the ALJF caution claim — CHF 520.** Write to `ca@aljf.ch`, copy `aljfcompta@gmail.com` and `comite@aljf.ch`, with bank details. | Nothing is automatic. A claim filed on 2026-09-18 was refused as premature, so the obvious mental note — *"I already asked"* — is exactly the wrong one. Eleven months of silence, then one day it is claimable. |
| **2026-11-30** | Subside d'assurance-maladie 2027. Strict deadline. | CHF 4 176 turns on it, and it depends on being registered in Pregny-Chambésy first — so the real deadline is earlier than the stated one. |
| **2026-12-14** | Attestation LAMal for the school, requested from Sanitas. | Needs an unpaid-balance check first; a March invoice left open would block it. |

### What makes a standing date, and what does not

A standing date has all three:

- **A fixed date that cannot be brought forward.** If you could do it sooner, it is a mission.
- **A real cost if missed**, nameable in money, a document, or a status.
- **Nobody else will chase it.** An invoice chases itself. An association holding CHF 520 for a
  year does not.

Everything else is a mission and belongs in the ordinary queue.

### The reminder window

`scripts/brain-digest.ts` already carries `SOON_WITHIN_DAYS = 14`, which is right for a mission with
a due date and wrong for these. Fourteen days' notice on a date eleven months away means the record
sits silent for three hundred and thirty days and then depends entirely on one digest being read.

**Two windows, not one.** A far horizon (roughly a month out) says *this is coming and here is what
it needs*. A near one (about a week) says *now*. The first exists so the second is never the first
you hear of it.

Deliberately not built yet. It needs `due_on`, which needs the migration, and inventing a second
reminder mechanism before the first one has rows would be building on nothing.
