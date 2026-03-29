---
name: design-review
description: Review UI and UX work against product intent and the repo's design guardrails. Use when the user asks to review a UI, audit design, check accessibility, inspect visual hierarchy, or validate a screen or flow before shipping.
---

# Design Review

Review interface work for real design and UX problems, not taste.

## Context Gathering

Before reviewing:

1. Read `rules/design.md`.
2. Read `docs/product.md` if it exists.
3. Read the relevant page, component, and styling files.
4. If the runtime provides browser automation, inspect the live page on desktop and mobile. If not, review the implementation statically and say what you could not verify live.

## Review Lens

Focus on the issues that materially affect comprehension, usability, or trust:

- Weak visual hierarchy
- Ambiguous or competing primary actions
- Inconsistent spacing, type, or component behavior
- Poor mobile layout or awkward responsive behavior
- Accessibility problems: contrast, focus states, semantics, keyboard flow
- Missing loading, empty, or error states when they matter
- Interactions that fight the product intent in `docs/product.md`

Use the shared design rules as the baseline, but preserve an existing project design system when it is intentional and coherent.

## Output Format

Output findings only.

- Order findings by severity.
- Reference the exact file and line when the issue is in code.
- If the issue is only visible in a live surface, name the page or component clearly.
- Explain why it matters in user terms, not just visual taste.

If there are no material findings, say so explicitly and mention any residual verification gap such as "live mobile view not inspected."

## Rules

- Do not turn this into a rewrite wishlist.
- Do not suggest generic polish without a concrete problem.
- Prefer a few high-signal findings over a long checklist.
- Treat accessibility and broken hierarchy as higher severity than stylistic disagreement.
