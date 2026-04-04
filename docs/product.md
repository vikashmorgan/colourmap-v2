# Colourmap

> From energy to clarity.

## Inspirations

The product lives at the intersection of two tensions: **presence and action**, **stillness and creation**. Four reference points anchor the philosophy:

- **Thich Nhat Hanh** — Presence as practice. The check-in is a mindfulness bell: you stop, notice where you are, and that noticing is itself the value.
- **David Hawkins** — Emotional states as a spectrum, not binary. The slider draws from his insight that consciousness moves along a scale from contraction to expansion.
- **Steve Jobs** — Simplicity as the ultimate sophistication. The cockpit shows you your state in one glance — no menus, no configuration, no clutter. The product should feel inevitable, like it couldn't have fewer parts and still work.
- **Kobe Bryant** — Relentless alignment between aspiration and daily action. You review what's blocking and what's flowing so you can adjust, not so you can feel good about reflecting.

The product is not a meditation app (pure stillness) or a productivity tool (pure action). It's the bridge: see yourself clearly, then move. Do things, then notice how you feel.

## Core Philosophy

- **Check In is clarity. Journey is style.** Two sides of the same coin. Check-in strips everything bare. Journey takes the same data and reframes it through archetype and tone.
- **The AI proposes, the user confirms.** The user writes the story. The app holds the pen.
- **The cat is core, not gimmick.** The emotional safety layer. People say things to a cat they won't type into a blank field.
- **Clarity is the metric, not happiness.** Getting better = the range narrows, chapters get longer, fears dissolve, notes shift from reactive to observational.
- **Life doesn't have compartments.** The notebook, the missions, the check-ins, the songs — all one brain.

## Target User

The restless reflective person — not a beginner, not an expert. Someone who feels deeply and acts ambitiously but lacks a feedback loop between the two. The pain isn't a single bad moment — it's the persistent absence of a tool that connects who you're becoming with what you're doing.

## Core Loop

**Check in** (notice where you are emotionally) **+ Do** (track today's missions and tasks) **-> Over time, patterns emerge** (the relationship between what you do and how you feel becomes visible) **-> Journey** (the story of who you are and who you're becoming takes shape).

The cockpit has two sides: **feeling** (left) and **doing** (right). They sit side by side because that's the point — constant interaction between practical tasks and body/mind/emotions.

## Design Principles

- **Minimalist by default, open if needed.** Every element starts collapsed or hidden. Detail appears on demand, never forced.
- **Cockpit, not coach.** Shows your state — doesn't tell you what to do.
- **Two columns, one glance.** Left = feeling. Right = doing. Scannable in 5 seconds.
- **Warm, not clinical.** Brown tones, poetic words, breathing room. This is a personal space.
- **The losange.** Diamond shapes as visual motif — section dividers, toggle buttons, accent marks. A subtle signature throughout.

## Navigation

Check In · Overview · Missions · Journey · Notebook · ◇ (Life Scan, Programs, Research)

Phone: Check In · Cockpit · Missions · Journey · Notebook · ◇

## Current Features

### Feeling (left column)

1. **Check-in** — Hawkins-inspired emotional bar with contextual note prompts that change based on emotional level. FGAC trackers (Fear/Gratitude/Avoidance/Confusion) behind a losange toggle with progressive 3-question chains and losange separators. Pulse dots (Body/Attitude/Structure) collapsible. [Spec](specs/check-in.md)
2. **After-Check-in AI Insight** — 2-sentence streamed reflection from Claude Haiku using current + previous check-ins + life scan context. Appears after the breath moment, auto-dismisses in 12s. [Spec](specs/post-submit-reflection.md)
3. **Check-in History (Reflections)** — Timeline spine with colored dots, emotion-tinted rows, day sparkline SVG, FGAC chips, emotion clustering (xN), line-clamp notes, enhanced date headers. [Spec](specs/check-in-history.md)

### Doing (right column)

4. **Day Map** — Hour-by-hour activity tracker with paint-to-create dragging, inline rename/notes, category colors (Movement/Focus/Creative/Rest/Social/Fuel/Routine), smart hour cutoff, time labels on left. **Energy Mountain view** as alternative — stacked colored SVG terrain. Two modes: List / Energy. [Spec](specs/day-map.md)
5. **Missions** — Full-screen page at `/missions`. Active objectives with collapsible Objectives, Challenge, and Categories workspace. Categories have colored pills with items. Missions also in cockpit right column. [Spec](specs/missions.md)
6. **Checklist (Back of Mind)** — Quick checklist with collapsible "Cleared" section (closed by default). [Spec](specs/back-of-mind.md)
7. **Programs** — Custom tracker cards with colored pills, color picker dot, delete confirmation inside expanded view. Pre-built programs or custom. [Spec](specs/custom-sections.md)
8. **Cockpit Cat** — Captain cat image, resizable (S/M/L/XL), positioned in the right column. Click to resize.

### Journey

