# Cockpit

> A radar/wheel chart showing life balance across 4 categories plus current emotional state — the payoff screen that makes check-ins and scans feel worth doing.

## Context

Check-ins and life scans produce data but have no visual payoff. Without the cockpit, there's no reason to keep doing them. The cockpit closes the loop: see yourself clearly in one glance, then move.

## Behavior

- Radar/wheel chart displaying the 4 life scan categories (Body, Mind, Relationships, Purpose).
- Current emotional state from the latest check-in displayed prominently alongside the radar.
- Updates live as new check-in or life scan data comes in.
- Read-only. No input on this screen — it's a display.
- Design philosophy: cockpit, not coach. Shows your state, doesn't tell you what to do. Feeling of peace and calm.

## States & Edge Cases

- No check-in data yet: show the cockpit structure with empty/placeholder emotional state. Don't hide the screen.
- No life scan data yet: show the radar chart with empty/default values for all 4 categories. Indicate that a scan is needed.
- Partial life scan: render completed categories, show remaining as empty/default.
- Stale data (e.g. life scan is 2 weeks old): display as-is in V1. No staleness indicators.
- Multiple check-ins same day: cockpit shows the most recent one.

## Done When

- Cockpit visually reflects the latest check-in and life scan data.
- Radar chart updates as new data comes in without page refresh.
- The screen is scannable in under 5 seconds — the user's current state is immediately obvious.
- Works with zero data, partial data, and full data without breaking.

## Dependencies

- Check-in data (emotional state).
- Life scan data (4 category ratings).
- Both features must persist data to Supabase for the cockpit to read.
