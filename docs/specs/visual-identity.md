# Visual Identity

> The visual soul of Colourmap. A 1949 American typewriter and handwritten letter met a Japanese zen monk at a crossroads. They're still talking.

## The Spine

Colourmap lives at the intersection of three traditions:

- **American 1949 typewriter** — mechanical warmth, Remington / Royal / Underwood era. Monospaced serifs, heavy ink, cream paper, deliberate pacing. Structure.
- **Handwritten letters** — fountain pen in royal blue or sepia, slightly imperfect cursive, marginalia, signatures, folded edges, coffee rings. Blood.
- **Japanese zen** — negative space (*ma*), asymmetry (*fukinsei*), simplicity (*kanso*), naturalness (*shizen*), imperfection (*wabi-sabi*). Breath.

These three traditions share what Colourmap must share: **restraint, weathering, warmth, deliberate pacing, handmade feeling.** They contrast where Colourmap must have tension: **mechanical structure vs. human softness vs. empty space.**

The design identity lives in that tension. The typewriter gives you skeleton. Handwriting gives you blood. Zen gives you the space to hear both.

## Other Voices We Keep

The existing references in the product doc still belong — they're the same aesthetic family, seen from different rooms:

- **Leonardo da Vinci's notebook** — studied annotations, hand-drawn diagrams, sepia ink, marginalia, the inventor's eye
- **Pirate captain's logbook** — weathered parchment, compass rose, nautical authority, navigational intent
- **Cowboy / American old printing press** — display letterforms for emphatic moments, wanted-poster gravitas, frontier type
- **Field journal / drafted paper** — grid lines, rulers, hand-measured sections, the scientist's care

These are not alternatives to the 1949+zen spine. They are **moods within it**. A pirate logbook is a handwritten letter written at sea. A Leonardo notebook is a typewritten page annotated by a genius. A cowboy poster is a typewritten headline inked by hand. They all use paper, ink, and space the same way.

**Rule:** Use these voices as accents and moments, never as a wholesale theme that drowns the spine. The app should always feel like a 1949 typewriter on a tatami mat before it feels like a pirate ship.

## Typography — Three Voices

All type on the page comes from one of three voices. No sans-serif ever. The instant mark of generic SaaS.

### 1. Typewriter serif — structure

- **Examples:** Courier Prime, Special Elite, IBM Plex Mono (serif variant)
- **Speaks:** with authority, slightly imperfect
- **Use for:** labels, timestamps, section headings, system text, uppercase eyebrows (`CURRENT OBJECTIVE`, `LOGBOOK`, `PRESENCE`)
- **Feeling:** mechanical warmth, ink slightly bleeding into paper, each letter deliberate

### 2. Handwritten ink — humanity

- **Examples:** Caveat, Kalam, Homemade Apple, Sacramento
- **Speaks:** with you
- **Use for:** reflections, notes, emotions, objectives the user has written, observations, logbook entries — anything personal
- **Feeling:** fountain pen on cream paper, imperfect loops, a letter to yourself

### 3. Refined serif — ceremony

- **Examples:** Playfair Display, Cormorant Garamond
- **Speaks:** ceremonially
- **Use for:** chapter titles, poetic anchors, emphatic moments, key category names when neither typewriter nor handwriting fits
- **Feeling:** a dedication page, a name carved in stone, the title of a codex

### Cowboy / Display serif — signature moments

Sparingly, for identity beats. Western display letterforms, old printing press, wanted-poster type. Only for moments that deserve it — never as body text.

### Pairing rules

- **Labels typewriter, content handwritten.** Pill: typewriter. What's inside: handwritten. The structure speaks in typewriter, the human speaks in ink.
- **One refined serif moment per view.** Like a fountain pen signature — it loses weight if used everywhere.
- **Never mix two handwritten fonts in the same view.** Pick one ink color, one hand.

## Color Palette

60% paper · 30% ink · 10% accent.

### Paper (60%)

- **Primary cream:** `#F5ECDC` — aged, softly warm
- **Deeper parchment:** `#EDE4CE` — surfaces within surfaces
- **Golden warmth:** `#F2E8D2` — hover states, gentle gradients
- **Never pure white.** Pure white is the death of this aesthetic.

### Ink (30%)

- **Primary ink:** `#5C3018` — deep sepia brown, not pure black
- **Deeper ink:** `#3A2416` — for emphatic text
- **Sumi ink gray:** `#8A6A4A` — secondary text, fine rules
- **Fine rule gray:** `#8A6A4A40` — hairlines
- **Never pure black.** Pure black breaks the paper illusion.

### Accent (10% — one at a time, never more)

- **Ochre gold:** `#C4A060` — the primary accent, the losange, pills, section eyebrows
- **Pen blue:** `#3A5A7A` or `#6890B0` — a single fountain-pen emphasis
- **Bamboo green:** `#7AAA58` — completion, flow, done checkmarks (used sparingly)
- **Deep red-brown:** `#D4805A` — challenge, warning, alert (very sparing)
- **Zen violet:** `#9B6BA0` — reflection, decomposition (reserved for deep work)

### Rule

Any given view uses **one ochre accent plus at most one secondary accent**. Never three accents fighting on the same surface.

## Zen Principles (Spatial)

### Ma (間) — negative space as presence

Every section earns its emptiness. Whitespace is not what's left over — it IS the design. A sparse page of Colourmap should feel like a tatami room: nothing is missing.

**Practical:**
- Sections separated by ≥ 32px vertical space
- Related elements grouped tightly (8–16px)
- Unrelated elements spaced far (24–48px)
- Never fill every pixel. The blank space is the breath.

### Fukinsei (不均整) — deliberate asymmetry

Perfect symmetry feels mechanical. Slight asymmetry feels alive.

