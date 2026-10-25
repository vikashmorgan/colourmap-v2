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

- **World peace is the horizon.** Colourmap's long-term aim is to become a platform for world peace: not as a slogan, but through the practical foundations that make peace possible at human scale. Self-understanding, emotional regulation, dialogue, repair, shared maps, education, and collective agency are treated as peace infrastructure.
- **Life is not fixed.** Colourmap's core teaching is that the user can understand their patterns, organise their energy, transform themselves, and participate in transforming the world. Every education path should approach that same truth from a different angle.
- **Overview intelligence is the point.** Colourmap should help the user take a step back from hundreds of fragments and see the larger shape: what is blocked, what is flowing, what repeats, what matters now, and what kind of movement is possible. The product is not just capture; it is a living overview that turns scattered life material into usable intelligence.
- **Unite fragments into coherent intelligence.** Colourmap should take scattered reflections, body signals, sounds, visuals, plans, and memories, then help the user see one coherent context they can act from and evolve through.
- **Field -> Tensions -> Action -> Patterns.** The deeper product architecture is not productivity first, but helping the user notice the field of the day, name the competing tensions underneath it, choose small bridge actions, and discover recurring life patterns. [Spec](specs/field-tensions-action-patterns.md)
- **Find the core simple challenge.** Colourmap should show how the user's situation is less complex than it feels, identify the load-bearing tension, and propose a few workable paths instead of multiplying dashboards or advice.
- **Learn to move between modes.** Colourmap should help the user notice which inner mode is active, which mode is avoided, and how to bridge between them without self-judgment. [Spec](specs/archetype-platform.md)

- **We work with the system, we don't fix it.** At the core, everything we do is feeding our subconscious and body. Ambitions, avoidances, routines — all mechanisms negotiating with our own nervous system. Colourmap's job is to help work *with* that system and bring clarity to it, not to optimize it away.
- **Both movement and the feeling of movement matter.** Real progress (targets checked, patterns shifting) and the felt sense of being in motion are two different things. The subconscious responds to the felt sense. The visual layer is not decoration — it's how the app speaks to the body: *you are moving, things have shape, there is a way.*
- **Check In is clarity. Journey is style.** Two sides of the same coin. Check-in strips everything bare. Journey takes the same data and reframes it through archetype and tone.
- **The AI proposes, the user confirms.** The user writes the story. The app holds the pen.
- **The cat is core, not gimmick.** The emotional safety layer. People say things to a cat they won't type into a blank field.
- **Clarity is the metric, not happiness.** Getting better = the range narrows, chapters get longer, fears dissolve, notes shift from reactive to observational.
- **Life doesn't have compartments.** The notebook, the missions, the check-ins, the songs — all one brain.

## Target User

The restless reflective person — not a beginner, not an expert. Someone who feels deeply and acts ambitiously but lacks a feedback loop between the two. The pain isn't a single bad moment — it's the persistent absence of a tool that connects who you're becoming with what you're doing.

## Core Loop

**Check in** (notice where you are emotionally) **+ Do** (track today's missions and tasks) **-> Over time, patterns emerge** (the relationship between what you do and how you feel becomes visible) **-> Journey** (the story of who you are and who you're becoming takes shape).

The cockpit has three daily lanes: **Emotions**, **Missions**, and **Progress**. They sit close together because that's the point — constant interaction between practical tasks, body signals, emotions, and repeated patterns.

The visual system must reinforce that split. Colourmap is not a generic dashboard with themed widgets. It is a paper cockpit built from cells: framed zones, small compartments, labeled islands, and intentional empty space. The Emotions, Missions, and Progress lanes should feel like one notebook spread, not unrelated panels.

## Design Principles

- **Minimalist by default, open if needed.** Every element starts collapsed or hidden. Detail appears on demand, never forced.
- **Cockpit, not coach.** Shows your state — doesn't tell you what to do.
- **Three lanes, one glance.** Emotions, Missions, and Progress stay scannable in 5 seconds.
- **Warm, not clinical.** Brown tones, poetic words, breathing room. This is a personal space.
- **The losange.** Diamond shapes as visual motif — section dividers, toggle buttons, accent marks. A subtle signature throughout.
- **Cell system, not cards.** The interface should be composed from notebook-like cells, compartments, and framed regions. Avoid generic SaaS card grids.
- **Old world notebook, not retro cosplay.** The visual direction mixes Leonardo da Vinci notebook energy, captain's logbook warmth, and handmade annotations. It should feel studied and personal, not kitschy.
- **Two-component aesthetic.** The app identity is built from two visual components at once:
  - a parchment / pirate log / Leonardo notebook base layer
  - a colorful, playful, almost childlike emotional accent layer
