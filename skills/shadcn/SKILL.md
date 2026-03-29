---
name: shadcn
description: Manage shadcn/ui components and blocks in this repo. Use when the user asks to add, search, update, preview, fix, or compose shadcn/ui components or blocks, or when the task mentions shadcn/ui, `components.json`, registries, presets, or building UI with repo-standard component rules.
---

# shadcn

Use this skill for the full shadcn/ui lifecycle: inspect project context, choose components, fetch docs, add or update via the CLI, and verify the generated code follows repo rules.

## Context Gathering

Before changing UI code:

1. Read `docs/product.md` if the component choice depends on product intent.
2. Read `rules/design.md` for the repo's visual defaults.
3. In the target app directory, inspect:
   - `package.json`
   - `components.json` if it exists
   - the current `components/ui/` directory
   - the global Tailwind CSS file
4. Pick the correct package runner from the app's package manager:
   - `bun` -> `bunx --bun shadcn@latest`
   - `pnpm` -> `pnpm dlx shadcn@latest`
   - `npm` -> `npx shadcn@latest`
   - `yarn` -> `yarn dlx shadcn@latest`
5. Run `<runner> info --json` in the target app directory before guessing imports or APIs.

`info --json` is the source of truth for aliases, framework, installed components, Tailwind version, base (`radix` vs `base`), icon library, and resolved paths.

## Workflow

1. Check whether the needed component already exists before adding anything.
2. Run `<runner> search` to find the right component or block.
3. Run `<runner> docs <component>` and read the linked docs before using or fixing a component API.
4. Use `<runner> view` to inspect registry items you have not installed yet.
5. Add new components with `<runner> add <component>`.
6. Update existing components with `<runner> add <component> --dry-run` and `<runner> add <component> --diff <file>` before overwriting anything.
7. Read every generated file after install or update. Fix alias mismatches, icon imports, and composition issues before moving on.

## Rules

- Use existing components first. Do not build a custom styled `div` if shadcn already has the primitive.
- Compose components instead of inventing new widgets. Settings page means Tabs + Card + form controls, not bespoke layout code.
- Prefer built-in variants and semantic tokens over custom colors or typography overrides.
- Never guess registry-specific APIs. Read the docs first.
- If the project does not use shadcn yet, confirm before running `init` because it changes project configuration.
- If a user asks for a community block or preset and the registry is not explicit, ask which registry to use instead of guessing.
- Never decode preset codes manually. Pass them directly to `init --preset`.

Read `references/critical-rules.md` for the non-negotiable composition, styling, form, and icon rules.

Read `references/component-selection.md` when the user knows the need but not the correct component.

## Updating Components Safely

When the user asks to refresh a component from upstream while keeping local changes:

1. Run `<runner> add <component> --dry-run`.
2. Inspect the affected files.
3. Run `<runner> add <component> --diff <file>` for files with local edits.
4. Merge upstream changes into the local file instead of overwriting blindly.
5. Only use `--overwrite` if the user explicitly wants a full reset.

## Community Registries

Community registries can add files with hardcoded imports that do not match the project's aliases. After adding a community item:

- compare imports against the aliases from `info --json`
- rewrite any hardcoded `@/components/ui/...` style imports when they do not match the project
- swap icon imports to the project's configured icon library if the registry item assumes a different default

## Output Expectations

After using shadcn:

- the right component is installed exactly once
- imports match the target project's aliases
- the code follows the critical rules in `references/critical-rules.md`
- no custom wrapper or styling exists where the shadcn primitive already solves the problem
