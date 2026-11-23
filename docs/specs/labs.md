# Labs — Prototypes Inside the App

> The prototypes we sketched as single pages (Mandala of Ideas, Reflection Bubbles, Frontier Bubbles, Tool City) now live in Colour Brain, so anyone with the link can open them on a phone and we can grow them into real features.

## Routes

- `/labs` — public index of the prototypes: title and one line each. Lives outside `app/(app)`, so no login wall.
- `/labs/<slug>` — the prototype full screen (an iframe of its static page). Unknown slugs are a 404.
- `public/labs/<slug>/index.html` — the prototype itself, one self-contained HTML page per lab.

| Slug | Prototype |
|---|---|
| `mandala` | Mandala of Ideas: three worlds, nine paths, twenty-seven steps, plus the wheel carousel, modes (Night, Window, Alien, Cream, Glass) and the lower page |
| `reflection-bubbles` | A small group as stars with thoughts in orbit; 2, 4, 5 or 600 people; Night and Crystal |
| `frontier-bubbles` | Living bubble map of collective intelligence news and people, with marks and Next moves |
| `tool-city` | 3D city of tools around the Mandala, linked by strings; add, connect and move blocks |

## Runtime

The pages were built for a runtime that offers `window.claude.use(name)`. `public/labs/claude-shim.js` loads first on every lab page and stands in for it:

- `db` keeps documents on this device (localStorage, one key per page and document path). `get`, `set`, `update` and `onSnapshot` work.
- Every other capability (`sample`, `dictation`, `mcp`, `user`) resolves to `null`, and each page falls back to its offline behaviour (for example, "the reading needs Claude" messages).

Lab data is a device-local experiment, as allowed by the persistence guardrail. Anything that becomes part of the signed-in product moves to Supabase in its own feature.

## Public copy

The repo is public. The lab pages carry demo content only: no personal to-dos, contacts, documents, poems, team names or private links. The Mandala ships with a demo life ("You") that a person replaces with their own; Tool City links between labs and the app instead of private pages.

## Acceptance

- `/labs` lists every lab and links to `/labs/<slug>`.
- Each `/labs/<slug>` renders its prototype full screen on a phone (390px wide) and on desktop with no overlapping controls added by the frame.
- Marks, blocks and wheel state survive a reload on the same device.
- No lab page loads `claude.ai` links or personal content.

## Later

- Wire `sample` to a signed-in Claude route so the readings work inside the app.
- Move the Mandala's state to Supabase once it becomes the onboarding for a personal second brain.
