# Day Map

> Hour-by-hour activity tracker that bridges what you're doing with how you feel.

## Context

The user tracks emotions on the left column but has no way to see what they were *doing* at the time. The Day Map fills this gap — a visual record of the day's activities that sits alongside check-ins.

## Behavior

- Hours from 6am to 10pm displayed as rows with time labels on the left
- Empty hours are compact (20px); filled hours expand (30px)
- Current hour marked with a red line
- Smart cutoff: only shows up to 2 hours past current time (or last entry)
- "Show more hours" toggle for hidden future hours
- Click empty hour to open add form with that hour pre-filled
- Paint-to-create: click and drag across empty hours to create a multi-hour block
- Each entry: activity name, optional note, category, color, tag (works/drops)
- Click entry to select → editable name, note, close button (x)
- Drag resize handle (3 orange dots) to change duration
- Drag entries between hours
- Category colors: Movement (green), Focus (ochre), Creative (purple), Rest (blue), Social (blue), Fuel (orange), Routine (warm)
- Preset activities: Morning walk, Yoga, Focus zone, Music zone, Stretch, Nap, Meal, Energy down, Energy up

## Two Views

- **List** (default): Hour-by-hour rows with activity blocks
- **Energy Mountain**: Stacked colored SVG terrain. Each activity is a mountain layer. Hour labels below. Legend at bottom. Current hour marker.

## States & Edge Cases

- No entries: just empty compact rows with time labels
- Multi-hour entry: continuous rounded block (top rounded on first hour, bottom on last)
- Entry spans beyond visible hours: still renders, extends the cutoff
- Category set but no custom color: defaults to category color

## Done When

- User can add, rename, delete, resize, and drag entries
- Paint-to-create works across multiple hours
- Energy mountain view renders stacked terrain
- Category colors applied consistently
- Smart hour cutoff hides empty future hours
