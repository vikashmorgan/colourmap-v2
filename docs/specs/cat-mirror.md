# Cat Mirror

> A visual emotional mirror — the cockpit cat transforms in real time based on your check-in state, turning the mascot from decoration into the emotional heartbeat of the app.

## Context

The portrait check-in concept (see `COLOURMAP /PORTRAIT CHECK IN/`) uses a central character whose visual mood shifts with the emotional slider. The character acts as a mirror — you see your state reflected back through warmth, posture, and color.

Colourmap replaces the human portrait with the **Cockpit Cat** — the app's existing mascot (brown line-art captain cat with ship wheel). The cat is already specced as "core, not gimmick" and described as an emotional safety layer: people project onto a cat what they won't type into a blank field.

Today the cat is a static resizable image (`CockpitCat.tsx`). This spec turns it into a **living emotional mirror** positioned as a new box directly below the Check-in form.

## Placement

**Desktop:** A new box in the left column, between Check-in and History:

```
LEFT COLUMN                RIGHT COLUMN
┌──────────────────┐      ┌──────────────────┐
│   Check In       │      │   Day Map         │
│   (slider+note)  │      │                   │
├──────────────────┤      ├──────────────────┤
│   Cat Mirror     │ NEW  │   Missions        │
│   (this spec)    │      │                   │
├──────────────────┤      ├──────────────────┤
│   History        │      │   Checklist       │
└──────────────────┘      └──────────────────┘
```

**Phone:** Appears directly below Check-in, above the Cockpit accordion. No CollapsibleCard wrapper — always visible. The cat is a calm, persistent presence.

Implementation: add `'cat-mirror'` to `DEFAULT_LEFT` in `page.tsx` between `'check-in'` and `'history'`. Remove `'cat'` from `DEFAULT_RIGHT` (the old static cat is replaced).

## Anatomy

```
┌─────────────────────────────────────────┐
│                                         │
│            ╭─────────────╮              │
│           ╱   aura ring   ╲             │  ← Concentric rings
│          │  ┌───────────┐  │            │     tinted by Hawkins
│          │  │           │  │            │     color. Subtle sacred
│          │  │  CAT SVG  │  │            │     geometry: losange
│          │  │  (pose)   │  │            │     accents at N/S/E/W
│          │  └───────────┘  │            │
│           ╲               ╱             │
│            ╰─────────────╯              │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  "I see you, captain."          │   │  ← Speech bubble:
│   │                                 │   │     AI insight (2 lines)
│   └─────────────────────────────────┘   │     or poetic word from
│                                         │     emotional vocabulary
└─────────────────────────────────────────┘
```

### Components

1. **Aura Ring** — SVG concentric circles around the cat. Color transitions smoothly with the Hawkins slider value. Inspired by the Soul Map's topographic rings and the 3 Doors wheel design.

2. **Cat SVG** — 7 pose variations (one per Hawkins band), brown line-art style matching the existing captain cat. Simple, warm, not cartoonish. Transitions between poses with a 400ms CSS crossfade.

3. **Speech Bubble** — Small, below the cat. Two modes:
   - **Before submit:** Shows the current emotional vocabulary word (e.g., "Surviving", "Grounding", "Radiating") as a gentle label.
   - **After submit:** Shows the 2-sentence AI insight from `PostCheckInInsight`. This replaces the current separate insight component — the cat *says* the insight.

4. **Losange Accents** — Four small diamond shapes at cardinal points of the aura ring (top, right, bottom, left). Subtle sacred geometry touch. Same `#C4A060` gold as existing losange dividers.

## Cat Poses (7 States)

Mapped to the Hawkins-inspired emotional scale and the existing emotional vocabulary:

| Slider Range | Vocabulary Word | Cat Pose | Ring Color | Energy |
|---|---|---|---|---|
| 0–14 | Surviving | Curled tight, eyes closed | `#8B6F6F` muted rose | Contracted |
| 15–28 | Enduring | Sitting hunched, ears flat | `#7A8B8B` dusty slate | Heavy |
| 29–42 | Processing | Sitting upright, neutral gaze | `#A89080` warm taupe | Neutral-low |
| 43–57 | Grounding | Standing calm, paws steady | `#8FA68A` sage green | Grounded |
| 58–71 | Opening | Walking, tail lifting | `#C4A265` warm gold | Opening |
| 72–85 | Flowing | Light step, eyes bright | `#C09B8C` dusty rose | Expansive |
| 86–100 | Radiating | Captain pose at wheel, upright | `#D4B896` radiant cream | Radiating |

The slider ranges align with the 8 emotional vocabulary words in `lib/emotional-vocabulary.ts` (collapsed to 7 for pose economy — "Awakening" merges with "Opening").

## Aura Ring Behavior

- 3 concentric SVG circles: inner (r=60), middle (r=80), outer (r=100)
- Each ring is the Hawkins-mapped color at decreasing opacity: 30%, 15%, 8%
- Rings use `transition: all 600ms ease` for smooth color shifts
- Optional: subtle pulse animation (scale 1.0 → 1.02 → 1.0 over 4s) synced with breathing rhythm
- The 4 losange accents sit on the middle ring at 0°, 90°, 180°, 270°

