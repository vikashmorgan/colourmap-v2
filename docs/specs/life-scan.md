# Life Scan

> A guided self-assessment through three doors — Feeling, Doing, Sharing — that reveals where you are, what's blocking you, and generates a personal improvement program on your cockpit.

## Context

The cockpit shows your daily state (check-in) and daily actions (missions, trackers). But daily data without deeper understanding is noise. The life scan is the diagnostic layer — a periodic deep dive that helps you name what's weighing you down, understand your patterns, and turn that clarity into trackable actions.

The scan isn't a quiz. It's a conversation with yourself. Sliders give you a quick map, then reflective questions help you dig into what the numbers mean. The output isn't a score — it's a personal program: cockpit sections pre-built from what you discover.

## Two Parts

### Part 1: The Map (sliders)

Three doors, each with 4 bipolar sliders. Quick to complete (~2 minutes). Gives you a visual snapshot of your current state.

**Feeling** (internal awareness)
| ID | Blocking | Flowing |
|----|----------|---------|
| energy | Tired | Energized |
| relaxation | Tense | Relaxed |
| emotions | Heavy | Light |
| presence | Distracted | Present |

**Doing** (operating + creating)
| ID | Blocking | Flowing |
|----|----------|---------|
| focus | Scattered | Focused |
| motivation | No drive | Motivated |
| creative | Blocked | Inspired |
| discipline | Undisciplined | Disciplined |

**Sharing** (connecting)
| ID | Blocking | Flowing |
|----|----------|---------|
| connected | Isolated | Connected |
| honest | Guarded | Open |
| giving | Withholding | Generous |
| belonging | Outsider | Belonging |

UX: One door at a time. Stepped. 4 sliders per screen. Swipe or tap to move to the next door. Progress indicator shows which door you're on.

### Part 2: The Dig (reflective questions)

After the sliders, the scan presents reflective questions. These are not rated — they're free-text prompts that help you name what the sliders revealed. The questions adapt based on which areas scored low (blocking).

**Universal questions (always shown):**

1. "What is weighing you down right now?" — free text
2. "What are you most afraid of?" — free text
3. "What is your biggest weakness? How does it show up in your daily life?" — free text
4. "What don't you want in your life anymore?" — free text
5. "What is flowing? What feels good right now?" — free text

**Door-specific questions (shown for doors that scored low):**

Feeling (if average < 4):
- "What does your body need that it's not getting?"
- "When did you last feel truly relaxed? What was different?"

Doing (if average < 4):
- "What are you avoiding? Why?"
- "What would change if you had perfect discipline for one week?"

Sharing (if average < 4):
- "Who do you miss? What's stopping you from reaching out?"
- "Where do you feel most yourself with others?"

**Design:** Questions appear one at a time, large text, plenty of space to write. No rush. This is the presence practice extended — you're not filling a form, you're sitting with yourself.

## Part 3: The Program (cockpit sections)

After completing the scan, the app generates suggested cockpit sections based on your results. This is the bridge from understanding to action.

**Logic:**
- For each door where the average slider score is below 5 (on a 0-8 scale), suggest a cockpit section.
- Each suggested section comes pre-built with 3-5 trackers tailored to what scored low.
- The user can accept, customize, or dismiss each suggestion.

**Example suggestions:**

If Feeling scores low (energy: 2, relaxation: 1):
> **Suggested section: "Body & Rest"**
> - ✓ Moved today (check)
> - ✓ Ate clean (check)
> - ✓ Slept 7h+ (check)
> - ✓ Breathwork or meditation (check)
> - Energy level (scale 1-5)

If Doing scores low (discipline: 2, focus: 3):
> **Suggested section: "Discipline"**
> - ✓ Woke up on time (check)
> - ✓ Deep work block (check)
> - ✓ Screens off by 10pm (check)
> - Productivity (scale 1-5)

If Sharing scores low (connected: 2):
> **Suggested section: "Connection"**
> - ✓ Reached out to someone (check)
> - ✓ Quality time with someone (check)
> - ✓ Said something honest (check)

**The user always has full control:**
- Rename any section
- Add/remove/reorder trackers
- Change tracker type (check/scale/counter)
- Create sections from scratch (not just from scan suggestions)
- Dismiss suggestions entirely

## Default Cockpit Sections (before any scan)

New users get these pre-built sections so the cockpit is useful from day 1:

| Section | Default Trackers |
|---------|-----------------|
| **Body** | ✓ Moved, ✓ Ate well, ✓ Slept well |
| **Focus** | ✓ Deep work, ✓ No distractions |

Editable immediately. The life scan may suggest replacing or expanding these later.

## Behavior

- Life scan lives on a separate page, not the cockpit.
- Navigation: a link in the header or a card on the cockpit that says "Life Scan" with the date of last scan.
- One door at a time, stepped navigation.
- Sliders first (Part 1), then questions (Part 2), then program suggestions (Part 3).
- All data persists. You can retake the scan at any time — new scan data overlays the previous, but history is kept.
- The cockpit radar (future) will visualize life scan data as a 3-axis chart (Feeling/Doing/Sharing).

## States & Edge Cases

- First scan ever: no previous data. All sliders start at center (4). All questions blank.
- Repeat scan: previous slider values are shown as a faint marker so you can see change. Previous answers are accessible but don't pre-fill — you write fresh each time.
- Partial scan: if the user stops mid-scan, save what's completed. They can resume or start over.
- Skip questions: all free-text questions are optional. Sliders are required (one per door minimum — you must move at least one slider to proceed).
- No cockpit sections yet: the program suggestions screen explains what sections are and how they work.

## Evolution Tracking

Over time, the app accumulates scan data. Future features (not V1):
- Timeline showing how each slider moved across scans
- Correlation between cockpit tracker consistency and scan improvements ("weeks you walked 5+ days, your energy rating improved by 2 points")
- Reflective question history — read back what you wrote 3 months ago

## Done When

- User can complete a full 3-door scan with sliders and questions on a separate page.
- Scan results generate suggested cockpit sections with pre-built trackers.
- User can accept, customize, or dismiss suggestions.
- Scan data persists and can be retaken.
- The process feels empowering, not clinical. Like a conversation with a wise friend, not a medical intake form.

## Dependencies

- Supabase auth and database.
- New tables: life_scans (slider data per door), scan_reflections (free-text answers), cockpit_sections (user-created), section_trackers (items within sections), daily_tracker_entries (daily data).
- Custom cockpit sections feature (specs/custom-sections.md).
