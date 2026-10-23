# AI Reflection Menu

> The long-term AI surface for turning captured behavior into saved, evidence-based reflections.

## Context

Colourmap already has short AI surfaces: global AI Presence, check-in insight, journey reflection, day-map insight, and notebook generation. These are useful, but they are scattered. The product needs one obvious home for long-term AI value without making AI feel like a second dashboard.

The AI menu sits in primary navigation between `Focus` and `Notes`. This placement is deliberate: Focus captures the day, AI interprets the pattern, Notes stores the user's archive.

## Behavior

- The primary navigation includes `AI` between `Focus` and `Notes`.
- `/ai` is a calm menu with three entries:
  - `Talk now`: summon the quick assistant for the current fragment.
  - `Review patterns`: longer reflections across time and repeated tensions.
  - `Saved reflections`: the memory archive for reflections the user keeps.
- The surface is mirror-first. It answers "what is this telling you?" before "what should you do?"
- Reflections must show or preserve the evidence scope used to generate them.
- Users can summon AI by scope:
  - `Today`: latest check-in, challenge/flow, current objective, daily objectives, day map.
  - `Week`: recent check-ins, repeated challenges, completed/uncompleted objectives, category updates.
  - `Category`: a named life category plus related entries, missions, notes, and trend.
  - `All`: broader long-term synthesis across check-ins, categories, missions, day map, life scan, and notebook.
- The AI should not silently read everything for every request. Scope controls are part of user trust and cost control.
- Saved reflections become part of the user's durable memory and should be visible from the AI menu and optionally mirrored into Notebook.
- The navigation dot menu includes `AI Assistant`, which opens the same global AI Presence panel. This makes the assistant summonable from the dot menu without duplicating AI surfaces.
- Keep the page visually light. Avoid listing every data source, quota rule, or future capability on the page itself; those belong in implementation docs and pricing flows.
- Preserve the raised paper-block visual treatment of the AI hero, but keep its copy glanceable. The
  hero should read like a label and small signal, not an explanatory paragraph.

## Agent Interaction Direction

The assistant may evolve from reflection into an app agent, but only through explicit, confirmable tools.

Allowed future tool classes:

- `create_mission`: propose a mission from a reflection and ask for confirmation before saving it.
- `update_mission`: rewrite objective/challenge/next step only after the user accepts the proposed change.
- `save_reflection`: save an AI response into the reflection archive.
- `link_reflection`: attach a reflection to a category, mission, notebook entry, or check-in.
- `summarize_surface`: read the current app surface and explain what it sees without mutating data.

Guardrails:

- No silent data mutation from chat.
- Every write action needs a visible confirmation.
- Every generated action should show the evidence it used.
- The assistant should act as a clerk and mirror, not an authority.

## Freemium Model

- Free users can use small AI reflections with daily limits.
- Free users can save a small number of reflections.
- Paid users get deeper synthesis:
  - weekly and monthly pattern reflections
  - category-level long-term reading
  - larger context windows
  - saved reflection archive
  - future generated maps and exportable reports
- The backend must enforce quotas. UI hiding is not enough.
- Quotas should count AI requests and approximate token cost by user, route, model, and scope.
- Creator/admin accounts may have higher local testing limits.

## Data Model Direction

Future persistence should use a dedicated table rather than only localStorage:

```ts
interface AiReflection {
  id: string;
  userId: string;
  sourceType: 'check_in' | 'overview' | 'category' | 'mission' | 'notebook' | 'day' | 'all';
  sourceId: string | null;
  scope: 'today' | 'week' | 'category' | 'all';
  title: string;
  content: string;
  evidence: unknown;
  tags: string[];
  pinned: boolean;
  dismissed: boolean;
  createdAt: string;
}
```

Optional follow-up table for chat-like threads:

```ts
interface AiReflectionMessage {
  id: string;
  reflectionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
```

## States And Edge Cases

- No user data: show a quiet empty state and offer a short manual reflection prompt.
- Free quota exhausted: explain that deeper AI is part of the paid layer without blocking access to the base app.
- AI provider unavailable: keep the page usable as an archive and show a retry state for generation.
- Large context request: summarize or sample data before sending to the model; never send unbounded notebook history.
- Sensitive content: avoid diagnosis, certainty, or therapy claims.
- Evidence unavailable: the reflection should not pretend to know more than it read.

## Done When

- `AI` appears in primary navigation between `Focus` and `Notes`.
- The dot menu can summon the global AI assistant.
- `/ai` explains the reflection scopes and freemium boundary.
- `/ai` uses theme-relative raised AI surfaces: Paper stays clear and slightly lifted, while Golden, Night, and Comic modes use the same relationship in their own color family instead of reusing paper beige.
- Product docs identify the AI menu as the long-term AI home.
- Future implementation has a clear path for quotas, saved reflections, and backend persistence.

## Why learn the real tools (2026-10-09)

The AI tab carries a card, **Why learn the real tools →**, opening `/ai/why-learn`: a set of notes in the owner's words on challenging AI rather than trusting it. AI made mediocrity cheaper and made us lazy; we need to go deeper into the problem and challenge the AI. AI works on assumptions and they add up: when a business problem appears, you find you were never clear on them and kept adding subconscious assumptions you no longer control. The art is to check and challenge the code, so we learn the real tools: coding, SQL and the rest (the page links to the Coding course). The notes live in `lib/ai/why-learn.ts`; new notes are added at the end.
