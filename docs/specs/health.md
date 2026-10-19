# Health — knee, shoulder and feet, day by day

**Status:** Active
**Date:** 2026-10-19
**Route:** `/health` (signed-in only) · API `/api/health/log`, `/api/health/notes`
**Branch:** Energy · How the body is

## Purpose

Victor's recovery routine for a patellar tendon and patellofemoral knee, an overactive front of the right shoulder, and very high, unstable arches with cold feet. It started as a document (`knee-shoulder-feet-routine.md`, built from his two notes). As a page it can do what a document cannot: say what to do this morning, at school and tonight, tick it off day by day, keep how each part feels, and hold the questions and things to research next to the exercise they are about.

Asked for on 2026-10-19:

> "Create a page for my health on my Colour Brain where I can note how I feel and add elements to further research on the discussion. I can also tick what exercises I have done on which day."
> "I need a plan with what in the morning, what during the day at school I can do to relax it and train it, and what in the evening."
> "You can add chill qi gong exercises or tai chi or light stretches that I can practise to make energy flow for the parts where I am weak."
> "And also a part where I can add questions for exercises or overall. Use the design of the Practice part of the studies, with a day and night mode."

General guidance, not a diagnosis. The page says so at the top, with the pain rule.

## The page

One self-contained file, `content/health/index.html`, served by a route handler like `/coding` and `/school`. It has Practice's look: beige day mode, warm night mode, coloured sections that open one at a time, and cards that open one at a time. The ☾ / ☀ button switches, and the choice is remembered on the device (`health-theme`).

Four tabs:

- **Today.** The date, with ‹ › to move between days (today by default, never the future).
  - **How it feels:** a 0–10 tap scale for Knee, Right shoulder and Feet, plus a free note for the day.
  - **The plan for the day,** in three parts: **Morning**, **At school** and **Evening**. Every item ticks. Evening alternates **A · Knee and feet** and **B · Shoulder**, so a session stays 20–25 minutes. The page suggests the one not done last time, and both can be ticked.
  - **The last seven days:** a strip with how much of each part was done and the three pain numbers, so a trend shows without a chart.
  - **Go easy:** if any part is 4 or more today, or higher than yesterday, a calm line repeats the pain rule.
- **Plan.** The three parts of the day explained: what, for how long, and why.
- **Exercises.** The library, in sections: Knee · Right shoulder · Release the front · Feet · Flow (qi gong, tai chi, gentle stretches) · At school. Each card shows the dose, how to do it, what it is for, and what to watch out for, with the same **Question / Comment / Research** notes as Practice. A closing **Good to know** holds what to avoid for now, cold feet, slippers, and when to see a doctor or physio.
- **Notes.** Everything written, in one place: questions (answered and waiting), things to research, comments, each tagged with its exercise, then every day's feelings as a timeline.

### The notebook on the right

The same dot and notebook as Practice: beige paper and brown ink. Its *About* list holds *Overall*, each section and each exercise. It is preselected from what is open (the open card, else the open section, else Overall) and follows the page until chosen by hand. Below it, every note grouped by place, *you are here*, and jump-to links.

## Storage

Two tables, both scoped by RLS to their owner (migration `0027_health.sql`).

- **`health_log`** — one value per user, day and key, unique on `(user_id, day, item_key)`.
  - A tick is `{part}|{exercise}` = `1` (for example `am|lift-sky`, `sc|chin-tuck`, `eva|clamshell`); unticking deletes the row.
  - Pain is `pain|knee`, `pain|shoulder` or `pain|feet` = `0`–`10`.
  - The day's note is `feel` = its text, up to 2000 characters.
- **`health_notes`** — the same shape as `coding_notes`: any number of notes per place, kind `question`, `comment` or `research`. An `answer` written from the terminal sits beside a note and never changes it; `read_at` records when it was read. Keys: `overall`, `sec|{section}`, `ex|{exercise}`.

The browser copy (localStorage) is always written first. Changes made offline wait in a queue and are sent when the page is next online. Served outside Colour Brain, the page works on its own and keeps everything in the browser.

`coding_notes` and `health_notes` share one query layer (`lib/db/queries/notes-table.ts`) and one service (`lib/services/notes-service.ts`). Only their table, kinds and error class differ.

## Access

`/health` redirects a logged-out visitor to `/login?next=/health`. The nav shows **Health** as a plain link, like School, since the page leaves the app shell.

## Not yet

- Drawings of each exercise. The routine document refers to `img/*.svg` files that do not exist yet.
- A script to write answers into `health_notes.answer`, like `scripts/coding-answer.ts`.

## Reflection

- **2026-10-19.** First built. Evening is split A/B because the whole routine back to back is about 45 minutes, and the document's own dose is 20–25 minutes, 4–5 days a week. The flow exercises are chosen for the weak parts and kept knee-safe: high stances, knees soft and never past the toes, no deep horse stance.