- A losange tilted a few degrees
- A line slightly off-horizontal
- A dot off-center by one pixel
- Cells that don't align to a rigid grid
- The eye should have to move

### Kanso (簡素) — simplicity

One primary thing per view. Never shout. When in doubt, remove.

### Shizen (自然) — naturalness

Shapes should feel drawn, not extruded. Borders should have slight wobble. Edges should be softened. The page should look like something a hand made, not a machine rendered.

### Wabi-sabi — beauty in imperfection

- Paper grain visible on surfaces
- Ink that appears slightly uneven
- Hand-drawn rules with small wobble
- Shadows warm and diffuse, never hard-edged
- A corner crease here, a coffee ring there — not literal, but the feeling

## Texture Layer

These are the small details that lift the aesthetic from "clean minimal" to "lived-in codex."

### Paper grain
Subtle parchment texture on card backgrounds. Not a loud pattern — a noise-level texture that makes the surface feel physical.

### Hand-drawn rules
Borders and dividers should have very slight variation — a hand-inked line, not a CSS border. Can be faked with SVG strokes or dashed hairlines.

### The losange (◇)
The signature motif. A small diamond. Used as:
- Section dividers (between blocks of content)
- Toggle buttons and expand gateways
- Accent marks at the end of entries
- Plus-button shape
- Corner flourishes

Always rotated 45°. Always small. Always warm ochre.

### Marginalia
Small hand-drawn elements at the corners or margins — a star, a hatch, a flourish, a wave line. Rare but present. Like a marginal note on a 17th-century manuscript.

### Seals and stamps
For milestones or completed states. A small round stamp in bamboo green. Used once in a great while.

## Depth: a sheet on top

Asked for 2026-11-06: "I like how the notepad has shadows to the back, so it feels like it is on top of the rest. That depth effect is super cool, to be thought of for the evolution of the overall app."

**This is liked, and is a direction for the app's next moves.** The reference is the Statistics notepad (`.notebook` in `content/statistics/index.html`): a sheet of paper lifted over the page, with a 16px gap around it, 16px corners, a thin rule for an edge and `box-shadow: 0 18px 48px rgb(0 0 0 / .3)`. The page stays visible and alive underneath, so you know where you are.

When a surface opens over another, try this before a full page change or a flat panel. Hold it to one lifted sheet at a time, since depth reads only against a calm page. Not built across the app yet: it is something to carry over page by page, starting where things already open on top.

## Motion

Slow. Deliberate. A brush stroke, not a bounce.

- **Duration:** 250–350ms for most transitions; 500ms for contemplative moments (breathing, state changes)
- **Easing:** natural curves (ease-in-out), never spring or bounce
- **Fades over transforms.** Opacity shifts are gentler than movement.
- **Hover:** restrained opacity or color shift, never scale-up more than 1.05x
- **Save confirmations:** soft pulse or gentle color change, never a flash
- **Reveal:** content fades in, never slides abruptly

The motion should feel like a page being turned, not a switch being flipped.

## Forbidden

Things that break the aesthetic instantly. Avoid unless a specific exception is documented.

- **Sans-serif fonts** — the signal of generic SaaS
- **Pure black (#000)** — no paper ever contains pure black ink
- **Pure white (#FFF)** — no paper ever was pure white
- **Hard-edged drop shadows** — shadows should be warm, soft, diffuse
- **Bouncy animation (spring, elastic)** — violates the deliberate pacing
- **Emoji as decoration** — breaks the handmade feel (user-typed emoji in entries is fine)
- **Neon or saturated tech colors** — electric blue, hot pink, lime green, Slack purple
- **Gradients that feel digital** — rainbow, holographic, glassmorphic
- **Iconography in a modern material style** — feather icons are OK; Material Design icons break the voice
- **Loud CSS transitions** — `transform: rotate(360deg)` spins, confetti effects
- **Rounded "pill" buttons that feel Stripe-like** — pills are allowed but must feel paper-stamped, not glossy

## Voice Mapping — Where Each Moment Speaks

| Element | Voice |
|---|---|
| Section eyebrow (`CURRENT OBJECTIVE`, `LOGBOOK`) | Typewriter serif, uppercase, wide tracking |
| User-typed objective | Handwritten ink, large |
| Logbook entries | Handwritten ink, medium |
| Timestamps | Typewriter serif, small, muted |
| Category names | Refined serif (Playfair) |
| Category color dots | Solid accent color |
| Mind / Mode / Presence labels | Typewriter serif, uppercase |
| Dot labels (e.g., "Flowing") | Refined serif, bold |
| Done / completed items | Handwritten ink, strike-through, muted |
| Chapter titles | Refined serif |
| Losange toggles | Ochre diamond, no text |
| Step Back / breathing moments | Handwritten "saved", refined serif instructions |
| Error / validation | Typewriter serif, deep red-brown |

## Check Before Shipping UI

Before any UI PR lands, look at the screen and ask:

1. Does it feel like **paper, ink, and space** — or like a dashboard?
2. Is there **one primary thing** the eye goes to first?
3. Is there **enough emptiness** that the content breathes?
4. Are there **three voices at most** (typewriter, handwritten, refined), used deliberately?
5. Does **one accent color** lead, with at most one secondary?
6. Could you imagine this page in a **1949 letter**, a **Leonardo notebook**, and a **tea ceremony room** — and all three say yes?

If any answer is no, pause and revise.

## Source of Truth Hierarchy

- This document (`docs/specs/visual-identity.md`) — the soul, philosophy, voice
- `rules/design.md` — operational guardrails (8px grid, 4.5:1 contrast, shadcn defaults)

When the two conflict, this document wins on *what the app should feel like*; `rules/design.md` wins on *how to implement safely*.
