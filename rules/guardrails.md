# Guardrails

Canonical source of truth for the repo's active operating guardrails.

When a guardrail changes, update this file in the same change.

## Purpose

These guardrails exist to let collaborators focus on product creation while the repo constrains agents and change flow.

This file is the maintained inventory of the repo's real guardrails:

- documented policy
- local enforcement
- CI enforcement
- required external settings that the repo depends on but cannot verify itself

Historical rollout notes live elsewhere and are not the source of truth.

## Distribution

These guardrails propagate to other collaborators through the repo itself.

- `AGENTS.md` is the top-level runtime instruction source.
- `.codex/AGENTS.md` symlinks to `AGENTS.md`.
- `.claude/rules/*` symlink to `rules/*.md`.
- `.codex/rules/*` symlink to `rules/*.md`.
- `scripts/validate-agent-system.sh` verifies that this wiring stays intact in CI.

If someone pulls the repo, they pull the current guardrails with it.

## Canonical Rule Sources

- `AGENTS.md` defines agent-facing operating rules and document precedence.
- `rules/principles.md` defines engineering and product principles.
- `rules/workflow.md` defines planning, branching, verification, PR, and merge policy.
- `rules/testing.md` defines test, coverage, and anti-drift policy.
- `rules/architecture.md` defines import boundaries and service layering.
- `rules/stack.md` defines tooling, package manager, and coding standards.
- `rules/design.md` defines visual design defaults for UI work.

## Documented Policy

These are rules the repo declares agents and humans must follow.

### Change Flow

- Never push directly to `main`.
- Always work on a branch and merge through a pull request.
- Keep one logical change per branch and per PR.
- Use the documented branch prefixes: `feature/`, `fix/`, `guardrails/`, `chore/`.
- Protected-path changes are Lane B and require explicit human review.

### Planning And Scope

- Enter plan mode for non-trivial work.
- Re-plan if implementation goes sideways instead of pushing through.
- Do not batch unrelated features, refactors, and fixes together.

### Verification Before Commit

Before commit, complete the verification pipeline in `rules/workflow.md`:

1. `biome check`
2. build
3. tests
4. live browser verification via Chrome DevTools MCP for UI changes
5. diff review
6. secrets check

### UI Reality Checks

- UI work requires live browser verification in a real browser.
- Build success and test passes are not substitutes for visual verification.
- UI PRs must include routes checked, console status, network status, and screenshot evidence or an explicit `no visual change` note.

### Testing And Spec Discipline

- Every change gets tests.
- Coverage must not decrease where coverage policy applies.
- Bug fixes need regression tests when feasible.
- Do not update tests to match accidental behavior drift.
- If behavior changes, update the spec first, then tests, then implementation as needed.
- Use `no-spec-impact` only for internal, non-behavioral changes.
- No committed skipped or todo tests.

### Architecture Boundaries

- `components/**` must not import `lib/db/**` or `lib/services/**`.
- `lib/services/**` must not import `app/**` or `components/**`.
- `lib/db/**` must not import `app/**`, `components/**`, or `lib/services/**`.
- `app/api/**/route.ts` must not import components.

### Persistence And User Data

- New features that store meaningful user-created personal data must persist through Supabase under `auth.uid()`, unless the relevant spec explicitly marks the data as device-local UI preferences or a temporary experiment.
- Device-local storage is acceptable for UI preferences, visual settings, onboarding flags, draft-only experiments, and fast local caches of Supabase-backed data.
- If a feature starts as local-only and later becomes part of the authenticated product surface, the follow-up work must include Supabase schema/API wiring, RLS, and a migration or hydration path for existing local data when needed.

### Tooling And Repo Defaults

- Use Bun as the package manager.
- Use Biome for linting and formatting.
- Use Next.js App Router and TypeScript.
- Do not create a `src/` directory.

### Design Defaults

- Follow `rules/design.md` unless a deliberate exception is documented.
- Prefer shadcn/ui defaults before inventing new variants.

## Locally Enforced Guardrails

These are enforced before code leaves a machine, assuming hooks are installed.

### Git Hooks

From `lefthook.yml`:

- `pre-commit` runs `bunx @biomejs/biome check --staged --write` on staged JS, TS, JSX, TSX, JSON, and CSS files.
- `pre-push` runs `bun run lint`.
- `pre-push` runs `bun run typecheck`.
- `pre-push` runs `bun run test`.
- `pre-push` runs `bash scripts/check-lockfile-policy.sh`.

### Package Manager Policy

- `scripts/check-lockfile-policy.sh` rejects `package-lock.json`.
- Bun is the only supported package manager lockfile in this repo.

### Collaborator Safety Commands

