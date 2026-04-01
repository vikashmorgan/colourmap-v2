# Custom Cockpit Sections

> Personal tracker cards on the cockpit — pre-built from the life scan or designed from scratch — that turn self-understanding into daily habits.

## Context

The life scan reveals where you're blocked. Custom sections turn that into daily action. "My energy is low" becomes a Body card with "✓ Moved, ✓ Slept 7h+". Over time, the data accumulates and the connection between actions and feelings becomes visible.

Sections are the bridge between the deep layer (life scan) and the daily layer (cockpit). They answer: "Now that I know what's blocking me, what do I do about it every day?"

## Three Tracker Types

Every tracker in a section is one of three types:

| Type | UI | Data | Example |
|------|-----|------|---------|
| **Check** | Toggle (done / not done) | boolean per day | "Walked", "No screens after 10pm" |
| **Scale** | 1-5 dots or small slider | integer per day | "How clean did I eat?", "Energy level" |
| **Counter** | Tap to increment | integer per day | "Glasses of water", "Pages read" |

Three types. No more. This covers everything without complexity.

## Creating a Section

### From life scan (suggested)
After completing a scan, the app suggests sections based on low-scoring doors. Each suggestion comes with:
- A name (editable)
- 3-5 pre-filled trackers (editable)
- Accept / Customize / Dismiss buttons

### From scratch (manual)
Tap `+` on the cockpit → "New section" → enter a name → add trackers one by one. Each tracker needs:
- A label (text)
- A type (check / scale / counter)

That's it. No categories, no templates, no onboarding wizard.

## Daily Use

Each section is a collapsible card on the cockpit, same pattern as Current Mission and Back of My Mind:
- **Closed:** Title + compact summary (e.g., "3/5 ✓" or "avg 4")
- **Open:** List of trackers, one tap each

Trackers reset daily. Yesterday's data is saved, today starts fresh.

### Check tracker
Tap to toggle. Filled circle = done, empty = not done.

### Scale tracker
5 small dots in a row. Tap a dot to set the rating. Filled dots up to selection.

### Counter tracker
Number displayed. Tap `+` to increment, long-press to decrement. Starts at 0.

## Editing a Section

Tap and hold the section title (or a gear icon) to enter edit mode:
- Rename the section
- Add / remove / reorder trackers
- Change a tracker's label or type
- Delete the entire section

Edit mode is simple — no separate settings page. Inline editing, same card.

## Data Model

```
cockpit_sections
  id, userId, name, position, createdAt

section_trackers
  id, sectionId, label, type (check|scale|counter), position, createdAt

daily_tracker_entries
  id, trackerId, userId, date, value (integer), createdAt
```

- `value` interpretation depends on type: check (0/1), scale (1-5), counter (0+)
- One entry per tracker per day. Upsert on change.
- `position` for ordering within a section and sections on the cockpit.

## Default Sections (before life scan)

New users get these so the cockpit is useful immediately:

**Body**
- ✓ Moved (check)
- ✓ Ate well (check)
- ✓ Slept well (check)

**Focus**
- ✓ Deep work (check)
- ✓ No distractions (check)

Editable from the start. The life scan may suggest additional sections or modifications later.

## States & Edge Cases

- Zero sections: cockpit shows only check-in, missions, back of mind. A subtle prompt: "Add a section to track your daily habits."
- Max sections: no hard limit, but the cockpit scrolls. Trust the user to keep it minimal.
- Day boundary: trackers reset at midnight local time. No timezone configuration — use device time.
- Missed day: no guilt. No streaks. No "you missed yesterday!" The data just has a gap.
- Section with zero trackers: allowed but pointless. Show "Add a tracker" prompt inside.
- Deleted section: tracker data is kept in the database (soft delete) for historical correlation. The section just disappears from the cockpit.

## Evolution (future, not V1)

- Weekly summary: "This week you moved 5/7 days, deep worked 4/7, and your average check-in was Steady."
- Correlation insights: "Weeks you hit Body 5/5, your energy scan rating was 2 points higher."
- Section suggestions refresh after each new life scan.

## Done When

- User can create, edit, and delete custom sections with check/scale/counter trackers.
- Default sections (Body, Focus) appear for new users.
- Life scan generates section suggestions based on low scores.
- Daily tracker data persists and resets each day.
- Sections are collapsible cards matching the cockpit's minimalist pattern.
- The whole system feels like designing your own dashboard, not filling in someone else's spreadsheet.

## Dependencies

- Supabase auth and database.
- Life scan feature (for suggested sections).
- New tables: cockpit_sections, section_trackers, daily_tracker_entries.
