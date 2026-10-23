# Git class page

**Status:** Active
**Date:** 2026-10-15
**Where:** `/git` (top navigation: School → Git) · `content/git/index.html` · `app/git/route.ts`

## Purpose

A study page for the Git course (MSE-DIM01-3, Marco Molè), "similar to the coding app but more sober: less over-information, explaining the key concepts and the key terms I need" to explain to the teacher what was done.

## What it holds

- **The five steps**, each in its own colour (1 Skeleton terracotta, 2 On GitHub blue, 3 Branch & merge violet, 4 Layout green, 5 Reproducible gold), shown first as a row of five coloured tiles. Each step card: you start with / you leave with, every command you type beside what it does in plain words, the words you meet (chips linking to the glossary), why it matters, and done-when.
- **The oral defence:** the seven points of the definition of done, each tagged with the colour of its step, with what to show and a sentence to say; the fresh clone done live.
- **Key concepts**, tagged by step.
- **Every term, explained** (asked for 2026-10-16: "explanations for all the terms, so I understand what I am doing"): 77 terms, each in plain language and then what it is in the project, coloured by the step where it is met, filterable by step and searchable.
- **Commands by step** and **check yourself** questions (answers hidden until opened), coloured by step.
- **Day / Night**: cream, minimal day mode by default (asked for 2026-10-16), a warm night mode, the choice remembered on the device (`school-theme`).

Sources: "The Project, Step by Step" (37-slide version) and "Session 2 · Version Control & Git Fundamentals", kept in ADMIN · classes - ALBERTS · GIT.

## Rules

- Signed-in only; logged-out visitors go to `/login?next=/git`.
- One self-contained page, served by a route handler like `/coding`; no sync, no app shell.
