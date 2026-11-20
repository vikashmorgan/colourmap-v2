# LLMs: the class page

**Status:** Active
**Date:** 2026-11-20
**Route:** `/llms` (signed-in only; reached from School at `/school`). Marks and notes go through `/api/coding/marks` and `/api/coding/notes`.

## Purpose

Victor's study page for the course he calls *LLMs*: *Introduction to Machine Learning and Linear Models* (MSEDIM017, Eugenio Lomurno, A School × Politecnico di Milano). The course has five sessions: introduction and data visualisation; linear regression; cross-validation, regularisation and hyperparameters; linear models for classification; unsupervised learning and a mock exam. Asked for on 2026-11-20:

> "LLMs new class in school."

## The page

One self-contained file, `content/llms/index.html`, built on the Pandas page ([spec](pandas-class.md)) and served the same way. It keeps that page's whole system: one lecture at a time, cards with *What each piece means* and worked steps, Practice with answers, the folded Summary, the Cheat sheet, the notepad, Reflections and Focus.

Sessions 1 and 2 so far:

1. **Introduction to machine learning**: the course, a short history, kinds of learning, the language of data, and a first model. Its exercise, *Exploring a dataset with plots*, has a part of its own.
2. **Linear regression: training a model and measuring its error.**
   - Training and test data, and data leakage.
   - The line ŷ = wx + b, several features, and the matrix form.
   - Residuals, MSE and least squares.
   - Gradient descent and the learning rate, and why features are standardised first.
   - MAE, MSE, RMSE and R² against a mean baseline. Residual plots and outliers.
   - Train, validation and test sets. Polynomial degree as the model choice, underfitting and overfitting, and the five-step recipe.
   - Its exercise, *Pricing used cars*, has a part of its own.

## The exercises

Each session's take-home notebook has a part of its own. An intro card covers the dataset, the imports, how to submit and the course's AI rule (a help, not a replacement). Then each task has one card: what it asks, the lecture idea it practises, the code with *What each piece means* (including the blanks of the starter cells), *How to read your result* for the written answers, and the classic mistake. The final numbers and the written answers are left to the user.

The examples are the deck's own: four stores (TV budget x = 1, 2, 3, 4; sales y = 3, 5, 4, 8), each formula worked out on them by hand. The text is written in plain words. The slides are the teacher's material and this repository is public, so they are never committed. The decks and notebooks are kept in the user's Albert School classes folder under `LLMs`.

## Your slides

When a deck is missing, *Upload slides* files it as `LLMs1.pdf` or `LLMs2.pdf` in the private `coding-slides` folder, and each card's *Slide n/N ›* then opens its page.

## Storage

No new table. Keys start with `llms|` (a card: `llms|s{session}|{card}`) and device keys with `llms-`.

## Access

`/llms` redirects a logged-out visitor to `/login?next=/llms`. Its card is first on the School menu, and it sits after Pandas in the Grid's Learn hub and in the Skills branch.

## Not yet

- Sessions 3 to 5, when their decks arrive.
