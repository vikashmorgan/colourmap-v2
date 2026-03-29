---
name: review
description: Review code changes for bugs, regressions, security issues, performance risks, and missing tests. Use when the user asks for a review, PR review, diff review, or a second pass on a change before it ships.
---

# Review

Perform a real code review. Prioritize correctness and risk over style.

## Context Gathering

Before writing findings:

1. Inspect the current diff. Prefer `git diff --cached` when changes are staged; otherwise use the relevant unstaged diff.
2. Read the surrounding files and call sites, not just the changed hunk.
3. Run targeted non-mutating checks when they materially clarify risk.

## Review Priorities

Look for:

- Bugs and behavioral regressions
- Broken assumptions between layers or call sites
- Missing validation or error handling at boundaries
- Security issues or secret exposure
- Performance problems that are likely to matter
- Missing or weak tests for changed behavior

Ignore formatting unless it hides a real defect.

## Output Format

Findings first, ordered by severity.

For each finding:

- Start with the file and line reference.
- State the problem clearly.
- Explain the consequence.
- Suggest the smallest correction that fixes the root cause.

After findings:

- List open questions or assumptions only if they materially affect the review.
- If there are no findings, say that explicitly and mention any residual testing gaps.

## Rules

- Do not pad the review with compliments or summaries first.
- Do not list nits with the same weight as correctness issues.
- Do not speculate without evidence from the code.
- Treat missing tests as a finding only when behavior changed and coverage is meaningfully weak.
