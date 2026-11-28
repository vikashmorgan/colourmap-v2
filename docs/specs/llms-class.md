# LLMs: the class page

**Status:** Active
**Date:** 2026-11-20
**Route:** `/llms` (signed-in only; reached from School at `/school`). Marks and notes go through `/api/coding/marks` and `/api/coding/notes`.

## Purpose

Victor's study page for the course he calls *LLMs*: *Introduction to Machine Learning and Linear Models* (MSEDIM017, Eugenio Lomurno, A School × Politecnico di Milano). The course has five sessions: introduction and data visualisation; linear regression; cross-validation, regularisation and hyperparameters; linear models for classification; unsupervised learning and a mock exam. Asked for on 2026-11-20:

> "LLMs new class in school."

## The page

One self-contained file, `content/llms/index.html`, built on the Pandas page ([spec](pandas-class.md)) and served the same way. It keeps that page's whole system: one lecture at a time, cards with *What each piece means* and worked steps, Practice with answers, the folded Summary, the Cheat sheet, the notepad, Reflections and Focus.

Sessions 1 to 4 so far:

1. **Introduction to machine learning**: the course, a short history, kinds of learning, the language of data, and a first model. Its exercise, *Exploring a dataset with plots*, has a part of its own.
2. **Linear regression: training a model and measuring its error.**
   - Training and test data, and data leakage.
   - The line ŷ = wx + b, several features, and the matrix form.
   - Residuals, MSE and least squares.
   - Gradient descent and the learning rate, and why features are standardised first.
   - MAE, MSE, RMSE and R² against a mean baseline. Residual plots and outliers.
   - Train, validation and test sets. Polynomial degree as the model choice, underfitting and overfitting, and the five-step recipe.
   - Its exercise, *Pricing used cars*, has a part of its own.
