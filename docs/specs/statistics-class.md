# Statistics — the class page

**Status:** Active
**Date:** 2026-11-05
**Route:** `/statistics` (signed-in only; reached from School at `/school`) · marks and notes through `/api/coding/marks` and `/api/coding/notes`

## Purpose

Victor's study page for *Statistics & Probability for Data Science* (Alberto Archetti, Politecnico di Milano), lectures 1 to 3. Asked for on 2026-11-05:

> "I need to work with the new classes, can you add them in the lessons part for a new chapter branch called statistics."
> "Use the SQL format and design for this new statistics chapter. Put it above Python as Python and other classes are from last trimester."

## The page

One self-contained file, `content/statistics/index.html`, served by a route handler like `/sql`. It takes the SQL page's look and behaviour ([spec](sql-class.md)) and keeps its order: School's beige paper, day and night shared through `school-theme`.

- **Overall questions and comments.** The dashed box above the lecture buttons (key `stats|notebook`).
- **One lecture at a time.** Three lecture buttons and the cheat sheet, each lecture with a thin green bar for how many of its cards are *Got it*. The one last opened is remembered on the device (`stats-session`). A label stays pinned at the top of the screen (see the map).
- **The map: where you are** (asked for 2026-11-05: "a system that helps me know where I am, like a dot on the left that tells me this is segment 2 of Lecture 3, and I see the segments of Lecture 3, or the segments of Lecture 1 or 2", then "a vertical pill that opens, a column with the stacks of the segments that can be opened and closed"). Closed, it is a vertical pill on the left: the lecture (*L3*) over one dot per segment on a line, each in its segment's colour, the current one larger with its number. On a phone the pill sits flush against the edge. Tapping the pill, or the pinned label at the top, opens a column with one stack per lecture and *Cheat sheet* below them. A lecture's stack opens and closes to show its segments in their colours: *The picture* in grey, then the groups, *Practice* and *To remember*. A segment with cards opens and closes to list them. Opening or closing never moves the page: the arrow on a segment, a card, or a row with nothing to open takes you there, changing lecture if needed. The segment you are in is outlined and says *you are here*, its current card is marked, and it opens as you enter it and closes as you leave. Entering another lecture leaves only that lecture open. On a wide screen (1240px or more) the column sits in the margin beside the page, stays open after a jump, and its open or closed state is remembered (`stats-map-open`). On a smaller screen it always starts closed, opens over the page and closes after a jump, a tap outside or Escape. The pinned label reads *Lecture 3 · Segment 2 of 6 · Probability mass functions* in the segment's colour.
- **The picture.** A folded-open box at the top of each lecture draws the lecture on Nookery, the course's made-up shop: Lecture 1 the grid of outcomes, shaded events and Venn diagrams; Lecture 2 the warehouse tree, the Bayes table and the detector dog in counts; Lecture 3 the larger-roll grid, its PMF, the three named models and the spread of two warehouses. Closing it is remembered (`stats-pic-closed`).
- **Cards, in a single column, with nothing to open.** Asked for 2026-11-05: "I am not good at math, I have no experience, I need elements to be decomposed and clear"; "this should directly explain the conditions, 1 2 3 4, not a small text and then conditions if I click for more; don't do super short text, focus on clarity and on the building blocks". So the SQL page's folded *Explain more + example* is not used here. A card shows, in this order: a plain number and a name; an explanation in full sentences that assumes no maths and defines each word; a numbered list when the card is a list (the binomial's four conditions); the formula; *What each piece means*; *Worked out, step by step*; any example table or chart; and *Watch out*. Lecture 1 has 30 cards, Lecture 2 has 20 and Lecture 3 has 21.
- **Every formula, piece by piece** (asked for 2026-11-05: "I wanna understand how the big sum works, imagine it with x 1 2 3, and what m represents; the elements in the equation need to be explained one by one"). Under each formula, a list names every symbol and what it means. Most formulas are then worked out line by line on a tiny example; the sums use x = 1, 2, 3 with probabilities 0.5, 0.3 and 0.2.
- **A colour per segment** (asked for 2026-11-05: "each segment of boxes has a colour so I can see visually the different parts I am in"). As on the Python page, each group of cards in a lecture has its own hue: a tint on its boxes and the colour of its title and card numbers. It follows day and night. Practice has its own colour too.
- **Term peek.** A statistics word in a card's text (Bayes, partition, binomial…) or a symbol in a formula (∪, ∩, ∣, Ω…) can be hovered. After 0.6 s its cheat-sheet line opens in a box at the side, with a link to its card. On a phone, a tap opens it as a sheet at the bottom.
- **Notes, dots and highlights.** The same as SQL: *Question or comment*, the three dots (*Got it*, *Confused*, *Confused as fuck*), bold in notes, the four highlight colours (`stats-highlights`), and the notepad on the right. Answers can be written with `scripts/coding-answer.ts`.
- **Slides.** Each card's foot has *Slide n ›*, which opens the deck on the PDF page the card comes from (`/api/coding/slides/Stats{n}.pdf#page={n}`).
- **Practice.** The lecture's exercises (3, 4 and 4), each with its setup and each part folded behind its answer. Every figure was recomputed from its setup.
- **To remember.** The lecture's rules and warnings in a few lines.
- **Cheat sheet.** A dashed tab with every rule and term from the three lectures, grouped by topic, with search on every word and a *Lecture n ›* link to its card.

Left out on purpose: the SQL page's Business case tab, its Query order box and its SQL colouring, which have nothing to carry here.

The text is written from the decks in plain words. The slides are the teacher's material and this repository is public, so they are never committed.

## Your slides

When a deck is missing, a dashed box at the bottom of the page says which lectures, with *Upload slides* (several PDFs at once). `Stats2.pdf`, or any PDF whose name has *lecture*, *lesson* or *session* and its number (`lecture02_conditioning_bayes.pdf`), is filed as `Stats{n}.pdf` in the private `coding-slides` folder. The box hides once all three are there.

## Storage

No new table. Marks and notes use the Python page's tables through its API, under keys that start with `stats|`:

- a card: `stats|s{lecture}|{card}`, for example `stats|s2|bayes`
- a lecture in general: `stats|s{lecture}`
- the course in general: `stats|notebook`

The Python page leaves `stats|` notes out of its own lists and Review, as it does `sql|`. The browser copy is written first (`stats-marks`, `stats-notes`), and marks made before signing in are sent up once and never overwrite the account.

## Access

`/statistics` redirects a logged-out visitor to `/login?next=/statistics`. Its card is the first on the School menu, above last trimester's classes, and it is listed above Python in the Grid's Learn hub.

## Not yet

- Lectures after the third, when they have happened.
- The Lecture 3 assignment spreadsheet.
