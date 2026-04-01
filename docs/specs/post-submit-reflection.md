# Post-Submit Reflection

> A brief, intentional pause after checking in — honoring the moment instead of dismissing it.

## Context

The current check-in shows "Checked in." for 2 seconds and resets. This treats the check-in as a transaction — data submitted, done. But the product philosophy says the check-in IS the practice, not just data input. The post-submit reflection turns the confirmation into a moment of presence: you see where you are, take one breath, and return.

## Behavior

- After successful submission, the check-in form fades out and is replaced by a reflection screen.
- The reflection screen shows:
  - The emotional vocabulary word for the submitted slider value (e.g., "Steady"), displayed large and centered.
  - A single breath prompt below: "Take one breath."
  - No other UI elements. No buttons, no navigation, no stats.
- The reflection auto-dismisses after 6 seconds (approximately one slow breath cycle).
- The user can tap anywhere to dismiss early. No penalty, no judgment.
- After dismissal, the check-in form reappears in its reset state (slider at center, note empty).
- The reflection uses a gentle fade-in on appear and fade-out on dismiss.

## States & Edge Cases

- Rapid re-check-in: if the user dismisses early and immediately checks in again, the reflection shows again. No cooldown or "you just did this" logic.
- Submission error: reflection does NOT show. Error state remains on the form as it does today.
- Offline/network failure: no reflection. The error path handles this.
- Accessibility: the reflection screen must be announced to screen readers. The dismiss-on-tap target is the full screen area.

## Done When

- Successful check-in triggers a 6-second reflection moment showing the emotional word and breath prompt.
- The reflection feels calm and intentional — not like a loading screen or interstitial ad.
- Tap-to-dismiss works anywhere on the screen.
- Form resets cleanly after reflection ends.

## Dependencies

- Emotional vocabulary mapping (specs/emotional-vocabulary.md) — uses the same word derivation.
- Check-in form (existing) — replaces the current success message behavior.
