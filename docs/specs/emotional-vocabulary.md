# Emotional Vocabulary

> As the slider moves, a poetic word appears — giving language to what the user is feeling before they even articulate it.

## Context

The check-in slider captures a number, but numbers don't create recognition. The moment someone sees "stuck" or "alive" and thinks "yes, that's it" — that's when the check-in shifts from data entry to self-awareness. The vocabulary layer turns a mechanical gesture into a mirror.

## Behavior

- A single word or short phrase displays prominently near the slider, updating live as the user drags.
- The word maps to the slider's current position on a poetic Hawkins-inspired spectrum.
- Slider ranges map to ~8 words across the 0–100 scale:
  - 0–12: **Crushed**
  - 13–25: **Heavy**
  - 26–37: **Stuck**
  - 38–50: **Still**
  - 51–62: **Steady**
  - 63–75: **Open**
  - 76–87: **Alive**
  - 88–100: **Expansive**
- The word is display-only. It is not persisted — the raw slider value remains the data. The word is derived from the value at read time wherever needed (cockpit, history).
- Typography: the word should be the most visually prominent element on the check-in screen. Larger than the label, larger than the button. It IS the check-in.
- Transition between words should feel smooth — no jarring flicker. A subtle fade or crossfade as the word changes.

## States & Edge Cases

- Default state (slider at 50, unmoved): shows "Still". This is intentional — the center of the spectrum is not empty, it's calm neutrality.
- Boundary positions: if the slider sits exactly on a boundary between two words, use the lower range's word (e.g., 50 → "Still", 51 → "Steady").
- Fast dragging: word updates must keep up with drag speed. No lag, no animation queue buildup.
- The word set is hardcoded. No user customization in V1.

## Done When

- Dragging the slider displays a contextual emotional word that updates in real time.
- The word is the most visually prominent element on the check-in screen.
- Word transitions feel smooth, not jarring.
- The word is derived from slider value — not stored separately.

## Dependencies

- Check-in form (existing). This is a UI enhancement to the slider, not a new screen or flow.
- A shared utility to map slider value → word, reusable by cockpit and history features.
