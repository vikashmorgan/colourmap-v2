# Pandas — the class page

**Status:** Active
**Date:** 2026-11-11
**Route:** `/pandas` (signed-in only; reached from School at `/school`) · marks and notes through `/api/coding/marks` and `/api/coding/notes`

## Purpose

Victor's study page for *Pandas & Data Manipulation* (Mattia Sabella, Politecnico di Milano), sessions 1 to 3. Asked for on 2026-11-11:

> "Add these to pandas as a new class in school, using same system as in statistics, but trying to not make it too long."

## The page

One self-contained file, `content/pandas/index.html`, built on the Statistics page ([spec](statistics-class.md)) and served the same way. It keeps that page's system: one lecture at a time with its progress bar, the pinned label and the map pill, *The picture* at the top, cards with the three dots and *Question or comment*, *What each piece means* and worked steps, the case pad, highlights, the notepad, Reflections, Focus, the session clock, your own boxes, *Practice* with *The numbers*, *The picture* and *The formula, then the numbers*, the folded *Summary*, and the *Cheat sheet*.

Shorter on purpose:

- **14 cards in Session 1, 17 in Session 2, 19 in Session 3**, each a short explanation, the code, and a table where it helps. The decks' many example slides are folded into one card per idea.
- **Three exercises per session**, written on the decks' own examples (orders.tsv, the five orders o1 to o5, and in Session 3 a table of five clients). Every answer was rerun in pandas 3.
- **No Charts tab and no letter peeks.** The code is the formula here. In code boxes and in `code` in the text, calls such as `.loc`, `read_csv` or `isin` open their cheat-sheet line; comments are quiet. Words such as *DataFrame*, *mask* or *NaN* open theirs.

The sessions:

1. **DataFrames and loading data**: why prepare data, Series and DataFrames, alignment by label, the three loading traps (`sep`, `encoding`, `dtype`), Excel and JSON, the six profiling calls and the profile block, export and `read_sql`.
2. **Selecting, filtering and slicing**: columns, `.loc` and `.iloc`, sorting and the integer-index trap, slices and their stops, boolean masks and `& | ~`, every filter condition (`isin`, `between`, `isna`, `.str`, `.dt`, `query`), Copy-on-Write and chained assignment.
3. **Data quality assessment**: assess before you clean, the four problems (missing, inconsistent, duplicate, inaccurate), the condition → mask → count pattern, NaN, `isna` and `any(axis=1)`, placeholders and `na_values`, spellings with `nunique` and `.str.strip().str.upper()`, `to_numeric`, related columns, `duplicated` and `subset=`, `describe`, `between` with `notna() &`, `isin`, the IQR rule, and the quality report.

Session 3 was added on 2026-11-12: "add this to school pandas. make sure explanations are clear concise and explain the parts of code that appear. not code without explanations kind of thing." Every card with code has *What each piece means*, naming each part of the code, and the IQR rule, the mismatch rule, `between` and the mask pattern are worked out step by step on the table's own values.

The text is written from the decks in plain words. The slides are the teacher's material and this repository is public, so they are never committed.

## The city

*City* in the header opens `/pandas/city` ([spec](pandas-city.md)): the lessons as cities seen from above, every part in its own place and shape, read from this page itself. The page follows `#s-3` (a lecture) and `#c-3-nan` (a card or exercise) so the city can link straight in.

## The Timer and the formula pills (2026-11-27)

Asked for: "add ability to start or pause the sessions, and a counter that shows the sessions of the day and sum of the day; a more button with a graph that puts each session in. What each means and worked out step by step should be closed by default, with open/closable pills."

- The Timer window has a **❚❚ Pause / ▶ Start** button. Paused, nothing counts even while you scroll or type; the clock button on the page dims. Start resumes the session (after a break of 30 minutes or more it becomes a new one). **New session** still starts a fresh one.
- Under the clock: **Today: N sessions · total time**. A session counts once it has a minute.
- A closed **More** pill holds a bar graph of today's sessions: one bar per session, its height the minutes, coloured like the clock, the start time under it, the session and length on hover.
- On every card, **What each piece means** and **Worked out, step by step** are closed pills side by side; a click opens one, and it takes the full width.

## Finish session (2026-11-28)

Asked for: "add a finish session button for the studying meter". Next to Pause, the Timer has **■ Finish session** while a session is running. It closes the session at once: the clock stops, the session joins *Earlier sessions* and today's count, the wheel goes back to 0, and the card says "Finished at 14:05 · 52 min". The next ▶ Start opens a new session instead of adding time to the finished one.

## Your slides

When a deck is missing, a dashed box at the bottom of the page offers *Upload slides*. The decks keep their own names: a PDF whose name has *DataFrames* is filed as `Pandas1.pdf`, one with *Selecting*, *Filtering* or *Slicing* as `Pandas2.pdf`, one with *Quality* as `Pandas3.pdf`, in the private `coding-slides` folder. `Pandas1.pdf`, or *session* and its number, works too. Each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Marks and notes use the Python page's tables through its API, under keys that start with `pandas|` (a card: `pandas|s{session}|{card}`; a session: `pandas|s{session}`; the course: `pandas|notebook`). Device keys start with `pandas-`. The Python page leaves `pandas|` notes out of its own lists, as it does `stats|`.

## Access

`/pandas` redirects a logged-out visitor to `/login?next=/pandas`. Its card is the first on the School menu, and it sits after Statistics in the Grid's Learn hub and in the Skills branch.

## Not yet

- Sessions 3 onwards, when they have happened.

## Hover a function, dive deeper from a summary (2026-11-22)

- **Hover a function.** "Make sure I can hover above [function names] and it explains the function
  … with a more button and an example … mainly all the function commands in the summaries, or even
  in lessons." One glossary of about 65 calls the class uses (`read_csv` … `quantile`,
  `subset=`, `.loc`, plus the scikit-learn and jellyfish calls it names). Every one in the
  rendered page is dotted-underlined: summaries, lessons, tables and code.
  - A name with an underscore is found bare (`to_numeric`). A plain word only as code: after a
    dot, or before `(` or `=` (`.sum()`, `subset=`). Prose stays untouched.
  - Hover (or focus, or tap) shows the call and one plain line of what it does. **More ▸** adds a
    tiny example and its result. Esc closes it.
  - Content drawn later is marked as it appears.
- **More on each summary box.** "Add a more button for the summaries … so I can dive deeper when
  needed, for each summary box." Every summary idea has a **More** pill. It opens, under the box,
  the lecture's own cards for that idea, at most two: their text, list, formula, table and
  watch-out, each with a link to its slide. Cards are picked by the words, names and calls they
  share with the idea, the card titles weighing most. An idea can name its cards by hand
  (`cards: [...]`) where the words are not enough.
