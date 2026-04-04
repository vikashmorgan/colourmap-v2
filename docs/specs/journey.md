# Journey

> The narrative layer that turns data into story — archetypes, tones, maps, and a companion that reflects your path.

## Context

Check-ins accumulate but never synthesize into meaning. The Journey page transforms raw emotional data into a personal narrative. Check In is clarity. Journey is style — same data, reframed through archetype and tone.

## Core Components

### 1. Tone System (5 voices)

Collapsible picker. Shows active tone as small pill. Tap to expand all 5 options.

- **Cowboy** (The Cowboy) — Laconic, honest, earthy metaphors
- **Warrior** (The Warrior) — Disciplined, martial, respectful
- **Princess** (The Guide) — Graceful, poetic, nurturing
- **Mythologic** (The Oracle) — Symbolic, archetypal, layered
- **Practical** (The Analyst) — Data-driven, structured, no metaphors

Tone persists in localStorage. Colors the UI accent and all AI output.

### 2. Archetype System

5 main archetypes, selectable. App suggests one from data, user chooses.

- **The Artist** (purple) — Feeling deeply, chaos as canvas
- **The Architect** (ochre) — Building order from chaos
- **The Psychologist** (blue) — Understanding patterns beneath
- **The Warrior** (red) — Facing what others avoid
- **The Alchemist** (green) — Turning lead into gold

Inner archetypes per category (Feeling/Doing/Sharing) shown as compact horizontal row.

### 3. Chapter System

Editable title, centered. Saved to life_scan_answers.

### 4. Soul Map

See [soul-map.md](soul-map.md).

### 5. Personality Map

See [personality-map.md](personality-map.md).

### 6. Life Timeline

See [life-timeline.md](life-timeline.md).

### 7. Cat Companion

AI reflection partner. "Reflect on my journey" sends context to Claude Haiku. Responds in chosen tone voice, 3-4 sentences.

### 8. Logbook

Structured dark period support. 5 questions: how dark (Shadow/Heavy/Fog/Storm/Abyss), trigger, recurrence (First time/Sometimes/Often/Cycle), what helps, what you need.

**Memory system**: saves past entries in localStorage. "Look up — you have been here before" opens The Heavens view showing: what brought you back, past triggers as pills, history strip. AI companion receives past wisdom as context.

## Page Flow

Title → Tone (collapsible) → Chapter → Archetype (single card, expandable picker) → Inner Archetypes (compact row) → Soul Map (clickable territories) → Personality Map → Life Timeline → Cat Companion → Logbook

## Done When

- All 8 components render and function
- Tone, archetype, chapter persist
- Soul map territories are clickable and writable
- Personality parts save with needs/triggers/strength
- Life timeline supports add/drag/zoom
- Logbook saves history and shows past wisdom
- Cat companion streams tone-appropriate reflections
