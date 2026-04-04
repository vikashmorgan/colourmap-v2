# Notebook

> OneNote-inspired personal workspace for notes, ideas, music, and organization.

## Context

Life doesn't have compartments. The person writing a song at 10pm is the same person who checked in as Fear at 2pm. The notebook captures what the check-in can't — creative expression, plans, ideas.

## Behavior

- Two modes: Notes (general) and Music (toolkit)
- Vertical category tabs on the left with icons and note counts
- Default note categories: Notes, Ideas, Journal, Tasks
- Default music categories: Songs, Projects, Rhymes, Practice, Lessons
- Custom categories: user-created with name + color picker (losange + button)
- Add note: input at top, Enter or Add button
- Each note: title (collapsed pill), click to expand
- Expanded note shows: editable title, format toolbar, content area, date, delete

## Rich Editing

- Format toolbar: Bold (**), Italic (*), Heading (##), List (-)
- Text alignment: Left, Center, Right
- Note background colors: 7 tints (Warm, Rose, Sky, Sage, Lavender, Amber, None)
- Font selector: Default, Serif (Playfair), Mono (Courier), Handwritten (Caveat), Sketch (Kalam)
- Per-note styling persisted in localStorage
- Markdown-lite preview when not editing (bold, italic, headings, lists render)

## Music Toolkit

- Songs: split Lyrics + Chords textareas
- AI generation: Chorus/Verse/Chords/Bridge buttons per song (Claude Haiku)
- Projects: link songs to projects, see songs listed inside project
- Rhymes: word entries with expandable content
- Practice log and Lessons: freeform notes

## States & Edge Cases

- No notes in category: empty state with icon
- Content preview on hover (collapsed)
- Long content auto-grows textarea
- Font/color/alignment persist per note in localStorage
- Category with no notes still shows in sidebar

## Done When

- User can create categories, add notes, format text, change colors/fonts
- Music mode preserves all existing song/chord/rhyme functionality
- AI generation streams results for songs
- Notes persist in database, styling in localStorage