- **Typography is mixed on purpose.** Serif structure for anchors and headings, cowboy/western display moments for key labels, and pirate-handwritten or inked script for reflective and human moments. The tension between these voices is part of the product identity.
- **Color is selective.** The paper field stays warm and restrained; color appears in emotional signals, chips, letters, and highlighted states. The app should never become a flat beige wash or an over-saturated toy.

## Visual Language

- **Surface**: parchment, paper, notebook, field journal. Backgrounds should feel tactile and softly aged, not sterile.
- **Base mood**: pirate logbook, inventor's notebook, ship journal, drafted paper. The app should feel like something written, annotated, and lived in.
- **Structure**: borders, fine rules, split panes, centered emblems, and small geometric anchors. Layout should feel drafted, not merely stacked.
- **Type roles**:
  - Anchors and system labels use a refined serif or notebook editorial face.
  - Certain section names and emphatic markers may use cowboy-style display lettering or old printing-press display type.
  - Human prompts, notes, and intimate cues may use handwritten ink-like typography.
- **Composition**: asymmetry is allowed, but the page still needs a disciplined grid underneath. The result should feel like a designed spread from a personal codex.
- **Color behavior**: use localized emotional color to mark states and choices. Keep the paper base quiet so those accents matter. The color layer can feel playful, buoyant, and almost toy-like in selected moments, as long as the notebook base keeps the whole thing grounded.

## Navigation

Focus · AI · Notes · Education · Art · ◇ (Atlas, Roads, Music, Social, Journey, Life Scan, Research, Creator Space)

The Grid (`/grid`, from the Colourmap title menu): every page as a network of hubs, a game-style central menu. See `docs/specs/the-grid.md`.

Phone: Focus · AI · Notes · Education · Art · ◇

## Current Features

### Feeling (left column)

1. **Check-in** — Hawkins-inspired emotional bar with visible `FACING` prompts, a four-axis feeling compass (`Attitude / Emotions / Presence / Body`), a discrete stage selector, support chips, and inline `Challenge / Flow`. Current CPC behavior is absorbed here selectively, not ported wholesale. [Spec](specs/check-in.md)
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

10. **AI Reflection Menu** — Long-term AI home at `/ai`, placed between Focus and Notes. It explains reflection scopes, saved memory, and the freemium boundary: free users get limited small reflections, paid users get deeper pattern reading and durable AI memory. The nav dot menu can also summon the AI assistant. [Spec](specs/ai-reflection-menu.md)
11. **Notebook** — OneNote-inspired organization at `/notebook`. Vertical category tabs with icons, rich text editing (bold/italic/headings/lists), note colors (7 tints), font selector (Default/Serif/Mono/Handwritten/Sketch), text alignment, markdown-lite preview. Notes/Music toggle. Music toolkit: Songs with lyrics+chords, AI generation (Chorus/Verse/Chords/Bridge), Projects with song linking. Custom categories with color picker. [Spec](specs/notebook.md)

### Shared

12. **Design System** — Color themes (Paper/Golden/Night) + Typography themes (Normal/Cowboy/Groovy/Minimal) in a Design dropdown with two tabs. Playfair Display for titles, Caveat + Kalam for handwritten notes.
13. **Step Back** — Breathing pause button in header (ochre dot). Full-screen overlay with 3 breathing cycles (4s in, 4s hold, 4s out). Auto-closes or tap to dismiss.
14. **Emotional Vocabulary** — 8 poetic words mapped to slider values, shared across check-in and history. [Spec](specs/emotional-vocabulary.md)
15. **Creator Space / Build Lab** — Creator-only AI coding mission control at `/build-lab`. Select a local project, choose Codex or Claude Code, dictate or type a mission, stream agent output, and inspect changed files/diffs. The same Creator Space evolves into Garden of Ideas, Project Map / Visual Intelligence, and Business Plan for understanding the product, navigating specs visually, and moving toward practical launch/revenue strategy. [Spec](specs/build-lab.md)
16. **Mode Bridge** — In-progress Focus-page surface for understanding active/avoided modes and practicing small transitions between Creation, Organisation, Admin, Builder, Body/Sport, Reflection, and Play. [Spec](specs/archetype-platform.md)
17. **AI Presence** — Shared phone-friendly AI reflection box with a brown/gold living-cell visual. It connects to backend AI without needing local coding agents, starting as a mirror-first surface for fragments and simple tensions. [Spec](specs/ai-presence.md)
18. **Proportion Buddy** — Art utility at `/proportion-buddy` for sculpture reference work: upload/crop a reference image and overlay centimeter grids, base/arm/head guide lines, and editable project measurements. [Spec](specs/proportion-buddy.md)

### Entertainment

19. **Billy Pineapple Infinite Comic** — Future entertainment-first relaxation world: an infinite interactive comic where Billy searches for The Juice through symbolic regions, soft choices, and a Colourmap-like inner map. Reflective, but not Education. [Spec](specs/infinite-comic-billy.md)

### Deep Layer

