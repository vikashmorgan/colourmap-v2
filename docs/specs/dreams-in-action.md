# Dreams in Action

A page in School for the user's own writing, at `/dreams-in-action`. Asked for 2026-11-05. The repo is public, so the page's text and this spec stay neutral (asked for 2026-11-06), and what the user writes stays in their account.

Renamed the same day: "just call it Dreams in Action, not Criticism."

The words are the user's. Nothing on this page writes, rewrites or suggests ideas for them.

## The page

- **Write box at the top.** Type an idea, choose its block and save. It starts on *Not sorted yet*, so writing comes first and placing later.
- **Blocks.** *New ways of learning*, *The future of education*, *Places to build*, *Logic and intuition*, *The wider world*, each with a short neutral line. Ideas saved under a block's earlier name keep that name and still show, since a block with ideas belongs to the account. Blue and lavender in turn, like Statistics. A block opens and closes, and that is remembered on the device (`dreams-closed`).
- **Not sorted yet** shows above the others only while it holds an idea.
- **New blocks.** Name one under the list. It stays on this device until it holds an idea, then belongs to the account (`dreams-blocks`). An empty one can be removed.
- **An idea** shows its text with its line breaks kept, and its date. *Edit*, *Move* to another block, and *Delete*, which asks once more first.
- **+ Write here** on a block selects it in the write box without losing what is typed.

## Written from elsewhere

The *Reflections* bubble on Statistics writes here while reading ([spec](statistics-class.md)). Those notes are ordinary ideas, and can be edited, moved and deleted the same way. Their last line says where they were written.

## Saving

Ideas are notes in `/api/coding/notes`, under keys `dreams|<block name>`, with no new table or migration. Python's page leaves them out of its own notes. A note holds at most 2,000 characters: the page counts down near the limit and asks to split a longer idea into two. Editing a note keeps its place; a move creates the note in the new block and then removes the old one, so a failure never loses the idea.

What is typed in the write box is kept on the device (`dreams-draft`) until it is saved. A failed save leaves the words in the box and says so. If ideas cannot be loaded, the page says so instead of showing empty blocks as if nothing were written.

## Not yet

Exporting the writing, and turning blocks into an essay.
