# Art ideas

**Status:** Active
**Date:** 2026-10-07
**Where:** Notebook → **Art ideas** (category `art_ideas`) · API `/api/art/gallery/[ideaId]`

## Purpose

A space where Victor visualises his next moves in art: the themes he is reflecting on, the ideas for pieces that grow out of each theme, and the pictures that go with each idea (sketches, references, photos of work in progress). Alongside the notebooks and the journal, it is the third kind of writing in Colour Brain.

## Behaviour

- **Themes.** The Art ideas notebook opens as a list of themes, oldest first, each in its own card, numbered, with its text written in place (tap to edit, saved when leaving the box). A field at the top adds a theme. A title written as `Theme 3 · Breaking through` shows as *Breaking through*.
- **Ideas, under their theme.** Each theme lists its ideas and has a field to add one. An idea opens in place (one at a time) to show its description (tap to edit) and its gallery.
- **Gallery.** Each idea has its own gallery: *+ Add pictures* takes one or several images (JPEG, PNG, WebP or GIF, up to 10 MB each), shown as a grid of squares in the order they were added. Tapping one shows it large; *Remove* then *Delete?* removes it; Escape or *Close* closes it.

## Data

- Themes and ideas are ordinary notebook entries in the category `art_ideas`, so they sync, appear on every device and keep the notebook's rules:
  - an **idea** is tagged `idea` and `theme:<theme id>`, which puts it under its theme;
  - every other entry in the category is a **theme** (so themes written before this view, or added from the terminal with `scripts/brain-write.ts`, stay themes).
- Pictures live in the private Supabase bucket `art-gallery` (migration `0026_art_gallery.sql`), at `{userId}/{ideaId}/{timestamp}-{name}.{ext}`, read through signed links valid for an hour. Storage policies confine every read, upload and removal to the user's own folder; the route also builds every path itself from a checked idea id and a cleaned file name, and removes only names it could have stored.

## Edge cases

- No themes yet: an invitation to start with a question you keep coming back to.
- An idea whose theme was deleted no longer shows (its entry is still in the notebook data).
- A picture refused by the server (wrong type, too large) is named under the gallery with the reason; the others still upload.

## Done when

- Themes, ideas under each theme, and a gallery per idea work on phone and laptop.
- Tests: `lib/art/gallery.test.ts`, `app/api/art/gallery/[ideaId]/route.test.ts`, `components/ArtIdeas.test.tsx`.
