# Check-in

> A 30-second emotional register — a Hawkins-inspired slider from heavy/contracted to light/expansive, plus an optional free-text note.

## Context

No fast way to capture emotional state without friction. Journaling is slow and unstructured. Meditation apps don't capture anything. The check-in is both a data input for the cockpit and a presence practice in itself.

## Behavior

- One screen. No navigation to reach it.
- Hawkins-inspired emotional slider: spectrum from heavy/contracted to light/expansive. Not the formal Map of Consciousness — a simplified feeling scale.
- Optional free-text note field. Can be skipped entirely.
- Single submit action. No multi-step flow.
- On-demand. No scheduled cadence, no streaks, no reminders.
- Under 30 seconds from open to submitted.

## States & Edge Cases

- Empty state: slider defaults to center position. User must move it intentionally before submitting (no accidental neutral entries).
- Note field empty: valid submission. Note is always optional.
- Rapid successive check-ins: all persisted. No throttling — if the user wants to check in 5 times in a row, let them.
- Offline: not handled in V1. Requires network.

## Done When

- User can open the app, move a slider, optionally type a note, and submit in one fluid interaction.
- Check-in data (slider value, optional note, timestamp) is persisted to Supabase.
- The entire flow completes on a single screen with no navigation.

## Dependencies

- Supabase auth and database (Key Decision: real persistence from day one).
- Cockpit reads check-in data to display current emotional state.
