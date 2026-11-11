# Pandas — the class page

**Status:** Active
**Date:** 2026-11-11
**Route:** `/pandas` (signed-in only; reached from School at `/school`) · marks and notes through `/api/coding/marks` and `/api/coding/notes`

## Purpose

Victor's study page for *Pandas & Data Manipulation* (Mattia Sabella, Politecnico di Milano), sessions 1 and 2. Asked for on 2026-11-11:

> "Add these to pandas as a new class in school, using same system as in statistics, but trying to not make it too long."

## The page

One self-contained file, `content/pandas/index.html`, built on the Statistics page ([spec](statistics-class.md)) and served the same way. It keeps that page's system: one lecture at a time with its progress bar, the pinned label and the map pill, *The picture* at the top, cards with the three dots and *Question or comment*, *What each piece means* and worked steps, the case pad, highlights, the notepad, Reflections, Focus, the session clock, your own boxes, *Practice* with *The numbers*, *The picture* and *The formula, then the numbers*, the folded *Summary*, and the *Cheat sheet*.

Shorter on purpose:

- **14 cards in Session 1, 17 in Session 2**, each a short explanation, the code, and a table where it helps. The decks' many example slides are folded into one card per idea.
- **Three exercises per session**, written on the decks' own examples (orders.tsv and the five orders o1 to o5). Every answer was rerun in pandas 3.
- **No Charts tab and no letter peeks.** The code is the formula here. In code boxes and in `code` in the text, calls such as `.loc`, `read_csv` or `isin` open their cheat-sheet line; comments are quiet. Words such as *DataFrame*, *mask* or *NaN* open theirs.

The sessions:

1. **DataFrames and loading data**: why prepare data, Series and DataFrames, alignment by label, the three loading traps (`sep`, `encoding`, `dtype`), Excel and JSON, the six profiling calls and the profile block, export and `read_sql`.
2. **Selecting, filtering and slicing**: columns, `.loc` and `.iloc`, sorting and the integer-index trap, slices and their stops, boolean masks and `& | ~`, every filter condition (`isin`, `between`, `isna`, `.str`, `.dt`, `query`), Copy-on-Write and chained assignment.

The text is written from the decks in plain words. The slides are the teacher's material and this repository is public, so they are never committed.

## Your slides

When a deck is missing, a dashed box at the bottom of the page offers *Upload slides*. The decks keep their own names: a PDF whose name has *DataFrames* is filed as `Pandas1.pdf`, one with *Selecting*, *Filtering* or *Slicing* as `Pandas2.pdf`, in the private `coding-slides` folder. `Pandas1.pdf`, or *session* and its number, works too. Each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Marks and notes use the Python page's tables through its API, under keys that start with `pandas|` (a card: `pandas|s{session}|{card}`; a session: `pandas|s{session}`; the course: `pandas|notebook`). Device keys start with `pandas-`. The Python page leaves `pandas|` notes out of its own lists, as it does `stats|`.

## Access

`/pandas` redirects a logged-out visitor to `/login?next=/pandas`. Its card is the first on the School menu, and it sits after Statistics in the Grid's Learn hub and in the Skills branch.

## Not yet

- Sessions 3 onwards, when they have happened.
