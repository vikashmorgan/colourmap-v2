# Life Timeline

> A visual map of your life — colored memory pills across the years.

## Context

The soul map shows who you are now. The life timeline shows how you got here. Events, memories, milestones — plotted across time to reveal the story.

## Behavior

- Two orientations: Horizontal (default, landscape) and Vertical
- Year range: birth year to current year, configurable via "set years" settings
- Click a year to add a memory. "+ add memory" button always visible in header
- Each memory: title, note, feel color (Great/Good/Neutral/Tough/Dark), category (Life/Work/Love/Creative/Health/Travel/Loss/Growth)
- Collapsed: colored pill with title. Click to expand with full details
- Expanded: title, category tag, note, date, delete button
- Draggable: grab a pill and drop on a different year to move it
- All data in localStorage

## Horizontal Mode

- Scrollable left-to-right timeline
- Color dots stacked above each year
- Zoom controls: [-] compress, [+] expand year width (24-100px)
- Year labels: show for multiples of 5, current year, and years with events
- Click dot to expand popup above

## Vertical Mode

- Years stacked top to bottom (newest first)
- Only shows years with events + current year (collapsed by default)
- "Show all X years" / "Show less" toggle
- Events as colored pills next to each year
- Year label shows age number
- Timeline spine: thicker where events exist
- Drop target highlights on drag

## States & Edge Cases

- No events: just the add button and empty timeline
- Birth year not set: defaults to 1995, configurable
- Year with many events: pills wrap in vertical, stack in horizontal
- Drag between years: event.year updates, list re-sorts

## Done When

- User can add, view, expand, delete, and drag memories
- Both orientations work and toggle
- Horizontal zoom controls work
- Vertical mode collapses empty years
- Birth year is configurable
- Data persists in localStorage
