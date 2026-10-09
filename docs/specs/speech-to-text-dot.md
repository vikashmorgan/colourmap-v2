# Voice Notes

## Summary

Every writing surface exposes a small ochre dot. Tap it to record, tap it to stop. The audio is
uploaded, stored, and read by a model server-side; the words are appended to the field a few seconds
later.

**The audio is the record. The transcript is a derivative.** That order is the feature. A recording
reaches storage before anything tries to understand it, so a bad model, a dead network or an
unsupported browser costs a *reading* — never the thought.

## The rule this exists to enforce

> **Capture must not be able to fail.**

Everything else here follows from it. The row is created with no transcript. `status` starts at
`captured`. Reading is a separate request that is allowed to fail, be slow, or be retried tomorrow
from a different machine.

## States

| Status | Means |
|---|---|
| `captured` | Audio is in storage. The thought is safe. |
| `transcribing` | Something is reading it. Claimed, so two readers cannot both pay for the same note. |
| `transcribed` | It has words. |
| `failed` | Reading did not work, and `error` says why. The audio is untouched — this is a retry, not a loss. |

`captured` and `transcribing` are both **pending**: a note claimed by a reader that then died is
still waiting for somebody, and leaving it out of the queue is how it would be lost in plain sight.
`reopen()` moves a failed note back to `captured`, and retry is always a decision rather than an
automatic loop.

Postgres enforces the vocabulary (`voice_notes_status_known`) and enforces that a `transcribed` row
actually carries text (`voice_notes_transcribed_has_text`), so the state and the data cannot drift.

## Reading

One call to `gemini-2.5-flash` returns the words **and** the shape:

| Field | Why |
|---|---|
| `text` | Punctuated, in the language spoken. **Never translated** — a note thought in French is a French note, and rendering it in English is a silent edit of somebody's own words. |
| `lang` | Detected, not declared. `mixed` when genuinely code-switched. |
| `branch` | `art` \| `admin` \| `energy`, **or null**. The model is told to decline rather than guess: a wrong branch files a thought where it will not be looked for. |
| `isIntention` | Sorts the review queue. Never acted on automatically — a person still confirms. |

**One call, not two.** Transcribe-then-classify pays two round trips and lets the classifier read a
flattened transcript instead of the audio — losing the hesitation, the trailing-off, the "actually,
no", which is exactly the evidence for whether something was a real intention or thinking aloud.

**Claude cannot do this.** It does not accept audio input, so `@ai-sdk/anthropic` — already used by
`api/ai/presence` — cannot be the transcriber. A capability fact, written down so nobody spends an
evening on it.

## Storage

Audio goes to the existing `recordings` bucket under `${userId}/voice/${stamp}.${ext}`. The bucket is
shared with music recordings, so the API rejects any `storagePath` that does not start with the
caller's own id or that contains `..` — without that, a crafted path files a row pointing at
somebody else's object and the signed URL hands it over.

Safari records MP4 and nothing else; everything else takes WebM/Opus. `pickMimeType` tries in order
and falls through to the empty string, which is the only thing that works on older iOS where
`isTypeSupported` does not exist.

## The dot

- 9px ochre, tappable at 44px — padding out, equal negative margin back, so six existing layouts do
  not move.
- Recording pulses. Saving and reading breathe. Failure is a **hollow ring, not a red dot** — red
  badges are on the never list, and a ring reads as *waiting for you* rather than as an alarm, which
  is accurate since the recording is safe.
- Every state has a word for it via `labelFor()`. Colour and animation are not a description, and a
  blind user gets nothing from either.
- Disabled while saving, because a second tap would start a new recording on top of one still in
  flight.

## Surfaces

`MicDot` is used by `DailyObjectives`, `DailyAgenda`, `ReflectThreeDots`, `CheckInForm`, `FdsPanel`
and `notebook/page.tsx`.

**Not yet migrated:** `BuildLab` and `GlobalAIPresence` still import `use-speech-to-text` directly.
Two hooks for one job is a migration, not a design, and it should not be left standing.

## Requires

- `GOOGLE_GENERATIVE_AI_API_KEY` in the environment.
- Migration `0022_voice_notes.sql`.
- The `recordings` bucket (already exists).

---

## Reflection

### 2026-09-21 — the browser was the problem, and the lost thought was the bug

This spec used to describe a dot that called the Web Speech API, and its own text contained the
reversal: *"Fallback: if the browser doesn't support SpeechRecognition, the dot simply doesn't
render — no error state."* On iOS that is not a fallback. It is the feature being absent on the
device the app is installed on.

The three faults, in the order they matter:

1. **A failure lost the thought.** Nothing but the produced text was ever kept. This is the real bug
   and no API swap fixes it — which is why the change is *record first*, not *transcribe better*.
2. **It did not render on iOS.** `MicDot` returned `null`, silently, exactly where the app lives.
3. **One fixed language per session** (`lang = 'en-US'`). Thinking here moves between French,
   Italian and English inside a single sentence, and no fixed `lang` survives that. This alone
   explains most of the bad results.

The old spec's browser-support table claimed "Safari (iOS 14.5+)". That was optimistic when written
and is the sort of claim worth distrusting in any spec: it describes a capability matrix rather than
a device somebody actually used.

**What was given up, and it is real.** Interim text painted into the field as you speak. It felt
immediate and it was genuinely nice. It cannot be kept — interim results exist only because the
browser is doing the recognition, and the browser is what was wrong. The replacement is an honest
elapsed counter and a visible reading state.

**What was nearly got wrong.** The first cut let a schema-valid empty transcript count as success.
Silence, a muted microphone, and a never-granted permission all land there, and filing them as
`transcribed` would have hidden them from retry for good — a new way to lose a thought, introduced
by the change meant to stop losing them. `transcribe()` now returns `nothing audible` instead.

**Noted but not fixed here:** the dot had been a 9px touch target since it was written, which is
below the accessibility floor that does not relax. Fixed in passing because this change was already
inside the component.

**Not verified end-to-end.** The model call and the migration both need credentials this branch does
not have. Unit level is green; the first real recording is the actual test.

### Older — the original design

Kept because the reasoning was sound for what was known at the time: no external API, no key, no
cost, instant, and every browser has it. Three of those five were true. The two that were not —
*every browser*, and the unstated assumption that transcription succeeding was the same as capture
succeeding — are what this replaced.
