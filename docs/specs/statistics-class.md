# Statistics — the class page

**Status:** Active
**Date:** 2026-11-05
**Route:** `/statistics` (signed-in only; reached from School at `/school`) · marks and notes through `/api/coding/marks` and `/api/coding/notes`

## Purpose

Victor's study page for *Statistics & Probability for Data Science* (Alberto Archetti, Politecnico di Milano), lectures 1 to 4. Asked for on 2026-11-05:

> "I need to work with the new classes, can you add them in the lessons part for a new chapter branch called statistics."
> "Use the SQL format and design for this new statistics chapter. Put it above Python as Python and other classes are from last trimester."

## The page

One self-contained file, `content/statistics/index.html`, served by a route handler like `/sql`. It takes the SQL page's look and behaviour ([spec](sql-class.md)) and keeps its order: School's beige paper, day and night shared through `school-theme`.

- **Overall questions and comments.** The dashed box above the lecture buttons (key `stats|notebook`).
- **One lecture at a time.** Three lecture buttons and the cheat sheet, each lecture with a thin green bar for how many of its cards are *Got it*. The one last opened is remembered on the device (`stats-session`). A label stays pinned at the top of the screen (see the map).
- **The map: where you are** (asked for 2026-11-05: "a system that helps me know where I am, like a dot on the left that tells me this is segment 2 of Lecture 3, and I see the segments of Lecture 3, or the segments of Lecture 1 or 2", then "a vertical pill that opens, a column with the stacks of the segments that can be opened and closed"). Closed, it is a vertical pill on the left: the lecture (*L3*) over one ochre dot per segment on a line, the current one larger with its number. On a phone the pill sits flush against the edge. Tapping the pill, or the pinned label at the top, opens a column with one stack per lecture and *Cheat sheet* below them. A lecture's stack opens and closes to show its segments in their colours: *The picture* in grey, then the groups, *Practice* and *To remember*. A segment with cards opens and closes to list them. Opening or closing never moves the page: the arrow on a segment, a card, or a row with nothing to open takes you there, changing lecture if needed. The segment you are in is outlined and says *you are here*, its current card is marked, and it opens as you enter it and closes as you leave. Entering another lecture leaves only that lecture open. On a wide screen (1240px or more) the column sits in the margin beside the page, stays open after a jump, and its open or closed state is remembered (`stats-map-open`). On a smaller screen it always starts closed, opens over the page and closes after a jump, a tap outside or Escape. The pinned label reads *Lecture 3 · Segment 2 of 6 · Probability mass functions* in the segment's colour.
- **Text size** (asked for 2026-11-05: "on the notepad, a button to define the size of the letters, so I can increase it when my eyes are tired; it can also open the horizontal space of the boxes so they expand with the type"). The notepad's header has *A−* and *A+*, with the size between them: 100, 110, 120, 135 or 150%. The page and the side boxes grow together, boxes included, up to the width of the screen, and you stay on the same card. The map moves aside as the page widens, and opens over the page when there is no longer room beside it. The size is remembered in this browser (`stats-text-size`).
- **Boxes that lead to boxes** (asked for 2026-11-05: "when I hover over the Greek E inside an opened box that explains normal E, it opens a second box, with a line connecting the two so I understand the link, placing the second box below the first"). Terms and letters inside a side box have a dotted underline. Hovering one, or tapping it on a phone, opens the next box below, and a line runs from that term along the outside of the box above and into the new one. A box can lead to another in turn; it never reopens one already open above it. × or Escape closes the last box, a click elsewhere closes them all, and a hover on the page starts a new set.
- **The picture.** A folded-open box at the top of each lecture draws the lecture on Nookery, the course's made-up shop: Lecture 1 the grid of outcomes, shaded events and Venn diagrams; Lecture 2 the warehouse tree, the Bayes table and the detector dog in counts; Lecture 3 the larger-roll grid, its PMF, the three named models and the spread of two warehouses; Lecture 4 a shaded density, the three named densities, the courier's CDF and a box plot. Density curves and box plots are drawn inline, in the page's colours. Closing it is remembered (`stats-pic-closed`).
- **Cards, in a single column, with nothing to open.** Asked for 2026-11-05: "I am not good at math, I have no experience, I need elements to be decomposed and clear"; "this should directly explain the conditions, 1 2 3 4, not a small text and then conditions if I click for more; don't do super short text, focus on clarity and on the building blocks". So the SQL page's folded *Explain more + example* is not used here. A card shows, in this order: a plain number and a name; an explanation in full sentences that assumes no maths and defines each word; a numbered list when the card is a list (the binomial's four conditions); the formula; *What each piece means*; *Worked out, step by step*; any example table or chart; and *Watch out*. Lecture 1 has 30 cards, Lecture 2 has 20, Lecture 3 has 21 and Lecture 4 has 25.
- **Every formula, piece by piece** (asked for 2026-11-05: "I wanna understand how the big sum works, imagine it with x 1 2 3, and what m represents; the elements in the equation need to be explained one by one"). Under each formula, a list names every symbol and what it means. Most formulas are then worked out line by line on a tiny example; the sums use x = 1, 2, 3 with probabilities 0.5, 0.3 and 0.2. A worked example is two columns, asked for 2026-11-05: "on the left I have the formulas by pieces so I connect the dots", "with the numbers p k n, so I can understand p = ... or n = ...". It opens with what each letter is (*n = 3*, *p = 0.2*, *k = 1*), then each piece of the formula on the left beside the same piece in numbers on the right, ending on the whole formula and its result in bold. The letters reveal themselves too, asked for 2026-11-05: "X, small x, and n, p terms like that should also reveal what they are when I hover, just like Var()". Hovering a letter in a formula or in the text, or tapping it on a phone, opens the same side box as a term: what the card says the letter is, or its general meaning, and its value in that example, such as *p = 0.2*. Letters keep the colour of the text around them and underline on hover, so a formula stays calm. The English words *a* and *A* are left alone in running text.
- **Two colours, and a mark for each segment** (asked for 2026-11-05: "each segment of boxes has a colour so I can see visually the different parts I am in", then "I love the colour of slides 1 to 10 in Lecture 1, how can we keep this colour and still see the different groupings, perhaps something on the left of the boxes indicating part 1/4, with the column stack"). Every lecture uses the blue and lavender of Lecture 1's cards 1 to 10, in turn from one segment to the next, *Practice* and *To remember* included: a tint on the boxes and the colour of the title and card numbers, in day and night. Down the left of each segment's boxes runs a line of small ochre dots with a tab that stays in view as you read, such as *Segment 2/8*, in the same count as the pinned label. Tapping the tab opens the map. Asked for 2026-11-05: "the vertical bar on the left more discreet, less super colourful and more sober, like ochre dots": this line, the tab and the pill's dots are ochre, whatever the segment's colour.
- **Term peek.** A statistics word in a card's text (Bayes, partition, binomial…) or a symbol in a formula (∪, ∩, ∣, Ω…) can be hovered. After 0.6 s its cheat-sheet line opens in a box at the side, with a link to its card. On a phone, a tap opens it as a sheet at the bottom.
- **Notes, dots and highlights.** The same as SQL: *Question or comment*, the three dots (*Got it*, *Confused*, *Confused as fuck*), bold in notes, the four highlight colours (`stats-highlights`), and the notepad on the right. Answers can be written with `scripts/coding-answer.ts`.
- **Your own boxes** (asked for 2026-11-05: "add ability to create new boxes, so I can write a new box and give it a title"). Each card segment ends with a quiet *+ New box*. It opens a title and a text field; the title is required and the text is optional. A box sits after the course's cards in that segment's colour, with no number, no dots and no notes of its own, and can be edited or deleted (two taps). It is saved to the account as one note under `stats|box|s{lecture}|g{segment}`: the first line is the title, the rest the text, 120 and 1,870 characters at most. It does not appear in the notepad or count towards progress. A new box's unsaved words are kept in this browser (`stats-box-drafts`) until it is saved or cancelled. A box that could not reach the account stays in this browser and goes up on the next load.
- **Slides.** Each card's foot has *Slide n ›*, which opens the deck on the PDF page the card comes from (`/api/coding/slides/Stats{n}.pdf#page={n}`).
- **Practice.** The lecture's exercises (3, 4, 4 and 4), each with its setup and each part folded behind its answer. Every figure was recomputed from its setup.
- **To remember.** The lecture's rules and warnings in a few lines.
- **Cheat sheet.** A dashed tab with every rule and term from the four lectures, grouped by topic, with search on every word and a *Lecture n ›* link to its card.

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
