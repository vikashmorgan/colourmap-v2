# Life Scan

> Step through 4 life categories — Body, Mind, Relationships, Purpose — rating what's blocking vs what's flowing in each.

## Context

No structured way to assess life balance across dimensions. Journaling is free-form and doesn't surface patterns. The life scan is the film study of your own life: review what's blocking and what's flowing so you can adjust.

## Behavior

- 4 fixed categories: Body, Mind, Relationships, Purpose. No customization in V1.
- One category at a time, stepped. Not an all-at-once grid.
- For each category: rate what's blocking vs what's flowing. Input mechanism TBD (slider, discrete scale, or similar).
- User can complete a full scan or stop partway (partial scans are persisted as-is).
- No fixed cadence. On-demand like check-ins, but expected to be less frequent.

## States & Edge Cases

- Partial scan: user completes 2 of 4 categories and leaves. Persist what's there. Don't block or warn.
- Repeat scan same day: allowed. Latest data takes precedence on the cockpit.
- First-ever scan: no prior data. Show the scan flow without comparison context.
- Category with no clear answer: user should be able to set a neutral/middle value. Don't force a strong signal.

## Done When

- User can complete a full scan of all 4 categories without feeling overwhelmed.
- Data for each category is persisted to Supabase.
- Stepped UI shows one category at a time with clear progress indication.
- Cockpit radar chart reflects the latest life scan data.

## Dependencies

- Supabase auth and database.
- Cockpit reads life scan data to render the radar chart.