9. **Journey Page** — Personal narrative layer at `/journey`. [Spec](specs/journey.md)
    - **Tone System** — 5 voices (Cowboy/Warrior/Princess/Mythologic/Practical), collapsible picker. Changes AI voice and UI accent.
    - **Archetype System** — 5 main archetypes (Artist/Architect/Psychologist/Warrior/Alchemist), selectable with app suggestion. Inner archetypes per category (Feeling/Doing/Sharing). [Spec](specs/journey.md)
    - **Chapter System** — Editable chapter title, persisted.
    - **Soul Map** — Topographic terrain with 8 clickable territories (Emotions/Strengths/Fears/Vision/Energy/Body/Shadows/Gratitude). 3-color concentric circles with contour rings. Click to open input and add items directly. [Spec](specs/soul-map.md)
    - **Personality Map** — IFS-inspired inner parts mapping. Name parts (The Party Animal, The Builder, etc.), set strength, needs, triggers. Visual constellation + overview with presence ranking. [Spec](specs/personality-map.md)
    - **Life Timeline** — Horizontal/vertical timeline from birth year to now. Colored memory pills with categories (Life/Work/Love/Creative/Health/Travel/Loss/Growth). Draggable between years. Zoomable in horizontal mode. [Spec](specs/life-timeline.md)
    - **Cat Companion** — AI reflection partner speaking in chosen tone. "Reflect on my journey" button.
    - **Logbook** — Structured dark period support with 5 questions (how dark, trigger, recurrence, what helps, what you need). Memory system: saves past entries, shows "The Heavens" view (what brought you back, past triggers, history timeline).

### Notebook

10. **Notebook** — OneNote-inspired organization at `/notebook`. Vertical category tabs with icons, rich text editing (bold/italic/headings/lists), note colors (7 tints), font selector (Default/Serif/Mono/Handwritten/Sketch), text alignment, markdown-lite preview. Notes/Music toggle. Music toolkit: Songs with lyrics+chords, AI generation (Chorus/Verse/Chords/Bridge), Projects with song linking. Custom categories with color picker. [Spec](specs/notebook.md)

### Shared

11. **Design System** — Color themes (Paper/Golden/Night) + Typography themes (Normal/Cowboy/Groovy/Minimal) in a Design dropdown with two tabs. Playfair Display for titles, Caveat + Kalam for handwritten notes.
12. **Step Back** — Breathing pause button in header (ochre dot). Full-screen overlay with 3 breathing cycles (4s in, 4s hold, 4s out). Auto-closes or tap to dismiss.
13. **Emotional Vocabulary** — 8 poetic words mapped to slider values, shared across check-in and history. [Spec](specs/emotional-vocabulary.md)

### Deep Layer

14. **Life Scan** — Guided self-assessment through 3 Doors (Feeling, Doing, Sharing). Bipolar sliders, reflective questions, generates improvement programs. [Spec](specs/life-scan.md)
15. **Overview** — Compass wheel (warm blue for Sharing) showing life balance from life scan data + emotional state. Chapter card. [Spec](specs/cockpit.md)
16. **Research** — In-app research document covering psychology foundations, competitive analysis, monetization, AI integration, soul cartography vision, and feature roadmap. Accessible at `/research`.

## Architecture

```
Check in (daily pulse)          →  how you feel right now
  ↕ lives alongside
Day Map + Missions (daily)      →  what you're doing
  ↓ accumulates into
Journey (narrative)             →  who you are and who you're becoming
  ├── Soul Map                  →  your inner terrain
  ├── Personality Map           →  your inner parts
  ├── Life Timeline             →  how you got here
  └── Logbook                   →  facing the dark
  ↑ informed by
Life Scan (deep, periodic)      →  what's blocking and flowing
  ↓ generates
Programs (daily habits)         →  tracks improvement actions
  ↕ captured in
Notebook (always)               →  ideas, songs, reflections, plans
```

## AI Integration

- **After-check-in insight** — 2 sentences, ambient, auto-dismisses
- **Cat companion** — Tone-matched AI reflection partner on Journey page
- **Logbook support** — Compassionate AI response to structured dark period reflection, informed by past entries
- **Music generation** — Chorus/Verse/Chords/Bridge ideas for songs
- **Day Map observation** — Pattern recognition connecting activities to emotions
- **Check-in analysis** — Deep reflection on emotional trajectory

All AI uses Claude Haiku for cost efficiency. Respects "cockpit not coach" — names what it sees, never prescribes.

## Non-Goals

- Voice input
- Streak mechanics or guilt
- Social features (V1)
- Notifications or reminders
- Data export (V1)
- Onboarding wizard
- Being a medical or therapeutic device

## Key Decisions

- **Data**: Supabase with auth. Real persistence and cross-device sync.
- **Emotional scale**: Hawkins-inspired spectrum from heavy/contracted to light/expansive.
- **Layout**: Two-column cockpit. Feeling left, doing right. Mobile stacks vertically.
- **Interaction pattern**: Everything collapsed by default. + to add, click to expand, auto-save on edit.
- **Frequency**: On-demand. No scheduled check-ins, no streaks, no reminders.
- **AI voice**: Companion, not therapist. Mirror, not coach. Warm, not clinical.
- **Visual motif**: The losange (diamond) as recurring element — toggles, dividers, accents.
- **Typography**: Playfair Display serif for titles, system sans for body. User-switchable across 4 themes.
- **Clarity vs Style**: Check-in features stay precise and minimal. Journey features go full narrative with archetypes and tones.

## Success Criteria

- **Usage**: Open the app 3+ times per week organically
- **Bridge**: You notice a connection between what you did today and how you feel
- **Speed**: Check in + scan missions in under 60 seconds
- **Calm**: The app feels like a personal space, not a dashboard screaming for attention
- **Journey**: After a month, the archetype and chapter system reflects something true about your path
- **Notebook**: Replaces scattered notes apps for personal creative and organizational needs
- **Retention**: After 6 months, deleting the app means deleting your self-portrait
