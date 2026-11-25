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

## Your slides

When a deck is missing, a dashed box at the bottom of the page offers *Upload slides*. The decks keep their own names: a PDF whose name has *DataFrames* is filed as `Pandas1.pdf`, one with *Selecting*, *Filtering* or *Slicing* as `Pandas2.pdf`, one with *Quality* as `Pandas3.pdf`, in the private `coding-slides` folder. `Pandas1.pdf`, or *session* and its number, works too. Each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Marks and notes use the Python page's tables through its API, under keys that start with `pandas|` (a card: `pandas|s{session}|{card}`; a session: `pandas|s{session}`; the course: `pandas|notebook`). Device keys start with `pandas-`. The Python page leaves `pandas|` notes out of its own lists, as it does `stats|`.

## Access

`/pandas` redirects a logged-out visitor to `/login?next=/pandas`. Its card is the first on the School menu, and it sits after Statistics in the Grid's Learn hub and in the Skills branch.

## Status of the sessions (2026-11-25)

| Lecture | Cards | Deck exercises | Notebook questions | Slides |
| --- | --- | --- | --- | --- |
| 1 · DataFrames and loading | 14 | 3 | 12 | Pandas1.pdf |
| 2 · Selecting, filtering and slicing | 17 | 3 | 22 | Pandas2.pdf |
| 3 · Data quality assessment | 19 | 3 | 10 | Pandas3.pdf |
| 4 · Data cleaning | 23 | 3 | 30 | Pandas4.pdf |
| 5 · Data aggregation | 13 | 3 | 10 | Pandas5.pdf |
| 6 · Data fusion | 14 | 3 | 10 | none yet (Pandas6.pdf) |

## The notebooks, with their solutions (2026-11-25)

Asked for on 2026-11-25:

> "pull the panda classes and notebooks" … "i want u to use all the nbs with the solutions"

- **Session 6, Data fusion**, is new, written from the solution notebook's demo (no deck yet, so its cards have no *Slide* link and `pages: 0`): linked tables and `merge` on a key, rows that grow when a key repeats, `how=` (inner, left, right, outer) and finding the unmatched rows with a left merge and `isna`, a chain of merges with the shape checked at each step, two keys and `suffixes=`, aggregating a repeating table before merging, `concat` for rows (`ignore_index=True`, tagging the source) and for columns (`axis=1`, matched by label), `pivot_table`, `melt`, and the total that a reshape never changes. Every example runs on four tiny tables of its own (orders, customers, items, payments), rerun in pandas 3. It has its picture, three deck-style exercises, a summary of six ideas, a *Fusion* group in the cheat sheet and its calls in the hover glossary.
- **Session 5** gains one card from its notebook: counting orders, not lines, with `nunique` (and `ngroups`).
- **A Notebook part in every lecture**, between Practice and Summary. It opens with *The data*: a few words and a small table of what the notebook's dataset looks like (columns, an example value, the size), never the dataset itself. Then each of the teacher's exercises, restated in plain words: the task, and folded under *Open the solution* the solution code, *What each piece means* for that code, and the result in words (the notebook's own numbers, on the full files). Questions have keys `pandas|s{n}|nb-q{k}`, so notes, the notepad's place list and deep links (`#c-6-nb-q3`) reach them.
- **Copyright.** The notebooks and their CSV, Excel and JSON files stay out of this public repository. The tasks are restated, not copied; only the short solution code is kept.
- Left out: the notebooks' Part 1 demo cells of Sessions 1 to 4 (the lectures already teach them from the decks), the teacher's printouts of whole tables, and their SQL comments, except where one line helps.
- The hover glossary gains `merge`, `concat`, `pivot_table`, `melt`, `rename`, the parameters `how=`, `on=`, `suffixes=`, `ignore_index=`, `axis=`, `normalize=`, `sheet_name=`, `record_path=`, and the calls the notebooks use (`ngroups`, `idxmax`, `filter`, `mode`, `abs`, `to_datetime`, `sort_index`, `is_unique`, `.dt.dayofweek`, `.dt.hour`, `.str.title`, `levenshtein_distance`).
- The upload box files a deck whose name says *aggregation* or *groupby* as `Pandas5.pdf`, and *fusion*, *merge* or *join* as `Pandas6.pdf`.
- The city (`/pandas/city`) lights Lesson 6 on its own; its fountains stay the three deck exercises.

## Not yet

- Sessions 7 and 8, when they have happened; Session 6's slides.

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
