# SQL — the class page

**Status:** Active
**Date:** 2026-10-19
**Route:** `/sql` (signed-in only; reached from School at `/school`) · marks and notes through `/api/coding/marks` and `/api/coding/notes`

## Purpose

Victor's study page for *SQL & Business Intelligence* (MSE-DIM01-4, Albert School × Politecnico di Milano), sessions 1 to 3. Asked for on 2026-10-19:

> "Can you create a page in School for all the SQL lesson sessions 1 2 3 for studying it. Minimalistic in design so not overwhelming. Also with 3 dots, comments, questions and notepad."

## The page

One self-contained file, `content/sql/index.html`, served by a route handler like `/coding` and `/git`. It uses School's look: beige paper, a serif text and brown accents, with day and night shared with every School page (`school-theme`).

- **One session at a time.** Three buttons at the top (Session 1 · Relational databases & SELECT, Session 2 · Filter, sort, aggregate, Session 3 · Joins, subqueries, CTEs). Each has a thin green bar for how many of its cards are *Got it*. The session last opened is remembered on the device (`sql-session`).
- **Cards, in a single column.** Each card has a number (1.4), a name, a sentence or two in plain words, an example query when there is one, and a *Watch out* when the slides flag a trap. Groups follow the decks, and a group about execution order shows the order as a strip (FROM → WHERE → …). Session 1 has 11 cards, Session 2 has 20 and Session 3 has 15.
- **Each card's foot** is one line: *Question or comment* (a dashed pill, with its count once it holds notes) on the left, and the three dots on the right: *Got it*, *Confused*, *No time*. A dot fills the moment it is pressed. Notes show above the foot, each edited (✎) or deleted (× then Delete?) on its own. An answer written from the terminal shows under its question, with *Got it, mark read*.
- **Practice.** The session's in-class and take-home questions, in plain words, each folded behind *Answer ▸*. The answer is a query and its real output: every query was run on the course database, `shopstream.db`, and the first rows are stored in the page with the row count. Session 1 has 8, Session 2 has 6 plus 6 data-quality audits, and Session 3 has 6 plus the 4 lab tasks.
- **To remember.** The session's recap in five or six lines.
- **Cheat sheet** (asked for 2026-10-19: "a part where I have all the functions or terms to use in SQL, so I can check it while in class"). A fourth, dashed button after the three sessions. It opens one page with every keyword and function from sessions 1 to 3 (54 lines), grouped in the order a query is written: the skeleton, WHERE, NULL, sorting and summarising, CASE, text and cleaning, tables and keys, joins, then subqueries and CTEs. Each line has the term, one sentence, a short example when it helps, and a *Session n ›* link that opens its card. A search field stays at the top while scrolling and filters as you type, on every word, through the term, its meaning and its example; *Nothing matches* shows when nothing does. Choosing it is remembered like a session (`sql-session` = `ref`), and the notepad files notes from here under the course in general.
- **The notepad.** The same dot on the right edge and the same beige-and-brown panel as Practice on the Python page. *About* lists the course in general, each session, and each card. It is preselected to the card nearest the top of the screen, and follows the scroll until a place is chosen by hand or a note is being typed. Below, every note grouped by place, *you are here*, and a link that goes to the card (switching session if needed).

The content is written from the session decks in plain words. The slides themselves stay private and are never committed, and this repository is public.

## Storage

No new table. Marks and notes use the Python page's tables (`coding_marks`, `coding_notes`) through its API, under keys that start with `sql|`:

- a card: `sql|s{session}|{card}`, for example `sql|s2|having`
- a session in general: `sql|s{session}`
- the course in general: `sql|notebook`

The Python page leaves notes with `sql|` keys out of its own lists and Review. The browser copy is written first (`sql-marks`, `sql-notes`). Marks made before signing in are sent up once and never overwrite the account. Served outside Colour Brain, the page works on its own in the browser. Answers can be written with `scripts/coding-answer.ts`, like the Python questions.

## Access

`/sql` redirects a logged-out visitor to `/login?next=/sql`. The School menu's SQL card, until now *Coming soon*, opens it.

## Not yet

- Session 4 (KPIs and Tableau) and the window functions session, when they have happened.
- Running queries inside the page against the course database.
