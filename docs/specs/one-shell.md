# One Shell

**Status:** spec only. Nothing here is built yet. Written 2026-11-21.

Prototype to feel it: a private artifact. The prototype is the
reference for layout and motion; this spec is the reference for behaviour.

Asked for 2026-11-21: "a fluid experience within a structured boundary. The balance of fluidity and
organization, aesthetics and usefulness." And: "it's still confusing. It's still different designs
for different parts of it. That coherence, that simplicity, the feeling of oneness and flow is what
we're looking for."

---

## The problem, measured

An audit of `app/` and `components/` on 2026-11-21:

| What | Count |
| --- | --- |
| Distinct hex colours written inline | 1,221 |
| Inline `style={{…}}` blocks | 5,903 |
| Font sizes in use (the scale in `rules/design.md` has seven) | 30+ |
| Fonts loaded in `app/layout.tsx`, two of them sans-serif | 7 |
| Themes in `ThemeSwitcher` | 8 |
| Separate maps of the same life | 4 |

The four maps are the root cause. `lib/grid.ts` sorts the app into seven hubs, `NavLinks` into seven
top links, `lib/branches.ts` into three branches for `BrainDock`, and the owner's Mandala of Ideas
into three worlds of three paths. Each screen picked one, and each screen styled itself. The result
reads as many apps sharing a login.

**One shell, one map, one way to talk.** Everything below follows from that sentence.

---

## The shell

Three bars and a stage. Present on every authenticated surface, never redrawn per page.

| Part | Holds | Rules |
| --- | --- | --- |
| **Top bar** | Menu button · where you are (crumbs) · *Colour Brain* · mood dot · night/paper | 52px. Crumbs hide on phone. Nothing else is added here. |
| **Left rail** | Small tabs: Map, Ideas, Today, Places, Settings | Closed by default. Opening it slides the stage right; it never covers the map on desktop. |
| **Stage** | The map, or the screen you opened from it | The only part that changes between surfaces. |
| **Bottom bar** | One "Here" line · the talk input · mic | Always reachable with a thumb. |

The shell replaces `GridMenu`, `NavLinks`, `ConditionalTopNav`, `BrainDock`, `ViewModeSwitcher`
and the per-page sub-navs in `AppShell` (Music, Social). There is one way to get anywhere: the map,
or the rail's Places tab, which lists the same places by path.

## The map

One structure, computed and never stored (the rule from `docs/specs/colour-brain.md` stands).

- **Centre:** you. Check-in and mood.
- **Ring 1, worlds:** Art, Admin, Energy.
- **Ring 2, paths:** three per world, nine in all, inside a gold octagon.
- **Ring 3, steps:** the next things under each path.
- **Ring 4, ideas:** bubbles hung from the step they belong to.

Rings open one at a time ("grow") and fold back. Zoom and drag work on every format; pinch on phone.
Selecting anything makes the rest **recede, never disappear**, and puts its crumbs in the top bar and
its next step in the Here line.

Every existing route lives under exactly one path (Places). A path with no routes shows that it is
empty, because the empty parts of the map are the next things to build.

The personal content of the map (steps, ideas, to-dos) belongs to the signed-in account and is never
written in this repo, which is public.

## Formats

The same map drawn two ways. Swipe left and right on the stage at zoom 1, or use the arrows.

| Format | Shape |
| --- | --- |
| **Wheel** | Concentric rings around the centre. The default. |
| **Three trees** | You as the root, one tree per world, paths as branches, steps as leaves. |

Selection, rings and colours carry across formats. A format is a view, never a separate data set.

**Trees drill down in one motion.** Every part is drawn as the same tree shape. Tapping a tree makes
it grow up into the centre while its siblings keep their shape, shrink and slide down. Tapping one of
its branches does the same one level higher, down to a step and its ideas. The level above sits at
the root as "up"; tapping it, or the trunk in focus, moves back down the same way.

Bubbles and Bloom were tried in the prototype and cut on 2026-11-22. 3D formats come later and
follow the same rule.

## Talking from inside the app

The bottom bar is the one place to talk to Claude. It sends the message with the map as context
(where you are, what is selected, what is on top) and replies in a sheet that slides up over the
stage and folds away.

- "idea: …" drops a new idea bubble under the selected step and opens ring 4.
- The mic uses the existing speech-to-text.
- Claude proposes; the owner accepts. Writes go through the proposals table described in
  `docs/specs/integrated-system.md`, never straight into the map.

This replaces the separate `/ai` page as the way in. `GlobalAIPresence` is not mounted anywhere and
is removed.

## The design system

One token set in `app/globals.css`, consumed through Tailwind and CSS variables only. No hex values
in components.

**Colour.** Two themes, Night (default) and Paper. Night: sepia ground, cream ink, one gold accent.
Gold belongs to three things only: the centre, the current selection, and Claude. Each world has one
hue, used for its own marks and nothing else.

| Token | Night | Paper |
| --- | --- | --- |
| `--ground` | `#120a06` | `#f3e9d6` |
| `--surface` | `#1b110a` | `#ece0c8` |
| `--text` | `#f2e6cf` | `#3a2416` |
| `--gold` | `#d6b26e` | `#8c6420` |
| `--art` | `#e3895c` | `#b8592e` |
| `--admin` | `#73a3dc` | `#3d6fa8` |
| `--energy` | `#7cc794` | `#3f8a57` |

**Type.** Three voices from `docs/specs/visual-identity.md`, nothing else: Playfair Display for
names (worlds, the title), Courier Prime for labels and controls, Caveat for the owner's own words
(ideas, mood, what was said to Claude). Geist, Outfit, Righteous and Kalam are no longer loaded.
Scale 12 / 14 / 16 / 20 / 24 / 32.

**Space.** 4px grid. Sections ≥ 32px apart.

---

## Build order

Each step is its own PR and leaves the app working.

1. **This spec.**
2. **Tokens.** The token set, two themes, the extra fonts removed.
3. **The shell.** Top bar, rail and bottom bar replace the current navigation pieces.
4. **One map.** `lib/branches.ts` becomes three worlds of three paths; every route gets one path.
   The Wheel on the home route, with rings.
5. **Formats.** Three trees with drill-down focus, and swiping between Wheel and Trees.
6. **Talk.** The bottom bar wired to Claude with the map as context, and idea bubbles saved to the
   account.
7. **Screens move in.** One screen per PR, restyled to the tokens, inline colours removed.

## Not decided

- The final names of the nine paths. The prototype uses the owner's Mandala of Ideas.
- Whether the Studio extraction in `docs/specs/colour-brain.md` happens before or after step 7.
- Which model answers in the talk bar, and its cost per day.
