# Testing

## Goal

100% test coverage. Every line, branch, and edge case.

## Rules

- **Every change gets tests.** New code needs new tests. Changed code needs updated tests. Deleted code means deleted tests. No exceptions.
- **Coverage must not decrease.** If a change lowers coverage, it is not ready to commit.
- **Test the behavior, not the implementation.** Tests should break when behavior changes, not when internals are refactored.
- **One test file per source file.** Co-locate: `lib/foo.ts` → `lib/foo.test.ts`, `app/api/bar/route.ts` → `app/api/bar/route.test.ts`.
- **No skipped tests.** No `test.skip`, no `test.todo` in committed code. If a test can't pass, fix the code or remove the test.

## Coverage Enforcement

Run `bun run test --coverage` before committing. Review uncovered lines and add tests for them. Treat uncovered code the same as a failing test — a blocker, not a suggestion.

## What to Test

- **Utils/libs**: Unit tests for every exported function. Cover happy path, edge cases, and error cases.
- **API routes**: Integration tests for each endpoint. Cover success, validation errors, and failure modes.
- **Components**: Test user-visible behavior (rendering, interactions, state changes). No snapshot tests.
- **Hooks**: Test with `renderHook`. Cover initial state, state transitions, and cleanup.

## What Not to Test

- Third-party library internals.
- Types (the compiler already tests those).
- Pure configuration files.
