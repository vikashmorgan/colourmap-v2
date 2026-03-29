# Workflow

## Plan Before Build

Enter plan mode for any non-trivial task (3+ steps or architectural decisions). Get confirmation before implementing.

If something goes sideways mid-implementation: STOP. Don't push through. Re-plan from current state.

For simple, obvious fixes: just do them. Don't over-process.

## Delegation And Parallelism

Use delegated workers, subagents, or focused parallel investigation only when the runtime supports it and the problem benefits from it. Keep ownership clear: one task per worker and one clear deliverable per parallel track. If the runtime does not support delegation, do the work locally and keep the plan simple.

## Autonomous Bug Fixing

When given a bug: just fix it. Read logs, errors, failing tests, then resolve. Zero context switching from the user.

## Verification Pipeline

Never commit without completing ALL steps. Stop on first failure.

1. `biome check` — zero diagnostics
2. Build succeeds
3. All tests pass (unit, integration, e2e). New behavior must have tests.
4. **Live browser verification via Chrome DevTools MCP** — mandatory for any UI work. Start the dev server, navigate to the affected pages, take screenshots, and confirm the behavior visually. This is not optional and cannot be skipped or substituted with build-only checks.
5. Review your diff as if reviewing someone else's PR
6. Check for secrets/credentials — if found, remove and alert the user
7. Commit

If a test fails, fix it. Do not skip, disable, or weaken tests.

## If Chrome DevTools MCP Is Unavailable

Do not commit UI work without live verification. If Chrome DevTools MCP is not available, ask the user to verify the behavior in a browser before committing. Never substitute build success or test passes for visual confirmation of UI changes.

## Push Discipline

Before pushing, run the full build locally (`bun run build`) and confirm it passes. CI failures from untested pushes waste time.

## Commit Discipline

- Write commit messages that describe what changed AND why
- One logical change per commit
- If the project has a custom commit alias, use it
