# Time-of-Day Awareness

> Subtle shifts in greeting and tone based on when you open the app — making it feel like it knows you're a person with a day.

## Context

The check-in currently feels the same at 7am and 11pm. But your relationship to "how are you feeling?" is different in the morning vs winding down at night. A small contextual shift — just a greeting and maybe a tonal adjustment — makes the app feel alive and aware without adding any interaction cost.

## Behavior

- The check-in screen displays a short greeting above the slider label, based on time of day.
- Four time periods (based on device local time):
  - **Morning** (5:00–11:59): "Good morning."
  - **Afternoon** (12:00–16:59): "Good afternoon."
  - **Evening** (17:00–21:59): "Winding down."
  - **Late night** (22:00–4:59): "Still up."
- The greeting replaces or sits above the current "How are you feeling?" label. The label itself can adapt:
  - Morning: "How are you starting the day?"
  - Afternoon: "Where are you at?"
  - Evening: "How are you feeling?"
  - Late night: "How are you holding up?"
- The greeting is purely cosmetic — it's not persisted and has no effect on the check-in data.
- Time is determined client-side from the device clock. No timezone configuration needed.
- The greeting does not update live if the user sits on the page across a time boundary. It's set on page load / component mount.

## States & Edge Cases

- Time boundary: if the user opens the app at 11:59 and checks in at 12:01, the greeting stays as "Good morning." No mid-session switch.
- SSR: greeting must be rendered client-side only to avoid hydration mismatch (server doesn't know the user's local time).
- Accessibility: greeting is decorative context, not critical information. Screen readers should read it but it's not an alert or live region.

## Done When

- The check-in screen shows a time-appropriate greeting and adapted label.
- Four distinct time periods with unique greeting and label text.
- No hydration mismatch — greeting renders client-side.
- The greeting feels warm and human, not robotic or corporate.

## Dependencies

- Check-in form (existing) — UI addition above the slider.
- No backend dependencies. Purely client-side.
