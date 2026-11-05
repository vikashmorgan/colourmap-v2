# Idea Map

A block at the top of `/dreams-in-action` that turns reflection into a visual map leading to a mission. Plan only: nothing here is built yet.

Asked for 2026-11-05: "How can we vibe code a way of deconstructing ideas into components in order to build a reflection towards a mission, like a visual idea map. Map these ideas into bubbles or another form. Plan and develop it in notes as a block that is easy to see, called IDEA MAP."

## The form

Bubbles placed in five columns, read from left to right. Position carries the meaning, so a map cannot become a pretty cloud with no direction.

| Column | Question |
|---|---|
| Tension | What feels wrong? |
| Compass | What do I want instead? |
| Mission | What am I here to do? One bubble. |
| Forms | What could it become? |
| Proof | What is the smallest real test? |

Lines between bubbles have one of three meanings: *leads to*, *tests* and *contradicts*. A *contradicts* line is drawn dashed in a warning colour, because open contradictions are the useful part of a map.

## A bubble

- A short title on the map. Tapping it opens the components: *the idea*, *why I believe it*, *what could be wrong*, *next small step*.
- **Felt or reasoned:** each bubble is marked as one or the other, so the balance of intuition and logic can be seen across a map.
- **Where it comes from** (optional): a word the user picks for the state behind the idea, such as fear, anger, courage or love, inspired by David Hawkins's scale. It is a personal compass and never a score the app calculates.

Colours stay sober: ochre for felt, blue for reasoned. On a phone the columns stack as a list, with the same links written out.

## Breaking a reflection down

1. **First version:** the user pastes a reflection into the chat with Claude Code, which proposes bubbles and lines, and the user corrects them.
2. **Later:** a *Break this down* button on the page does the same. It only ever proposes: nothing joins the map until the user accepts it, and the original text is kept beside it.

## Storage

No migration in the first version: a map is saved as notes under keys starting `dreams|map`, through `/api/coding/notes`. Each note holds at most 2,000 characters, so each bubble is its own note. If links outgrow this, propose a table then.

## First map, to confirm with the user before saving

- **Tension:** Albert School is more of the same system; it leads to working for companies that follow the usual code; the world seems disconnected; logic and intuition are kept apart.
- **Compass:** greater harmony (Hawkins's higher scale); mix the people, separate the time.
- **Mission** (confirmed by the user 2026-11-05): a place where people come to imagine the future and actually build it. "About manifesting paradise on earth, creating harmony, beauty, and spaces of healing and elevation."
- **Forms:** a nomadic Embassy of Dreams with no fixed place; a vibecoding sprint or retreat; an online community with in-person peaks; later a hostel, studios and residencies.
- **Proof:** a 5 to 7 day retreat for 12 to 20 people, ending in a demo night; do people pay and come back?
- **Contradicts:** criticising the usual system, and pitching a startup studio whose goal is Silicon Valley scale.

The Liquid Factory details come from a pasted AI conversation and have not been checked.

## Build order

1. Read-only map from saved bubbles, with the phone list.
2. Add, edit and delete bubbles, and link them.
3. *Break this down*, as a proposal the user accepts.
