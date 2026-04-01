# Check-in History

> A minimal timeline of recent check-ins — dots on a line, colored by feeling, tappable for detail. Pattern recognition through seeing, not analysis.

## Context

Check-ins vanish after submission. There's no sense of accumulation, no visual trail. The cockpit will eventually show aggregated state, but the history serves a different purpose: it lets you see your raw emotional trajectory at a glance. The insight comes from noticing — "I've been heavy all week" or "yesterday was different" — without the app telling you what to think.

## Behavior

- Displays below the check-in form on the same page. No separate screen or navigation.
- Shows the last 7 check-ins as dots on a horizontal timeline.
- Each dot is colored on a gradient mapped to the slider value:
  - Low values (0–25): muted, cool tones (contracted).
  - Mid values (26–62): neutral tones.
  - High values (63–100): warm, bright tones (expansive).
  - Exact color palette TBD during implementation — must pass contrast requirements against the background.
- Dots are evenly spaced regardless of time gaps between check-ins.
- Tapping a dot reveals a tooltip or inline detail: the emotional vocabulary word, the note (if any), and a relative timestamp ("2h ago", "yesterday", "3 days ago").
- Only one dot can be expanded at a time. Tapping another dot closes the previous.
- The timeline is read-only. No editing or deleting check-ins from here.
- If fewer than 7 check-ins exist, show only the dots that exist. No empty placeholder dots.
- Most recent check-in is on the right.

## States & Edge Cases

- Zero check-ins: hide the history section entirely. Don't show an empty timeline.
- One check-in: show a single dot. No line connecting to nothing.
- Exactly 7: full timeline. Oldest falls off when a new check-in is added.
- Rapid successive check-ins: all shown. If someone checks in 7 times in 10 minutes, that's 7 dots.
- Note content overflow: truncate long notes in the tooltip to ~100 characters with ellipsis.
- Loading state: skeleton dots while fetching.

## Done When

- Last 7 check-ins appear as colored dots below the check-in form.
- Tapping a dot shows the emotional word, note, and relative time.
- The timeline updates immediately after a new check-in (including after the reflection dismisses).
- Zero-data state is handled gracefully (section hidden).

## Dependencies

- Check-in data from Supabase (existing query, may need a "last 7" variant).
- Emotional vocabulary mapping (specs/emotional-vocabulary.md) — for the word shown on tap.
- Post-submit reflection (specs/post-submit-reflection.md) — history updates after reflection dismisses, not during.
