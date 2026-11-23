# Collective Brain — Spec

> Each person's second brain, and the group as the sum of them.

## Vision

AI for collective human intelligence, starting small. A group of 2 to 13 people (a master's
cohort, a WhatsApp group of friends) each answer a few guided questions. The app maps how they
combine, and the group can ask Claude about any combination of people and intentions.

The app is a **guided second brain**. It first understands one person: how they work, what they
are good at, where they feel at their best, what they want to make. It helps them sort those
elements, the way a coach onboards a company into a second brain: guided questions first, then
the person asks their own questions, with Claude alongside. Groups are built on top of each
person's second brain, never the other way round.

## Route

`/collective`, public (no login wall). Asking Claude needs a signed-in account.

## v1 (this change)

### The profile (one person's second brain, first page)

Guided questions, one per screen, in a bottom sheet on phones and a centered card on desktop:

1. Name
2. Archetype: one of eight stars (Seer, Rebel, Maker, Architect, Keeper, Healer, Wanderer, Muse)
3. How do you work best? (free text)
4. What are you good at? (list)
5. What do people come to you for? (list)
6. Where do you feel most comfortable? (list)
7. When did you feel at your best? (list)
8. What do you want to make or do next? (list)

Lists are split on commas, semicolons or new lines, at most 6 items of 160 characters. Back keeps
answers. The last step is "Join the map". "Edit me" reopens it with your answers filled in.

**Storage: device-local experiment.** In v1 your profile is stored only in this browser's
localStorage (`collective:me`). It is not sent anywhere until you press Ask, and then only for
that one answer. This is an explicit experiment exception to the persistence guardrail; phase 2
moves profiles to Supabase under `auth.uid()` with a hydration path for the local profile.

### The map

- Each person is a star on a circle, coloured, with name and archetype.
- Intentions are grouped into themes (a space, an app, images, music, the table, people). A theme
  that two or more people want becomes a gold planet in the middle, with gold lines to them.
- Blue dashed arcs join a person whose skills or strengths serve another person's intention
  ("can help with").
- Tapping a star (or Enter / Space) toggles it. Chosen people stay bright; the rest fade.
- v1 shows an invented demo group (Vic, Martin, Lino, Shadow, Waji) plus you, if you joined.

### The panel

Collapsible: half the screen on phones, a 380 px column on desktop. It shows:

- nobody chosen: how the group combines (shared themes and who wants them)
- one person: their profile
- two or more: the combination and the links between them ("Both want", "Can help with")

### Ask Claude

A question field at the bottom of the panel. Empty means "What could we make together, and what
is the first small step?". It asks about the chosen people, or the whole group when nobody is
chosen. The answer streams in.

- `POST /api/collective/ask` with `{ members, question }`, signed-in only (401 shows "Sign in").
- 1 to 13 people, question up to 600 characters; profiles are sanitized server side.
- 503 with a plain message when `ANTHROPIC_API_KEY` is not set.
- Claude is told to be warm and concrete, use only what the profiles say, never rank people, and
  answer in under 220 words of plain text.

### Invite

"Invite" opens WhatsApp with a short invitation text. In v1 it does not yet carry a group link.

## Phase 2 (next)

- Private groups on Supabase, built on the existing Circles feature (join codes already exist).
- Invite link shared into the WhatsApp group that opens the group directly.
- Consent first: each person chooses what part of their profile the group sees, and can leave.
- Email-link sign-in for members who are not yet users.
- Installable PWA.

## Open questions

- **Tools and objects to play with.** People should have tools, objects and graphical elements to
  play with alongside Claude (wheels, bubbles, maps). Which ones come first is open.
- **Vibe coding by members.** Whether people using the app can shape or build parts of it
  themselves with Claude, or whether that stays with the builders, is an open discussion. v1
  builds nothing for it, and keeps the profile model and map separate so it stays possible.

## Out of scope for v1

- Real groups, accounts for profiles, sharing between devices.
- Ranking or scoring people.