3. **Cross-validation and regularisation: choosing a model you can trust.** Added on 2026-11-24.
   - Why one validation split is not enough: five random cuts choose five different degrees.
   - k-fold cross-validation, the CV score and its spread, leave-one-out (worked by hand on the four stores), `KFold` and `cross_val_score` with the minus sign, and `validation_curve` for the degree. The recipe without a validation set.
   - Polynomial features of several inputs, interactions, and how fast their number grows.
   - A penalty on the weights: Ridge and Lasso (both worked on the four stores with scikit-learn's own numbers), the deck's two-models trade, Ridge on a degree-12 curve, scaling first, and reading Ridge and Lasso coefficient paths.
   - Parameters and hyperparameters, grid search, the pipeline that keeps the scaler inside each fold, `GridSearchCV`, and the full recipe: cross-validate to choose, test once.
   - Its exercise, *Pricing office rents* (200 offices, nine tasks), has a part of its own.
4. **Linear models for classification: from probabilities to decisions.** Added on 2026-11-26.
   - Classification against regression, the positive class, and the deck's 1,000 streaming customers (189 who leave, imbalanced).
   - Logistic regression: why not a straight line, the sigmoid, the score and the threshold, the deck's one-feature example (z = −2.5 + 0.8 × calls) worked by hand, reading the weights, the straight decision boundary, the log-loss, and the built-in penalty C.
   - Decisions: the threshold and accuracy, and the deck's ten customers at three thresholds.
   - Evaluation: the confusion matrix, two errors with two prices, accuracy, precision, recall and F1, the card-fraud example where accuracy lies, the ROC curve, ROC-AUC as the share of pairs ranked right (20 of 24 on the ten customers), and the precision-recall curve.
   - Imbalance and costs: stratified splits, the cheapest threshold (0.3 at 1,800 € against 2,350 € at 0.5), balanced class weights, and the full recipe.
   - Its exercise, *Approving loans* (1,500 loans, nine tasks), has a part of its own.

## Charts

Asked for on 2026-11-26: "add visuals and graphs for the lessons so we can visualise, when needed." A card whose idea is a shape gets a chart, drawn as inline SVG in the page's own colours, in day and night: a two-colour series pair (brown and teal) checked for colour-blind separation and contrast on both papers, a quiet grid, labels in text ink, and a hover tip on each dot and bar. Each chart sits in its card under the formula; cards whose idea is a table or a list keep their table.

22 charts so far. Session 1: the tip line through the first bills. Session 2: line C through the four stores, the residuals, the MSE bowl with the gradient-descent steps, three learning rates, the outlier that flips the slope, training against validation error. Session 3: leave-one-out on store 4, CV error by degree, the Ridge and Lasso slopes as α grows. Session 4: churn by months against a straight line and a sigmoid, the sigmoid, Example 1 on the S curve, the decision boundary through the 200 validation customers, the log-loss, the histogram of predicted probabilities, the ten customers and three thresholds, both ROC curves, the AUC, the precision-recall curve and the cost against the threshold. Session 4's data are the guided notebook's own, re-run.

## The story (2026-11-27)

Asked for after comparing with summaries written by the desktop agent: "summaries that really give a clear overview as text, and then a few graph examples". Each session opens with a closed fold, **The story: the session as one read**, above the essentials summary. It tells the session as one connected text: a lead, then 6 to 8 short parts (the problem, the fix, the running example's numbers), with the session's charts placed where an idea is a shape, a link at the end of each part to its card, and a last line on how it leads to the next session. The story is for understanding; the essentials summary stays for checking. Every number in a story is the one on its card. Sessions 1 to 4 have one; the fold remembers whether you left it open.

The story is the highlighted box of the session (asked for: "need to highlight that first quick summary story part"): a warm tint with an orange bar on the left, a small "Start here · N min read" line, and the story's opening sentence visible while it is closed.

The story and the exercise at a glance take the highlighter like the cards (asked for: "add the highlighting colours for school"): select text in the lead, a part, the last line, a task row, a point to remember or the pattern, and the same six colours appear. Highlights are kept on this device and come back after every redraw.

A chart was added for it on card 3.2: the degree each of five random cuts chooses (5, 3, 10, 5, 2).

## The lines you write (2026-11-27)

Asked for: "mark in warm orange the lines of code that you put in, so we understand". On the exercise task cards of sessions 2 to 4, the answer's lines that the notebook leaves as `...` or does not give at all are marked in warm orange: a tinted band with a bar on the left, plus a small key above the code ("The lines you write; the rest is given in the notebook"). The marks come from comparing each answer with the course's template notebooks (`EX_MINE`). Session 1's template is not available, so its code is not marked.

## Twins: Ridge splits, Lasso picks (2026-11-27)

Card 3.12 explains why two features that move together are where Ridge and Lasso behave differently. Say the pair needs a total weight of 2. Squared, sharing costs 1² + 1² = 2 against 2² = 4, so Ridge splits the weight. In absolute values both cost 2, so Lasso picks one. A chart of the penalty for each way of sharing goes with it. The story of session 3 tells the same, and exercise Task 6 links to the card.

## The exercise at a glance (2026-11-27)

Asked for: "for all the exercise sessions, what did they ask, what should we fill, and what is there to remember from the process, so I get the pattern of what they need me to learn". At the top of each session's exercise part sits a closed fold, **The exercise at a glance**. It opens with one line on the dataset, then a table with one row per task: the task (a link to its card), what they ask as a question, and the call you write. Below the table are five points to remember from the process, and the pattern every exercise shares: look, split, fit on training, compare on unseen data, choose, test once, say what the number means. Only the comparing step changes between sessions: validation (2), cross-validation and penalties (3), thresholds and costs (4).

## Gaps, answer and result (2026-11-27)

Asked for: "generate the graphs for these exercise sessions, and keep first the code lines with gaps they gave us and then your answer so I can compare, with open closable tabs". On every exercise task card (sessions 1 to 4):

- **The notebook's code, with the gaps** is shown first, as the course notebook gives it, with its `...` (sessions 2 to 4; session 1's empty notebook is not available).
- **My answer** is a closed pill holding the full answer, with the lines you write in orange.
- **The result** is a closed pill with the graph the answer draws and what it prints.

Graphs and printed outputs come from running each course notebook top to bottom with the answers in place of the gaps (`EX_RUN` in the page). The 27 figures are PNGs in `public/llms-ex/`.

## In the notebook: the lecture notebooks' graphs (2026-11-27)

Asked for: "add the graphs from the coding … starting with lecture 4" (the lecture notebook graphs, on the LLMs page). The lecture cards whose idea the guided notebook draws get a closed pill, **In the notebook**. It holds the notebook's own graph (its saved output, the real plot from the course) and, folded under it, **The code that draws it**: the notebook cell.

- Lecture 4 (9 graphs): customers (class balance, the features by class), weights, boundary, threshold (probabilities, accuracy against the threshold), two-prices (confusion matrix and cost), roc-ours (ROC and precision-recall), cheapest.
- Lecture 3 (4): cv-score, cv-degree, lasso-path, grid.
- Lecture 2 (6): features, line, rate, look, poly, val-curve.

The graphs are PNGs in `public/llms-lec/`, listed in `LEC_FIGS` in the page. Lecture 1's notebook is not available yet.

## The exercises

Each session's take-home notebook has a part of its own. An intro card covers the dataset, the imports, how to submit and the course's AI rule (a help, not a replacement). Then each task has one card: what it asks, the lecture idea it practises, the code with *What each piece means* (including the blanks of the starter cells), *How to read your result* for the written answers, and the classic mistake. The final numbers and the written answers are left to the user.

From session 3 on, the lecture and the exercise point at each other. Each task card lists the lecture cards it practises, and each of those lecture cards shows *Practised in the exercise* with a link back to the tasks. Both directions come from one list per task (`uses`), so they always agree.

The examples are the deck's own: four stores (TV budget x = 1, 2, 3, 4; sales y = 3, 5, 4, 8) in sessions 2 and 3, and ten customers with their scores in session 4, each formula worked out on them by hand. The text is written in plain words. The slides are the teacher's material and this repository is public, so they are never committed. The decks and notebooks are kept in the user's Albert School classes folder under `LLMs`.

## The Timer and the formula pills (2026-11-27)

Asked for: "add ability to start or pause the sessions, and a counter that shows the sessions of the day and sum of the day; a more button with a graph that puts each session in. What each means and worked out step by step should be closed by default, with open/closable pills."

- The Timer window has a **❚❚ Pause / ▶ Start** button. Paused, nothing counts even while you scroll or type; the clock button on the page dims. Start resumes the session (after a break of 30 minutes or more it becomes a new one). **New session** still starts a fresh one.
- Under the clock: **Today: N sessions · total time**. A session counts once it has a minute.
- A closed **More** pill holds a bar graph of today's sessions: one bar per session, its height the minutes, coloured like the clock, the start time under it, the session and length on hover.
- On every card, **What each piece means** and **Worked out, step by step** are closed pills side by side; a click opens one, and it takes the full width.
- On the exercise task cards, **How to read your result** and **Watch out** join the same row of closed pills (asked for: "make sure the open closable stuff also for the exercises"). The code stays visible. Lecture cards keep their Watch out open.

## Finish session (2026-11-28)

Asked for: "add a finish session button for the studying meter". Next to Pause, the Timer has **■ Finish session** while a session is running. It closes the session at once: the clock stops, the session joins *Earlier sessions* and today's count, the wheel goes back to 0, and the card says "Finished at 14:05 · 52 min". The next ▶ Start opens a new session instead of adding time to the finished one.

## Your slides

When a deck is missing, *Upload slides* files it as `LLMs1.pdf` to `LLMs4.pdf` in the private `coding-slides` folder, and each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Keys start with `llms|` (a card: `llms|s{session}|{card}`) and device keys with `llms-`.

## Access

`/llms` redirects a logged-out visitor to `/login?next=/llms`. Its card is first on the School menu, and it sits after Pandas in the Grid's Learn hub and in the Skills branch.

## Not yet

- Session 5, when its deck arrives (the Lecture 5 download of 2026-11-26 was an empty folder).

## How to read each chart (2026-11-28)

Asked for: "slides never clear on what is what ... I get graphs and never connect how they relate and what they mean and what is the point". Under every chart drawn in a card or a story, a box gives two things. **How to read it** says what is across and up, and what every colour, line and dot is: brown is series a, blue is series b, grey is a reference line. **The point** says why the chart is there and how it links to the cards around it. The text lives in `VIZ_READ`, keyed like `VIZ`, and is rendered by `vizHtml`.

**Flagged** is defined wherever it first appears: card 13, the confusion matrix card, the glossary, and as a tappable term. It means the model predicts the customer will leave (score ≥ threshold); not flagged means predicted to stay.
