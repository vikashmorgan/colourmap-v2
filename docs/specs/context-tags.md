# Context Tags

> Optional, tappable tags that give structure to what a check-in is about — without the friction of typing.

## Context

The free-text note captures context but most people skip it or write something vague. Structured tags solve this: one tap to say "this check-in is about work" gives the cockpit data to correlate emotional state with life areas — without requiring the user to articulate anything. The note remains for when they want to say more.

## Behavior

- A row of tappable tag pills displayed between the slider and the note field.
- Fixed set of 5 tags for V1:
  - **Work**
  - **Body**
  - **Relationships**
  - **Creative**
  - **General**
- Multi-select: the user can tap zero, one, or multiple tags. Most check-ins will have one.
- Tags toggle on/off. Tapping a selected tag deselects it.
- Selected tags are visually distinct (filled vs outlined, or similar).
- Tags are persisted alongside the check-in as an array of strings.
- Tags are optional. Submitting with zero tags is valid (same as today).
- The "General" tag exists as an intentional opt-in for "nothing specific" — it's not a default. If nothing is selected, nothing is stored.

## States & Edge Cases

- No tags selected: valid submission. No tags persisted.
- All tags selected: valid. Unusual but allowed.
- Tag set is hardcoded. Future versions may allow customization — the schema should store tags as a text array, not foreign keys, to support this without migration.
- Tags are not shown in check-in history tooltips in V1. They're captured for future cockpit correlation.
- Mobile: tags must be tappable with a thumb. Minimum 44px hit target.

## Done When

- 5 tag pills appear on the check-in form between slider and note.
- Tags toggle on/off with clear visual feedback.
- Selected tags are persisted with the check-in data.
- Zero tags is a valid submission.
- Schema stores tags as a text array.

## Dependencies

- Check-in form (existing) — UI addition to the form.
- Check-in API route and schema — needs a new `tags` column (text array) on the `check_ins` table.
- Cockpit (future) — will eventually use tags for correlation analysis.