- `bun run collab:setup` installs local hooks, verifies agent wiring, and reports Claude Code installation status.
- `bun run collab:doctor` reports whether the local machine is safely configured for agent-assisted work, including Claude Code and deny-rule presence.
- `docs/collaboration.md` is the plain-language operating guide for non-technical collaborators.

### Claude Code Settings

`.claude/settings.json` is a git-tracked shared settings file that enforces hard deny rules for Claude Code regardless of the `--dangerously-skip-permissions` flag.

Current deny rules:
- `Bash(git push* main*)` — no direct pushes to main
- `Bash(git push*--force*)` and `Bash(git push*-f *)` — no force pushes
- `Bash(rm -rf *)` and `Bash(rm -fr *)` — no recursive deletes
- `Read(.env*)` and `Write(.env*)` — no access to secrets files

Custom slash commands in `.claude/commands/` encode the full safe workflow:
- `/feature` — branch, spec, implement, verify, PR
- `/fix` — branch, diagnose, fix, regression test, PR
- `/verify` — full verification pipeline without committing
- `/review` — guardrail check on current changes

## CI-Enforced Guardrails

These are enforced in `.github/workflows/ci.yml`.

### Always-Run Checks

- `lint`
- `typecheck`
- `build`
- `test`
- `coverage-gate`
- `policy-agent-system`

### Pull Request Policy Checks

- `policy-deps`
- `policy-protected-paths`
- `policy-pr-scope`
- `policy-spec-drift`
- `policy-test-drift`
- `policy-architecture-boundaries`
- `policy-test-pairs`
- `browser-smoke`

### Protected Paths

Protected-path detection is enforced by `scripts/check-protected-paths.sh`.

Protected paths currently include:

- `.github/workflows/**`
- `AGENTS.md`
- `rules/**`
- `skills/**`
- `docs/product.md`
- `docs/specs/**`
- `rules/guardrails.md`
- `docs/guardrails-plan.md`
- `package.json`
- `bun.lock`
- `biome.json`
- `lefthook.yml`
- `vitest.config.ts`
- `next.config.ts`
- `drizzle/migrations/**`
- `lib/db/schema.ts`

These changes are Lane B and must not be auto-merged.

### PR Scope Policy

`scripts/check-pr-scope.sh` enforces:

- warning at more than 15 changed files
- stronger warning at more than 25 changed files
- warning at more than 500 changed lines
- stronger warning at more than 1000 changed lines
- PR scope warnings do not block merge on their own

### Spec And Test Drift Policy

- `scripts/check-spec-drift.sh` fails behavior-changing code changes unless the PR includes a `docs/specs/**` update or `no-spec-impact`.
- `scripts/check-test-drift.sh` fails test-file changes unless the PR includes a `docs/specs/**` update or `no-spec-impact`.

### Test Pairing Policy

`scripts/check-test-pairs.ts` enforces repo-policy-defined test pairing for:

- `app/api/**/route.ts`
- `lib/services/*.ts`

Exceptions are declared in `config/repo-policy.json`.

### Architecture Policy

`scripts/check-architecture-policy.ts` enforces import-boundary rules and route-to-service ownership declared in `config/repo-policy.json`.

### Coverage Policy

`coverage-gate` is enforced by `scripts/coverage-gate.mjs` using `config/coverage-gate.json` and `config/coverage-baseline.json`.

Current enforcement is not a flat repo-wide rule. It is:

- weighted minimum thresholds by code group
- protected-path regression checks against a stored baseline

Current threshold groups:

- `app/api`
- `lib/services`
- `auth`
- `policy-scripts`
- `ui-default`

Protected coverage paths currently include:

- `app/api/**/route.ts`
- `app/(auth)/**/route.ts`
- `lib/services/**`
- `lib/supabase/**`

### Agent-System Integrity

`scripts/validate-agent-system.sh` verifies:

- canonical files and directories exist
- every `rules/*.md` file is listed in `AGENTS.md`
- every `skills/*` directory is listed in `AGENTS.md`
- cross-file references resolve
- `.codex/AGENTS.md` symlinks correctly
- runtime rule and skill symlinks point to canonical repo files

### Browser Checks

- CI runs `browser-smoke` on pull requests.
- Repo policy still requires live browser verification via Chrome DevTools MCP before merge for UI work.
- CI browser smoke is a safety net, not a substitute for live local verification.

## Required External Guardrails

These matter, but the repo cannot fully verify them from versioned files alone.

- GitHub branch protection must block direct pushes to `main`.
- Required status checks must be configured in GitHub.
- Auto-merge must stay disabled for Lane B changes.
- Protected branch force-push restrictions must stay enabled.
- Administrator bypass should not weaken branch protection.

If these settings drift, documented policy may no longer match actual merge behavior.

## Maintenance Rule

Any change that adds, removes, or materially alters a repo guardrail must update this file and any more-specific rule file it depends on in the same PR.
