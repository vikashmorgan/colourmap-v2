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

## The exercises

Each session's take-home notebook has a part of its own. An intro card covers the dataset, the imports, how to submit and the course's AI rule (a help, not a replacement). Then each task has one card: what it asks, the lecture idea it practises, the code with *What each piece means* (including the blanks of the starter cells), *How to read your result* for the written answers, and the classic mistake. The final numbers and the written answers are left to the user.

From session 3 on, the lecture and the exercise point at each other. Each task card lists the lecture cards it practises, and each of those lecture cards shows *Practised in the exercise* with a link back to the tasks. Both directions come from one list per task (`uses`), so they always agree.

The examples are the deck's own: four stores (TV budget x = 1, 2, 3, 4; sales y = 3, 5, 4, 8) in sessions 2 and 3, and ten customers with their scores in session 4, each formula worked out on them by hand. The text is written in plain words. The slides are the teacher's material and this repository is public, so they are never committed. The decks and notebooks are kept in the user's Albert School classes folder under `LLMs`.

## Your slides

When a deck is missing, *Upload slides* files it as `LLMs1.pdf` to `LLMs4.pdf` in the private `coding-slides` folder, and each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Keys start with `llms|` (a card: `llms|s{session}|{card}`) and device keys with `llms-`.

## Access

`/llms` redirects a logged-out visitor to `/login?next=/llms`. Its card is first on the School menu, and it sits after Pandas in the Grid's Learn hub and in the Skills branch.

## Not yet

- Session 5, when its deck arrives (the Lecture 5 download of 2026-11-26 was an empty folder).
