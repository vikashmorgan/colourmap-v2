import fs from 'node:fs';
const f = 'docs/specs/integrated-system.md';
let s = fs.readFileSync(f, 'utf8');

const anchor = '## Open questions';
if (!s.includes(anchor)) throw new Error('anchor miss');

const added = `## Where the asking happens

This inverts the line at the top of this spec, and the inversion is right.

"The app is the record, the terminal is the thinking" put every *question* in the
terminal. But the questions arrive on a phone, in a queue, across several
projects at once — and a terminal you have to be sitting at is a bad place to
collect them. So:

> **The app is the queue and the map. The terminal is the worker.**

You write missions in Colour Brain. They land on the tree under the branch they
belong to. The terminal reads the queue, does the work, and writes status back.
Nothing about the reasoning changes — the notebook still nobody's to edit but
yours — what changes is that the *asking* no longer requires a keyboard in a
repo.

**Execution stays in the terminal, and that is not a staging post.** An agent
doing real work needs the filesystem, the repos, the test suites and the git
history. A phone has none of those and will not grow them. The hybrid is the
end state, not a step toward running everything in the app.

### What the tree gains

Today the figure counts routes: a picture of structure, true but static. With
missions on it, it shows **state** — which is what makes it worth keeping
permanently on screen rather than being a diagram you look at once.

| Shown | What it actually means |
| --- | --- |
| **Moving** | Something happened recently — a commit, a status write-back, a file changed |
| **Stalled** | Open, and nothing has touched it in a while |
| **Urgent** | Carries a date, and the date is close |
| **Waiting** | Blocked on somebody who is not you |

### The rule that keeps this honest

**"Actively growing" has to be a fact or it is decoration.** Movement means a
real event was recorded against the mission. It must never be inferred from
enthusiasm, from how recently you looked at it, or from anything the app can
generate about itself.

And it must not become a scoreboard. Urgency from a date is a fact. Movement is
a fact. *"Art is your most productive branch"* is a ranking, and this product
does not rank — the same line \`lib/branches.ts\` holds when it forbids counts in
a branch blurb.

---

## Shaping your own tree

Right now the structure is a constant in \`lib/branches.ts\`. The next step is
editing it from the app: renaming branches, adding and removing groupings,
changing what sits where.

That appears to collide with the governing rule, **a branch is computed, never
stored**. It does not, once the layers are separated:

- **The structure is stored.** Branches, groupings, names, order — this is *your*
  tree, and it is data.
- **Placement is still computed.** A thing is never filed into a branch by hand.
  It matches a rule in the structure, and changing the structure re-sorts
  everything with no migration.

So the rule narrows rather than breaks: an item's branch is computed *from a
stored structure*. What it was always protecting — no per-item filing, no
migration when you change your mind — survives intact.

**You first, then everyone else.** The tree gets built for one life before it is
built for many, which is the right order: a structure derived from one real week
beats a configurable one derived from nobody's.

The thing to keep clean meanwhile is the **boundary**, not the generality. As
long as the app reads the tree only through \`lib/to-mandala.ts\`, a second
person's tree is another row behind that function rather than a rewrite of
everything above it. Generality is cheap later if the seam is honest now; it is
very expensive later if it is not.

---

`;

s = s.replace(anchor, added + anchor);

const reflectionAnchor = '### 2026-09-20 — written';
const newReflection = `### 2026-09-21 — the asking moved into the app

This spec opened by putting the record in the app and the thinking in the
terminal. That split was too clean. It quietly assumed every *question* starts
at a keyboard in a repo, and in practice they start on a phone, in a queue,
across several projects at once.

So the app takes the queue and the map, the terminal keeps execution, and the
tree stops being a picture of structure and starts showing state. The part of
the original that survives untouched is the important one: reading is free,
writing lands in proposals, and nobody edits the notebook.

The second change is larger and was nearly refused on principle. "A branch is
computed, never stored" reads like it forbids an editable tree. It does not —
it forbids *per-item filing*. Storing the structure while computing placement
from it keeps everything that rule was protecting, and the refusal would have
cost the product the thing that makes the tree someone's own.

`;

if (!s.includes(reflectionAnchor)) throw new Error('reflection anchor miss');
s = s.replace(reflectionAnchor, newReflection + reflectionAnchor);

fs.writeFileSync(f, s);
console.log('spec updated');
