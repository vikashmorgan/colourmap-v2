---
name: spec
description: Shape a side-project product spec before implementation. Use when the user has a new app idea, wants to define or refine V1 scope, needs to write or update `docs/product.md`, or wants to spec out an individual feature in `docs/specs/`.
---

# Spec

Turn a vague or partial product idea into a buildable product spec for this repo.

## Use This Skill When

- The user wants to explore a new product idea before coding.
- The user asks to spec a project, scope V1, or write `docs/product.md`.
- The user wants to spec a specific feature or break down a V1 feature into a buildable spec.
- An existing `docs/product.md` is incomplete or stale.

## Context Gathering

Before asking questions:

1. Read `docs/product.md` if it exists.
2. Read relevant files in `docs/specs/` if they exist.
3. Read `AGENTS.md` and the relevant shared rules if the project shape is unclear.
4. Skim any existing app, landing page, or project brief files that already define user intent.

Do not ask questions that those files already answer.

## Interview Flow

Work in short rounds. Ask 1-3 high-signal questions at a time. Push back on fuzzy scope.

For a new product, cover product-level unknowns first:

- Who the product is for
- What pain or job-to-be-done matters enough to build
- What the user does today instead
- The core loop that creates repeat value
- V1 appetite and scope limits
- The smallest set of features that proves the idea
- Clear non-goals
- Product decisions that lock implementation shape
- What success would look like after launch

Then drill into individual features. Each non-trivial feature gets its own spec file with acceptance criteria, states, and edge cases.

## Scoping Rules

- Default to a small V1. Cap V1 at 5 features unless the user explicitly wants a larger scope.
- Prefer concrete user behavior over vague aspirations.
- Separate product decisions from implementation planning. This skill defines what to build, not the task breakdown.
- Call out contradictions directly. If the user wants a tiny V1 with platform-scale scope, force the tradeoff.

## Output

Two artifacts, two templates:

### docs/product.md

Write or update using `references/product-template.md`. This is the product-level spec: identity, audience, core loop, and a feature index. Features are one-liners here — detail lives in individual spec files.

For a new product spec:
- Fill the main sections in the template.
- List V1 features as an index with one-sentence summaries and links to spec files.
- Keep non-goals explicit enough to prevent scope creep.

For an existing product spec:
- Preserve valid sections.
- Refine unclear sections rather than rewriting everything.

### docs/specs/<feature-slug>.md

Write one per feature using `references/feature-spec-template.md`. This is the feature-level spec: behavior, states, edge cases, and acceptance criteria.

- Create a spec file for any feature that needs more detail than a one-liner.
- Trivial features can skip the spec file — note "no spec needed" in the product.md index.
- Create the `docs/specs/` directory if it doesn't exist.

## Quality Bar

The spec is done when:

- A builder can tell what belongs in V1 and what does not.
- Each feature with a spec file has concrete "Done when" statements.
- States and edge cases are called out for non-trivial features.
- The core loop is obvious.
- Key decisions are explicit enough to unblock implementation planning.

## Interaction Rules

- Ask concise questions.
- Push back on bloated V1s.
- Prefer hard choices over brainstorming lists.
- If a missing answer does not materially change the spec, pick a sensible default and state it.
