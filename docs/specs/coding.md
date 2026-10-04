# Coding — the Python course study page

**Status:** Active
**Date:** 2026-10-03
**Route:** `/coding` (signed-in only) · API `/api/coding/marks`, `/api/coding/slides`

## Purpose

Victor's study companion for the Albert School × Politecnico "Python Fundamentals" course. One page that turns the course slides and his project into something he can revise from on any device, and that remembers how well he knows each part.

The page itself is a single self-contained HTML file, `content/coding/index.html`. The same file is also published on its own at coding-vikash.vercel.app, where it works without an account and keeps everything in the browser. Served from Colour Brain, it gains two things: marks and notes sync to the Google account, and every box links to the slide it came from.

## What the page holds

- **Code map** — each option of the project brief matched to the functions of his `explorer.py`, code beside a plain explanation.
- **Python toolkit** — every Python feature the project uses, in learning order.
- **Lessons** — sessions 1, 2, 3, 4, 6 and 7 (there was no session 5), each a closed box until opened. Inside: groups of boxes, one box per function or idea, numbered `session.box` (e.g. 3.12). Each box has a short explanation, an example, a **More** panel with a longer explanation and a run-checked example, and a link to its slide.
- **Examples** — sessions 4, 6 and 7 each have ten small worked examples, one idea each, run-checked. Numbered markers on the lines that matter open short comments explaining what happens there.
- **Exercises** — session 3's warm-up and twelve extra exercises, session 4's three practice-lab exercises. Each opens on its own; its solution sits behind a second toggle.
- **Vocabulary** — the end-of-session vocabulary of each session, each word with an example; a word jumps to the box that explains it.
- **Wider boxes** — a box can be widened: the expand button makes it the full row, dragging its right edge widens it column by column, and opening More widens it on its own. Once a box is wide enough, More lays the explanation beside the example.
- **The term in colour** — inside each box, the function or keyword it explains is highlighted wherever it appears in the examples and the text, so the eye finds what is being explained.
- **Review** — every question, comment, Confused and No-time box, grouped in one place.

## Marks and notes

Each box can carry:

- a **mark**: *Got it* (`got`, green), *Confused* (`mid`, yellow) or *No time* (`late`, pink-purple) — three small dots on the side of the box, each naming itself in a coloured pill on hover. The database also accepts `solid`, which the page shows as *Got it*.
- **notes**: any number of questions and comments per box, added with the button at the bottom of the box, each edited (✎) or deleted (× then Delete?) on its own. Each note has a status dot: orange while it waits for an answer or the answer is unread, green once answered and marked read. Answers are written from the terminal into the note's `answer` field and never change the note itself.

Rules:

- The browser copy (localStorage) is always written first, so marking never waits on the network.
- When served from `/coding`, the page loads the account's marks and notes on open. Boxes recorded in this browser before signing in, and absent from the account, are merged up; nothing in the account is overwritten by a merge.
- Every later change saves the whole box (mark + note) with `PUT /api/coding/marks`. A box with neither is deleted.
- Keys are `s{session}|{box name}`, so marks survive redeploys of the page as long as a box keeps its name.

Table `coding_marks` (migration `0023_coding_marks.sql`): one row per box with a mark, a note, or both; unique on `(user_id, item_key)`; RLS limits every row to its owner. The database enforces the vocabularies (`got|mid|late`, `question|comment`), that a note always has a kind, and that a row is never empty.

## Slides

The slides are the teacher's material and this repository is public, so **slides are never committed**. Each user uploads their own copies once, from the upload panel on the Lessons page, into the private Supabase bucket `coding-slides`, under a folder named after their user id. Storage policies confine reads and writes to that folder. Only the eight known file names are accepted.

A slide link is `/api/coding/slides/Session3.pdf#page=19`: the route answers with a redirect to a one-hour signed URL, and the browser keeps `#page=19` across the redirect, so the PDF opens on that slide. Slide links and the upload panel appear only when the page is served from Colour Brain.

Which page a box came from was found by searching each session's PDF text for the box's name; boxes whose name is too common to search were placed on their group's slide.

## Access

- `/coding` redirects a logged-out visitor to `/login?next=/coding`. It is a route handler, not an app screen, because the page brings its own layout and script.
- It is not a visitor path: the course notes and marks are personal.
- The nav shows **Coding** as a plain link, since it leaves the app shell.

## Deploying a change to the page

Edit the standalone copy, then copy `index.html` into `content/coding/index.html` in the same change. The route reads the file at request time.

## Reflection

- **2026-10-04.** One note per box was too few: questions and comments pile up on the same idea. Notes moved to their own table, `coding_notes` (migration 0025), one row per note, with answer and read columns so replies can be shown beside a question without editing it. The old single notes are copied across by the migration and stay in `coding_marks`, unused.

- **2026-10-04.** Back to three dots. *Solid* (a second green above *Got it*) added confusion rather than a useful distinction, and without *No time* the three-colour scheme Victor found clear was lost. The page shows *Got it*, *Confused*, *No time* again; stored `solid` marks display as *Got it*, so nothing recorded was dropped.

- **2026-10-03.** *No time* was dropped: it was not a level of understanding, and Victor found it unnecessary. The database still accepts it so nothing recorded is lost.

- **2026-10-03.** *Got it* covered both "I followed it" and "I own it". A fourth level, *Solid*, in a clearer green, now marks the second; migration 0024 widens the allowed marks.

- **2026-10-03.** First built as a standalone static site with marks in localStorage only. That could not follow Victor between phone and laptop, so it moved behind Colour Brain's existing Google login and Supabase rather than standing up a second auth setup. Slides were first planned to ship with the page; the repository being public ruled that out, so they became per-user private uploads.