20. **Life Scan** — Guided self-assessment through 3 Doors (Feeling, Doing, Sharing). Bipolar sliders, reflective questions, generates improvement programs. [Spec](specs/life-scan.md)
21. **Personality Type Program** — Planned self-understanding program built on free/public-domain personality foundations, especially IPIP Big Five, translated into Colourmap-native styles, gifts, frictions, and mode bridges. [Spec](specs/personality-type-program.md)
22. **Overview** — Compass wheel (warm blue for Sharing) showing life balance from life scan data + emotional state. Chapter card. [Spec](specs/cockpit.md)
23. **Research** — In-app research document covering psychology foundations, competitive analysis, monetization, AI integration, soul cartography vision, and feature roadmap. Accessible at `/research`.

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
- **AI Reflection Menu** — Freemium long-term synthesis home. Free users get limited small reflections; paid users get deeper pattern reading, larger context windows, saved reflection archive, and future generated maps.

All AI uses Claude Haiku for cost efficiency. Respects "cockpit not coach" — names what it sees, never prescribes.

### Evolution — Living Reflection Map

**Categories** are the backbone. The user names the areas of life they want to track (Shoulder, Organisation, Social, Music, Work...). Within each category: challenge (what's hard) and flow (what's working). Daily review: see your last comment, update what changed. Categories absorb and simplify Challenge/Flow, Caring Depth patterns, River snapshots, and Programs into one system.

The long-term AI direction is a living constellation that reads all user data (categories, check-ins, notes, day map, life scan), discovers clusters and recurrence, and expresses what it finds through multiple visual languages — geometric polygon, constellation, river, terrain, mandala, wheel. The AI picks the form that fits the moment: presence, relaxation, movement, or agency. It replaces Soul Map, Personality Map, and Cell View with one adaptive view. Mirror by default, coach only when asked. Exportable period reports for therapy/coaching use. [Spec](specs/ai-evolution.md)

## Non-Goals

- Streak mechanics or guilt
- Social features (V1)
- Notifications or reminders
- Data export (V1)
- Onboarding wizard
- Being a medical or therapeutic device

## Open Ideas (not decided yet)

- **Doing compass reframe (STAR → Clarity · Target · Resources · Action)**: potential future direction for the Doing compass. Four axes where Action sits at the south position and the other three (Clarity, Target, Resources) are the conditions that feed it. Would replace the current STAR wiring. Not committed — captured here so it isn't lost when we circle back to box 3.

- **Future library navigation reflections, May 21 2026**: long-term direction for a PSP-like horizontal/vertical navigation model, portal-map education system, and machine-inspired information structure that can hold abundant teachers, comics, poetry, psychology, symbolic worlds, and personal missions without overwhelming the user. Captured in [Living Atlas / Information Art](specs/living-atlas-information-art.md#reflection-future-library-navigation-may-21-2026) and [Machine Organisation And Human Flow](specs/living-atlas-information-art.md#reflection-machine-organisation-and-human-flow-may-21-2026).

- **The Price of Separation**: next education / Living Atlas comic direction about how unregulated collective emotion becomes war risk, supply-chain cost, inflation, insurance, and institutional fragility. It uses Hawkins as symbolic inspiration, not empirical proof, and asks when humanity blooms out of the lower equilibrium of fear, pride, humiliation, and domination into relational security. [Spec](specs/collective-evolution-comic.md)

## Key Decisions

- **Data**: Supabase with auth. Real persistence and cross-device sync.
- **Emotional scale**: Hawkins-inspired spectrum from heavy/contracted to light/expansive.
- **Layout**: Two-column cockpit. Feeling left, doing right. Mobile stacks vertically.
- **Interaction pattern**: Everything collapsed by default. + to add, click to expand, auto-save on edit.
- **Frequency**: On-demand. No scheduled check-ins, no streaks, no reminders.
- **AI voice**: Companion, not therapist. Mirror, not coach. Warm, not clinical.
- **Visual motif**: The losange (diamond) as recurring element — toggles, dividers, accents.
- **Typography**: Mixed system. Refined serif for structure, cowboy/western or old-printing-press accents for selected section markers, and handwritten ink-style typography for reflective moments. User-switchable themes may adapt this, but the default product identity should preserve the mix.
- **Clarity vs Style**: Check-in features stay precise and minimal. Journey features go full narrative with archetypes and tones.
- **Layout language**: Build with cells, notebook partitions, and drafted compartments instead of generic product cards.

## Success Criteria

- **Usage**: Open the app 3+ times per week organically
- **Bridge**: You notice a connection between what you did today and how you feel
- **Speed**: Check in + scan missions in under 60 seconds
- **Calm**: The app feels like a personal space, not a dashboard screaming for attention
- **Journey**: After a month, the archetype and chapter system reflects something true about your path
- **Notebook**: Replaces scattered notes apps for personal creative and organizational needs
- **Retention**: After 6 months, deleting the app means deleting your self-portrait
