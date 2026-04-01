# Colourmap

> A personal cockpit that turns self-reflection into a visual map of your life balance.

## Inspirations

The product lives at the intersection of two tensions: **presence and action**, **stillness and creation**. Four reference points anchor the philosophy:

- **Thich Nhat Hanh** — Presence as practice. The check-in is a mindfulness bell: you stop, notice where you are, and that noticing is itself the value. "The miracle is not to walk on water. The miracle is to walk on the green earth, dwelling deeply in the present moment and feeling truly alive."
- **David Hawkins** — Emotional states as a spectrum, not binary. The slider draws from his insight that consciousness moves along a scale from contraction (shame, fear) to expansion (love, peace). Not the literal map — the principle that where you are on the spectrum shapes everything you see and do.
- **Steve Jobs** — Simplicity as the ultimate sophistication. The cockpit shows you your state in one glance — no menus, no configuration, no clutter. The product should feel inevitable, like it couldn't have fewer parts and still work.
- **Kobe Bryant** — Relentless alignment between aspiration and daily action. The life scan isn't navel-gazing — it's the film study of your own life. You review what's blocking and what's flowing so you can adjust, not so you can feel good about reflecting.

The product is not a meditation app (pure stillness) or a productivity tool (pure action). It's the bridge: see yourself clearly, then move.

## Target User

Us. Someone who takes action and has aspirations but lacks a feedback loop between the two. The pain isn't a single bad moment — it's the persistent absence of a tool that connects who you're becoming with what you're doing. Current alternatives either encourage navel-gazing (obsessive journaling), are disconnected from action (meditation apps), or are pure numbing (Instagram). None of them close the loop between actions and aspirations.

## Current Alternative

Journaling, meditation apps, or Instagram. Journaling is unstructured and backward-looking. Meditation apps don't connect to life context. Instagram fills the void but leaves you emptier. The real gap: nothing shows you your own state like a cockpit — outward-looking, calm, actionable.

## Core Loop

**Check in** (register where you are emotionally, under 30 seconds) **-> Cockpit updates** (your state becomes visible on the radar) **-> Over time, patterns emerge** (life scan data + check-in history reveal what's blocking and what's flowing).

The check-in is the atomic unit of value. It serves two purposes: data input for the cockpit AND a presence practice in itself. On-demand, no fixed cadence — the app earns its place by being useful every time, not by guilting you into streaks.

## V1 Features

1. **Check-in** — 30-second emotional register with Hawkins-inspired slider + optional note. [Spec](specs/check-in.md)
2. **Life Scan** — Step through 4 life categories (Body, Mind, Relationships, Purpose), rating what's blocking vs flowing. [Spec](specs/life-scan.md)
3. **Cockpit** — Radar chart showing life balance + current emotional state in one glance. [Spec](specs/cockpit.md)

## V1.1 Features (Check-in Enhancements)

4. **Emotional Vocabulary** — Poetic words that shift as the slider moves, turning a number into self-recognition. [Spec](specs/emotional-vocabulary.md)
5. **Post-Submit Reflection** — A 6-second breath moment after checking in, honoring the practice. [Spec](specs/post-submit-reflection.md)
6. **Check-in History** — Last 7 check-ins as colored dots below the form. Tap for detail. [Spec](specs/check-in-history.md)
7. **Context Tags** — Optional tappable tags (Work, Body, Relationships, Creative, General) for structured context. [Spec](specs/context-tags.md)
8. **Time-of-Day Awareness** — Greeting and label shift based on morning/afternoon/evening/late night. [Spec](specs/time-of-day-awareness.md)

## Non-Goals (V1)

- User-facing AI features (no "AI says..." reflections or suggestions)
- Voice input (adds transcription complexity)
- Habit tracking or action/practice suggestions
- Category customization (fixed 4 categories)
- Social features
- Notifications or reminders
- Data export
- Onboarding flow

Note: LLM may be used as infrastructure to translate raw check-in data into cockpit summaries, but this is invisible to the user — not a feature.

## Key Decisions

- **Data**: Supabase with auth. Real persistence and cross-device sync from day one. No local-only shortcuts.
- **Emotional scale**: Hawkins-inspired but not literal. Simple spectrum from heavy/contracted to light/expansive. Not the formal Map of Consciousness.
- **Categories**: Fixed set of 4 for V1 (Body, Mind, Relationships, Purpose). No customization.
- **Life Scan UX**: One category at a time, stepped. Not all-at-once grid.
- **Frequency**: On-demand. No scheduled check-ins, no streaks, no reminders.
- **Design philosophy**: Cockpit, not coach. The app shows you your state — it doesn't tell you what to do. Outward-looking. Feeling of peace and calm.

## Success Criteria

- **Usage**: Check in 3+ times per week organically (without forcing it)
- **Presence**: The check-in ritual itself shifts your state — noticeable difference on days you use it vs don't
- **Insight**: After 2 weeks of data, the cockpit reveals a pattern you didn't already know about your emotional or life balance
