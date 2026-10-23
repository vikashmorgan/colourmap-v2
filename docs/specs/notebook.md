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
- An expanded note closes with a tap anywhere on its title bar outside the title and the bar's buttons (the title keeps to the width of its text, so there is room to tap); tapping the title still edits it

## Rich Editing

- Format toolbar: Bold (**), Italic (*), Heading (##), List (-)
- Text alignment: Left, Center, Right
- Note background colors: 7 tints (Warm, Rose, Sky, Sage, Lavender, Amber, None)
- Font selector: Default, Serif (Playfair), Mono (Courier), Handwritten (Caveat), Sketch (Kalam)
- Per-note styling persisted in localStorage
- Markdown-lite preview when not editing (bold, italic, headings, lists render)
- Spell check: **off by default** (Italian and English are both written here). The *abc* button, in an open note, in full view and on Day's objective notes, turns it on or off for the whole app; the choice is remembered on the device (`cb-spellcheck`) and applied to `<html spellcheck>`, so every text field without its own setting follows it.

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
- The **Art ideas** notebook (`art_ideas`) has its own view: themes, the ideas under each theme, and a picture gallery per idea. See `docs/specs/art-ideas.md`.
- The list of notebooks is kept per device; a notebook that has notes in the account but is missing on this device is added to the sidebar automatically, named from its id (`cammino_del_cuore` → "Cammino del cuore"), so no note is ever unreachable

## Done When

- User can create categories, add notes, format text, change colors/fonts
- Music mode preserves all existing song/chord/rhyme functionality
- AI generation streams results for songs
- Notes persist in database, styling in localStorage

## The Art zone (2026-10-15)

"A proper zone in my notes for art ideas, not the ideas notes, another category." A third group in the sidebar, **Art**, beside General and Music, open by default. It holds **Art ideas** (the themes-and-galleries view, moved here from General), **Art notes** (plain notes about the work), **Gallery** (the 3D digital gallery: a panel on how far along it is, step by step with a progress bar, and a panel on how to market it and get views, each opening and closing on its own, notes below) and **Philosophy** (the statement behind the work in its own panel: "Making it is statistically impossible … and yet we cannot escape the act of dreaming. The quest for a better tomorrow seems to be a program in my brain."; notes below). Every device gets the zone: the art notebooks are added to a saved list if missing, and an Art ideas notebook made before the zone joins it (`withArtZone`). The gallery's steps live in `components/GallerySpace.tsx` (`PROGRESS`) and are ticked there as the gallery is built.
