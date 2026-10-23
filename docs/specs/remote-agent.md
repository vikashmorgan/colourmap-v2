# Remote agent — build from the phone

**Status:** planned. Neither option is set up yet. Keep this spec until both are
live, then mark each option **Live** with the date.

Replaces PR #234 (a home-made `.github/workflows/agent.yml`). That workflow put
task text straight into a shell script (`${{ }}` interpolation, so `$(…)` in a
task would run), and needed `DATABASE_URL` and an API key as GitHub secrets so an
unattended agent could read the mission queue. The two options below give the
same "the loop closes without the laptop" result with maintained tools and no
database secret in GitHub.

## Why this exists

Martin captures ideas on the phone (Colour Brain notes, the voice dot). Today a
task only becomes code when he is back at the laptop. The goal: start a coding
task from the phone, get a PR back, check the preview, merge — same rules as
local work (branch → PR → CI green → merge).

## Option 1 — Claude Code cloud sessions (claude.ai/code, Claude app)

The agent runs in Anthropic's cloud on a fresh clone of the repo. You type or
dictate the task in the Claude app (Code tab) or at claude.ai/code; it pushes a
branch and you open the PR from the session.

Setup (one time, ~10 minutes):

1. Plan: Pro, Max, Team or Enterprise, signed in with claude.ai (not an API key).
2. Open claude.ai/code → connect GitHub → install the **Claude GitHub App** on
   `vikashmorgan/colourmap-v2` (private repo, so the app is required).
   Alternative from a terminal: `/web-setup` uses the local `gh` login.
3. Environment (the Default one is fine): network access **Trusted**, setup
   script `bun install`. It must exit 0 within ~5 minutes to be cached. Bun has
   known proxy issues in cloud sessions — test once; if `bun install` fails, note
   it here and use `npm install` as the setup script.
4. Do **not** put secrets in environment variables — anyone using the
   environment can read them. No `DATABASE_URL`, no Supabase service key. Cloud
   sessions build, lint, typecheck and test without them (tests mock the DB).
   If a secret is ever needed, use network secrets (the proxy injects them per
   host; the session never sees the value).
5. First test task: something small, e.g. "fix a typo in docs/product.md and
   open a PR". Check that the PR runs CI and the Vercel preview builds.

What carries over: repo `CLAUDE.md`/`AGENTS.md` rules and `.claude/settings.json`
(the deny list: no push to main, no force push, no recursive delete, no `.env`
access) apply in the cloud. Personal `~/.claude` settings and memory do not.

Moving a session to the laptop: `claude --teleport` (picker) or
`/teleport` in the CLI. Needs a clean git state, the branch pushed, and the same
claude.ai account. One-way. `claude --cloud "task"` starts a cloud session from
the terminal.

Colour Brain queue: read the mission/notes queue (`scripts/brain-read.ts
missions`) and paste the task into a session yourself. Nothing reads the
database automatically.

## Option 2 — Claude Code GitHub Action (`@claude` in GitHub)

Write `@claude …` in an issue comment or PR review comment (works from the
GitHub phone app); the official action runs on GitHub's runners and opens a PR
or pushes to the PR branch.

Setup:

1. Fastest: in the repo run `claude`, then `/install-github-app` (needs `gh auth
   login` and repo admin). It installs the app, stores the secret, and opens a
   PR adding `.github/workflows/claude.yml`. That PR touches a protected path:
   review it by hand before merging.
2. Secret: `ANTHROPIC_API_KEY` (Console key). `CLAUDE_CODE_OAUTH_TOKEN` from
   `claude setup-token` works on a subscription but is tied to whoever made it.
   No `DATABASE_URL`.
3. Workflow (from the official example):

   ```yaml
   name: Claude Code
   on:
     issue_comment:
       types: [created]
     pull_request_review_comment:
       types: [created]
   jobs:
     claude:
       if: contains(github.event.comment.body, '@claude')
       runs-on: ubuntu-latest
       permissions:
         contents: write
         pull-requests: write
         issues: write
         id-token: write
         actions: read
       steps:
         - uses: actions/checkout@v6
           with:
             fetch-depth: 1
         - uses: anthropics/claude-code-action@v1
           with:
             anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

   Pin `anthropics/claude-code-action` to a full commit SHA instead of `@v1`.

Security rules:

- Only users with write access can trigger it (the default). Never set
  `allowed_non_write_users` or `allowed_bots: '*'`.
- Issue and comment text is untrusted input. Keep the repo private; if it ever
  goes public, restrict with `include_comments_by_actor`.
- Never use `pull_request_target` with a checkout of the PR head.
- The action never merges. Merging stays with Martin (or a local session) after
  CI is green.

## Which to use when

- **Option 1** for most things: richer sessions, you watch and steer, no
  workflow or secret in the repo.
- **Option 2** for small fixes noticed on GitHub itself (a PR review comment,
  an issue): `@claude` right there.

## Acceptance

- [ ] Option 1: GitHub app installed, environment set up, a test task opened a
      PR that passed CI. Mark **Live** with date.
- [ ] Option 2: `claude.yml` merged (pinned SHA), `ANTHROPIC_API_KEY` set, an
      `@claude` comment produced a PR that passed CI. Mark **Live** with date.
- [ ] PR #234 closed, pointing here.

## Sources

- https://code.claude.com/docs/en/claude-code-on-the-web.md
- https://code.claude.com/docs/en/cloud-environments.md
- https://code.claude.com/docs/en/web-quickstart.md
- https://code.claude.com/docs/en/github-actions.md
- https://github.com/anthropics/claude-code-action/blob/main/docs/security.md