## Speech Bubble Behavior

- Renders below the aura ring with a small upward-pointing triangle connector
- **Idle state (no recent check-in):** Shows the emotional vocabulary word matching the slider position, in Cormorant Garamond italic. Updates live as slider moves.
- **Post-submit (0–12s):** Fades in the AI insight text (2 sentences from Claude Haiku). Same content as current `PostCheckInInsight` but spoken by the cat. Auto-fades after 12 seconds.
- **Post-submit (12s+):** Returns to showing the vocabulary word of the last check-in.
- Max 2 lines. Font: 13px Inter Light. Color: `text-muted-foreground`.

## Integration with Existing Components

### Replaces
- `CockpitCat.tsx` — The static resizable cat. Cat Mirror absorbs its role.
- `PostCheckInInsight.tsx` — The AI insight moves into the cat's speech bubble.

### Reads From
- `CheckInForm` — Needs the current slider value in real-time (before submit) and the submitted value (after submit). Lift slider state to parent or use a shared context.
- `PostCheckInInsight` API — Same `/api/check-ins/insight` endpoint for the 2-sentence reflection.
- `lib/emotional-vocabulary.ts` — Maps slider value to vocabulary word.

### Layout Change in `page.tsx`

```typescript
// Before
const DEFAULT_LEFT = ['check-in', 'history'];
const DEFAULT_RIGHT = ['energy', 'mission', 'cat', 'back-of-mind', 'programs'];

// After
const DEFAULT_LEFT = ['check-in', 'cat-mirror', 'history'];
const DEFAULT_RIGHT = ['energy', 'mission', 'back-of-mind', 'programs'];
```

Phone layout: Cat Mirror renders between CheckInForm and the diamond divider, with no collapsible wrapper.

## Visual Reference

### Portrait Check-in Inspiration
The original concept (see images in `COLOURMAP /PORTRAIT CHECK IN/`) shows:
- Central character in a warm circular frame
- "How are you right now?" header with slider below
- Quick-select pills (Energy, Direction, Connection)
- Warm golden/ochre/beige palette
- The character's visual mood shifts with the check-in state

### Colourmap Cat Assets
- `PNG_files/Cockpit cat .png` — Captain cat with ship wheel (brown line-art)
- `PNG_files/Pti chat .png` — "Attitude: Own Your Power" tarot-style card (brown/beige)
- Both use the same warm brown aesthetic that matches the app's Paper theme

### Sacred Geometry Connection
The aura ring draws from:
- **Soul Map** — Concentric circles with contour rings around territories
- **3 Doors** — Circular wheels divided into segments (Feeling/Doing/Sharing)
- **Losange motif** — Diamond accents as recurring Colourmap signature

## States & Edge Cases

- **No previous check-in:** Cat shows in "Grounding" pose (center/neutral). Speech bubble says nothing — just the cat, calm and present.
- **Slider moving (before submit):** Cat pose and ring color update live. Smooth transitions. Speech bubble shows vocabulary word.
- **Submit animation:** Brief glow pulse on the aura ring (200ms). Cat settles into the submitted pose. Speech bubble transitions to AI insight after the breath moment.
- **Multiple rapid check-ins:** Each submit updates the cat. No debounce on visual state.
- **Dragged to right column (desktop):** Works fine — the component is self-contained and responsive.
- **Collapsed CollapsibleCard:** On desktop, Cat Mirror sits inside a CollapsibleCard titled with the current emotional vocabulary word (e.g., "Grounding" instead of a static title). On phone, no wrapper.

## Done When

- Cat SVG has 7 distinct poses, each clearly communicating the emotional band
- Aura ring smoothly transitions color as the slider moves
- 4 losange accents visible at cardinal points of the ring
- Speech bubble shows vocabulary word during slider interaction
- Speech bubble shows AI insight after check-in submit (replaces PostCheckInInsight)
- Component is responsive (centered on phone, fits column on desktop)
- Old static CockpitCat removed from default layout
- Cat Mirror appears between Check-in and History in left column

## Dependencies

- Slider value must be accessible outside CheckInForm (lift state or context)
- Existing `/api/check-ins/insight` endpoint for AI reflection
- `lib/emotional-vocabulary.ts` for word mapping
- 7 SVG illustrations in the captain cat style (can start with 3: low/mid/high, expand to 7)

## Future

- **Cat personality over time:** The cat's idle behavior could evolve based on your check-in history. Frequent low check-ins → cat gently curls closer. Consistent high → cat stands prouder.
- **Cat as unified AI companion:** Same visual entity as the Journey cat companion. Speech bubble expands into a conversation thread when tapped. One cat, one personality, everywhere.
- **Micro-animations:** Tail flick, ear twitch, slow blink — subtle life that makes the cat feel present without being distracting.
