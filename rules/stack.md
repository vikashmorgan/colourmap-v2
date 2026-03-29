# Tech Stack

## Core

- **Framework**: Next.js (App Router) + TypeScript
- **AI**: Vercel AI SDK (`ai`) for LLM integration — streaming, multi-model, App Router native
- **Styling**: Tailwind CSS + shadcn/ui
- **Linting/Formatting**: Biome
- **Pre-commit**: lefthook
- **Testing**: Playwright for e2e, Vitest for unit/integration
- **Package Manager**: bun

## Tooling Configs

### biome.json (standard)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.7/schema.json",
  "files": {
    "includes": ["**/*.{js,ts,jsx,tsx,json,css}", "!**/.next"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" }
  },
  "css": { "parser": { "cssModules": true, "tailwindDirectives": true } },
  "linter": { "rules": { "recommended": true } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

### lefthook.yml (standard)

```yaml
pre-commit:
  commands:
    check:
      glob: "*.{js,ts,jsx,tsx,json,css}"
      run: bunx @biomejs/biome check --staged --write
      stage_fixed: true
```

### Bootstrap Rule

When scaffolding: add the standard `biome.json` and `lefthook.yml`, then run `bunx lefthook install`. Commit tooling setup separately before feature work.

## Naming Conventions

- **Files**: `kebab-case` for non-component files. Next.js conventions for routes (`page.tsx`, `layout.tsx`, `route.ts`).
- **Components**: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- **Hooks**: `use*.ts` (e.g., `useAuth.ts`)
- **Utils/libs**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/interfaces**: `PascalCase`, no `I` prefix

## Coding Standards

- **Error handling**: Fail fast with clear messages. Handle failures gracefully at boundaries. No silent catches.
- **Files**: Avoid creating new files unless there's a clear structural reason.
- **No commented-out code.**
- **Directory layout**: No `src/` directory. Top-level `app/` and `lib/` directly.
