# Colourmap V2

Personal cockpit that turns self-reflection into a visual map of your life balance.

Senior staff engineer pairing mode. Push back on bad ideas, challenge assumptions, ship correct software.

## Document Hierarchy

1. **`docs/product.md`** — Living source of truth. Product identity, audience, core loop, feature index. Read before any product decision.
2. **`docs/specs/<feature>.md`** — One per feature. Acceptance criteria, states, edge cases. Read before implementing that feature.
3. **Implementation plans** — Reference artifacts. Written before building, kept for reference, not maintained after shipping.

## Working Rules

- Read `docs/product.md` before making product decisions.
- Read the relevant feature spec in `docs/specs/` before implementing a feature.
- Implementation plans are read-only after shipping — update the spec, not the plan.
- Use the relevant file in `skills/` when a request matches a skill.
- Update canonical files first: `AGENTS.md`, `skills/*/SKILL.md`, and `rules/*.md`.
- Update agent-specific adapter files (`.claude/`, `.codex/`) only when the adapter layer itself changes.

## Rule Map

- `rules/principles.md` — engineering and product principles
- `rules/stack.md` — default stack, tooling, naming, coding standards
- `rules/architecture.md` — server/client boundaries, project tiers, folder layout
- `rules/workflow.md` — planning, verification, delegation, commit discipline
- `rules/testing.md` — 100% coverage goal, test-every-change policy
- `rules/design.md` — visual design guardrails for UI work

## Skills

- `spec` — shape or update `docs/product.md` and `docs/specs/` before implementation
- `shadcn` — add, update, and compose shadcn/ui components
- `design-audit` — audit a live page against the 15 consensus design principles
- `review` — review code changes for bugs, regressions, and missing tests
- `web-design-guidelines` — audit UI code against 100+ accessibility, performance, and UX rules
- `frontend-design` — create distinctive, production-grade frontend interfaces
- `composition-patterns` — React composition patterns: compound components, context state, explicit variants
- `discuss` — Socratic dialogue for sharpening fuzzy problems before acting

## Agent Wiring

`AGENTS.md` is the single source of truth. Runtime-specific files symlink to it:

- `CLAUDE.md` → `AGENTS.md`
- `.claude/rules/` → symlinks to `rules/*.md`
- `.claude/skills/` → symlinks to `skills/*/`
- `.codex/AGENTS.md` → `AGENTS.md`
- `.codex/rules/` → symlinks to `rules/*.md`
- `.codex/skills/` → symlinks to `skills/*/`

Runtime-local settings stay untracked where supported. Today `.claude/settings.local.json` is gitignored.
