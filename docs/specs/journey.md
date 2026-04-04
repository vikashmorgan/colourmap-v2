# Journey

> The narrative layer that turns data into story — archetypes, chapters, tones, and a companion that reflects your path back to you.

## Context

Check-ins accumulate but never synthesize into meaning. The user has 50 check-ins, 3 missions, FGAC entries, pulse data — but no story. No "here's who you are right now" or "here's how you've changed." The Journey page transforms raw emotional data into a personal narrative using archetypes, a choosable voice, and an AI cat companion.

## Core Components

### 1. Tone System (5 voices)

The user chooses how they want the app to talk to them. This affects all AI output on the Journey page and can extend to other AI features.

- **Cowboy** (Dusty) — Laconic, honest, earthy metaphors. Short sentences.
- **Warrior** (Ronin) — Disciplined, martial, respectful. Honor-based.
- **Princess** (Luna) — Graceful, poetic, nurturing. Inner kingdom metaphors.
- **Mythologic** (Oracle) — Symbolic, archetypal, layered. Myth references.
- **Practical** (Pixel) — Data-driven, structured. No metaphors. Numbers.

**Behavior:**
- Tone persists in localStorage
- Each tone has a cat name, role description, icon, and color
- AI prompts include tone-specific voice instructions
- Tone colors the UI accent throughout the Journey page

### 2. Archetype System

**Main Archetype** — One of 5, computed from user data:
- **The Seeker** — High confusion FGAC, many fears, searching orientation
- **The Builder** — Above-average slider, strong structure pulse, many strengths
- **The Healer** — Gratitude entries, fear work, body focus
- **The Warrior** — High courage/willingness, facing avoidance directly
- **The Artist** — Creative tags, wide emotional range, notebook activity

**Inner Archetypes** — One per category (Feeling/Doing/Sharing), each with a strength bar:

| Category | Archetypes |
|----------|-----------|
| Feeling | The Observer, The Empath, The Stoic, The Phoenix |
| Doing | The Architect, The Explorer, The Monk, The Rebel |
| Sharing | The Anchor, The Mirror, The Torch, The Lone Wolf |

**Behavior:**
- Archetype computed client-side from check-in patterns + life scan answers
- Displayed as a large centered card (main) + 3 smaller grid cards (inner)
- Recalculates on each page visit — archetypes shift as data shifts
- Strength bars show how strongly the data supports each inner archetype

### 3. Chapter System

**Behavior:**
- Current chapter title displayed prominently, editable on click
- Saved to life_scan_answers as `chapter_title`
- Shows emotional center (average emotional word) and check-in count
- Future: AI-suggested chapter names, chapter history timeline, auto-detection of emotional shifts

### 4. Cat Companion

**Behavior:**
- "Reflect on my journey" button sends context (archetype, chapter, emotional center, check-in count) to AI
- AI responds in the chosen tone voice, 3-4 sentences
- Streamed via `useCompletion` from `@ai-sdk/react`
- API route at `/api/journey/reflect` fetches full user context (check-ins, life scan, missions)
- Cat companion also activated by the Dark Period card

### 5. Dark Period Protocol

**Behavior:**
- "Need support?" collapsible card at the bottom of Journey
- Opens to 5 structured questions:
  1. How dark? (Shadow / Heavy / Fog / Storm / Abyss)
  2. What triggered this? (free text)
  3. Have you been here before? (First time / Sometimes / Often / Cycle)
  4. What has helped before? (free text)
  5. What do you need right now? (free text)
- After 3+ answers, "Talk to [cat name]" button sends all answers to the AI companion
- AI responds with compassion in the chosen tone — acknowledges the darkness, names what it sees, does not prescribe

### 6. Personality Map (planned)

**Vision:**
- Map the fragments of your personality as named entities
- Each fragment has traits, triggers, strengths, and shadows
- Inspired by IFS (Internal Family Systems): parts of you that protect, manage, and exile
- Visual representation as a constellation or territory map
- AI helps name and understand your fragments through guided questions

## States & Edge Cases

- **No check-ins yet** — Show default Seeker archetype with "Check in to discover your archetype" message
- **Only 1-2 check-ins** — Archetype computation uses defaults heavily; show "Early days" label
- **Tone change** — UI colors update immediately; next AI interaction uses new tone
- **Dark period with no data** — Cat companion responds generically with warmth
- **Chapter not set** — Shows "Untitled chapter" as clickable placeholder
- **AI failure** — Show "Connection lost" message, hide loading dots

## Done When

- User can choose from 5 tones and the choice persists
- Main archetype displays correctly based on check-in patterns
- 3 inner archetypes display with strength bars
- Chapter title is editable and saves
- Cat companion streams a tone-appropriate reflection
- Dark period card collects answers and feeds them to AI
- All AI responses respect the "cockpit not coach" principle — observe, don't prescribe

## Dependencies

- `/api/check-ins` — recent check-ins for archetype computation
- `/api/life-scan-answers` — fears, strengths, vision for AI context
- `/api/journey/reflect` — AI reflection endpoint
- `@ai-sdk/react` `useCompletion` — streaming
- `lib/emotional-vocabulary` — emotional word mapping

## Future Extensions

- **Soul Cartography** — Topographic map of emotional territories (fear canyons, strength mountains, vision horizons)
- **Weekly/Monthly/Yearly evolution views** — Emotion river, chapter timeline, mission arcs
- **Card system** — Daily action cards drawn from archetype + current challenges
- **Cat visuals** — Illustrated cat taking on archetype forms (wizard, boxer, warrior, queen)
- **Personality fragments** — IFS-inspired part mapping with AI-guided discovery
- **Hero's Quest progression** — Automatic quest phase detection (Ordinary World → Call → Threshold → Tests → Ordeal → Reward → Return)
