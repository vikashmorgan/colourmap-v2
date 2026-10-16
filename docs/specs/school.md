# School

**Status:** Active
**Date:** 2026-10-16
**Where:** `/school` (top navigation: School) · `content/school/index.html` · `app/school/route.ts`

## Purpose

One way into every class Victor takes at Albert School × Politecnico di Milano. Asked for 2026-10-16: "the platform for all classes. Call it School, not Coding, and you get a menu with different classes. A third class will be added for SQL."

## What it holds

A sober menu, in the style of the Git page, with one card per class:

- **Python**: Python Fundamentals, Project 1 (`explorer.py`). Opens `/coding` ([spec](coding.md)).
- **Git**: MSE-DIM01-3. Opens `/git` ([spec](git-class.md)).
- **SQL**: announced as coming soon, not yet a link.

## Rules

- Signed-in only; logged-out visitors go to `/login?next=/school`.
- One self-contained page served by a route handler, like `/coding` and `/git`; no app shell.
- The top navigation has a single **School** link in place of the separate Coding and Git links.
- Every class page leads back: Python's top-left button and Git's first link read **← School** and go to `/school`. Python's button still shows only when the page is served from Colour Brain, since the same file is also published on its own.
- Each class keeps its own page and its own route; School only links to them.

## Adding a class

Give it its own page and route (as `/git`), then turn its card on the School page into a link. For SQL: `content/sql/index.html`, `app/sql/route.ts`, and the SQL card's `href="/sql"`.
