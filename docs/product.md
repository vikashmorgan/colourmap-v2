# Colourmap

> A personal cockpit that bridges doing and feeling — practical tasks alongside emotional awareness, in one glance.

## Inspirations

The product lives at the intersection of two tensions: **presence and action**, **stillness and creation**. Four reference points anchor the philosophy:

- **Thich Nhat Hanh** — Presence as practice. The check-in is a mindfulness bell: you stop, notice where you are, and that noticing is itself the value.
- **David Hawkins** — Emotional states as a spectrum, not binary. The slider draws from his insight that consciousness moves along a scale from contraction to expansion.
- **Steve Jobs** — Simplicity as the ultimate sophistication. The cockpit shows you your state in one glance — no menus, no configuration, no clutter. The product should feel inevitable, like it couldn't have fewer parts and still work.
- **Kobe Bryant** — Relentless alignment between aspiration and daily action. You review what's blocking and what's flowing so you can adjust, not so you can feel good about reflecting.

The product is not a meditation app (pure stillness) or a productivity tool (pure action). It's the bridge: see yourself clearly, then move. Do things, then notice how you feel.

## Target User

Us. Someone who takes action and has aspirations but lacks a feedback loop between the two. The pain isn't a single bad moment — it's the persistent absence of a tool that connects who you're becoming with what you're doing.

## Core Loop

**Check in** (notice where you are emotionally) **+ Do** (track today's missions and tasks) **-> Over time, patterns emerge** (the relationship between what you do and how you feel becomes visible).

The cockpit has two sides: **feeling** (left) and **doing** (right). They sit side by side because that's the point — constant interaction between practical tasks and body/mind/emotions.

## Design Principles

- **Minimalist by default, open if needed.** Every element starts collapsed or hidden. Detail appears on demand, never forced.
- **Cockpit, not coach.** Shows your state — doesn't tell you what to do.
- **Two columns, one glance.** Left = feeling. Right = doing. Scannable in 5 seconds.
- **Warm, not clinical.** Brown tones, poetic words, breathing room. This is a personal space.

## Current Features (V1)

### Feeling (left column)

1. **Check-in** — Emotional register with Hawkins-inspired slider, emotional vocabulary (Crushed → Expansive), optional note, context tags, post-submit breath moment. [Spec](specs/check-in.md)
2. **Check-in History** — Collapsible log of recent check-ins grouped by date, showing emotional word, time, note, and tags. [Spec](specs/check-in-history.md)

### Doing (right column)

3. **Current Mission** — Active objectives with collapsible Objective, Challenge, and Notes fields. Missions persist. Add via + button. [Spec](specs/missions.md)
4. **Back of My Mind** — Quick checklist for organisational tasks, reminders, mental clutter. Add via + button, check off, clear. [Spec](specs/back-of-mind.md)

### Shared

5. **Themes** — Paper (light beige), Golden, Night. Switcher in header, persisted in localStorage.
6. **Emotional Vocabulary** — 8 poetic words mapped to slider values, shared across check-in and history. [Spec](specs/emotional-vocabulary.md)

## Next Layer (V2)

### The Deep Layer

7. **Life Scan** — Guided self-assessment through 3 Doors (Feeling, Doing, Sharing). Bipolar sliders map your current state, reflective questions dig into what's blocking you and what you're afraid of. Generates a personal improvement program. Separate page from the cockpit. [Spec](specs/life-scan.md)

### The Action Layer

8. **Custom Cockpit Sections** — Personal tracker cards (check/scale/counter) that turn life scan insights into daily habits. Pre-built from scan results or designed from scratch. Default sections (Body, Focus) ship on day 1. [Spec](specs/custom-sections.md)

### The Visual Layer

9. **Cockpit Radar** — Visual radar chart showing life balance from life scan data + emotional state from check-ins. [Spec](specs/cockpit.md)

## Architecture

```
Life Scan (deep, periodic)     →  reveals what's blocking / flowing
  ↓ generates
Custom Sections (daily)        →  tracks improvement actions
  ↕ lives alongside
Check-in + Missions (daily)    →  feeling + doing side by side
  ↓ accumulates into
Cockpit Radar (visual)         →  patterns emerge over time
```

The life scan is the diagnostic. The cockpit sections are the program. The check-in is the daily temperature. The radar is the long view.

## Non-Goals

- Voice input
- Streak mechanics or guilt
- Social features
- Notifications or reminders
- Data export
- Onboarding wizard

## Key Decisions

- **Data**: Supabase with auth. Real persistence and cross-device sync from day one.
- **Emotional scale**: Hawkins-inspired but not literal. Simple spectrum from heavy/contracted to light/expansive.
- **Layout**: Two-column cockpit. Feeling left, doing right. Mobile stacks vertically.
- **Interaction pattern**: Everything collapsed by default. + to add, click to expand, auto-save on edit.
- **Frequency**: On-demand. No scheduled check-ins, no streaks, no reminders.

## Success Criteria

- **Usage**: Open the app 3+ times per week organically
- **Bridge**: You notice a connection between what you did today and how you feel — the two columns make that visible
- **Speed**: Check in + scan missions in under 60 seconds
- **Calm**: The app feels like a personal space, not a dashboard screaming for attention
