# Dreams in Action

A page in School for the user's own writing, at `/dreams-in-action`. Asked for 2026-11-05, first under another name: "add another segment in School, where I can write my ideas. We will break them into blocks. The idea will be to think how we can go beyond this matrix of learning stuff, in order to go into the future of education, and ideally apply this through the Embassy of Dreams. It will be a reflection on logic vs intuition, and how our current world, from my perspective, seems profoundly disconnected."

Renamed the same day: "just call it Dreams in Action, not Criticism."

The words are the user's. Nothing on this page writes, rewrites or suggests ideas for them.

## The page

- **Write box at the top.** Type an idea, choose its block and save. It starts on *Not sorted yet*, so writing comes first and placing later.
- **Blocks.** *Beyond the matrix*, *The future of education*, *The Embassy of Dreams*, *Logic and intuition*, *A disconnected world*, each with a line from the user's request. Blue and lavender in turn, like Statistics. A block opens and closes, and that is remembered on the device (`dreams-closed`).
- **Not sorted yet** shows above the others only while it holds an idea.
- **New blocks.** Name one under the list. It stays on this device until it holds an idea, then belongs to the account (`dreams-blocks`). An empty one can be removed.
- **An idea** shows its text with its line breaks kept, and its date. *Edit*, *Move* to another block, and *Delete*, which asks once more first.
- **+ Write here** on a block selects it in the write box without losing what is typed.

## Saving

Ideas are notes in `/api/coding/notes`, under keys `dreams|<block name>`, with no new table or migration. Python's page leaves them out of its own notes. A note holds at most 2,000 characters: the page counts down near the limit and asks to split a longer idea into two. Editing a note keeps its place; a move creates the note in the new block and then removes the old one, so a failure never loses the idea.

What is typed in the write box is kept on the device (`dreams-draft`) until it is saved. A failed save leaves the words in the box and says so. If ideas cannot be loaded, the page says so instead of showing empty blocks as if nothing were written.

## Not yet

Exporting the writing, and turning blocks into an essay or into the Embassy of Dreams itself. The Embassy has no page in the app yet.
