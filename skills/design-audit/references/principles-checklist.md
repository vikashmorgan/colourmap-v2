# Design Principles Audit Checklist

Testable heuristics organized by confidence tier and principle cluster. Each cluster includes the principle definition (synthesized from the consensus research), key tensions, explicit suppressions, and testable checks.

## How to Use This Checklist

- **Evaluate in clusters**, not individual principles. Related principles reinforce and constrain each other.
- **Check suppressions before flagging.** A design choice that appears to violate one principle may be a deliberate tradeoff serving another. The DO NOT FLAG blocks prevent false positives.
- **Evidence tags** indicate what's needed to evaluate each check:
  - `[screenshot]` — visual capture alone
  - `[DOM]` — accessibility/DOM tree snapshot
  - `[audit]` — Lighthouse or equivalent accessibility audit data
  - `[interaction]` — testing the live page
  - `[code]` — reading the source

---

## Tier 1: High Confidence

Testable from screenshots, accessibility audit data, and DOM snapshots.

### Learnability

**Principles**: #1 Consistency, #6 Recognition over Recall (visual), #8 Mental Models (visual)

**Definition**: Identical elements look and behave identically. Users can identify where they are and what they can do from visible cues, not memory. The interface follows both internal conventions (within the product) and external conventions (platform and industry norms). Information appears in the order users expect based on real-world experience.

**Tensions**: Krug argues clarity trumps consistency — if making something inconsistent makes it significantly clearer, choose clarity. Internal consistency (your product's patterns) can conflict with external consistency (platform conventions). When they conflict, prefer platform conventions unless the product has a documented, coherent design system that intentionally diverges. Recognition interfaces can become cluttered — resolve via progressive disclosure (#11), not by removing cues.

**DO NOT FLAG WHEN**:
- An inconsistency clearly improves clarity for a specific context (clarity > consistency)
- A product has a documented design system that intentionally diverges from platform conventions
- Domain-specific terminology appears in professional tools where the target user thinks in that vocabulary (medical, financial, developer tools)
- Keyboard shortcuts or command palettes supplement recognition-based UI (these serve expert efficiency without hurting novice recognition)

**Heuristics**:
- [ ] Same UI element (buttons, links, cards) styled identically across the page `[screenshot]`
  Pass: No rogue font sizes, colors, or border radii on same-type elements.
- [ ] Spacing between similar elements is uniform `[screenshot]`
  Pass: Cards, list items, and form fields use consistent margins/padding.
- [ ] Same action uses same label everywhere `[DOM]`
  Pass: No synonymous labels for the same operation ("Save" vs "Submit" — pick one).
- [ ] Icons follow a single style family (outlined, filled, or mono — not mixed) `[screenshot]`
  Pass: All icons share the same visual weight and style.
- [ ] Interface follows platform conventions for standard patterns (navigation, selection, scrolling) `[screenshot]`
  Pass: Users familiar with the platform can navigate without learning new conventions.
- [ ] Navigation shows current location (active state, breadcrumbs, or equivalent) `[screenshot]` `[DOM]`
  Pass: User can identify which page/section they're on without reading the URL.
- [ ] Data is displayed in the format users expect (dates, currencies, units) `[DOM]`
  Pass: Localized, human-readable formats — not ISO timestamps or raw cents.

---

### Clarity

**Principles**: #9 Visual Hierarchy, #7 Discoverability, #3 Simplicity, #12 Intentionality

**Definition**: Size, color, contrast, weight, spacing, and position create a clear ordering of importance. Interactive elements visually communicate their interactivity through signifiers — visible cues that show what actions are possible and how to perform them. Every element on the page exists for a specific, articulable reason tied to user needs. The design favors the simplest approach that accomplishes the objective.

**Tensions**: Simplicity can conflict with discoverability — flat design removes visual clutter but can also remove signifiers (the canonical example is flat buttons losing their affordances). Simplicity also conflicts with power — Tesler's Law states every system has irreducible complexity that can only be moved, not eliminated. A tax form requires many fields; a code editor requires many panels. The question is whether complexity is *managed*, not whether it exists. Some "decorative" elements increase perceived usability and trust (the Aesthetic-Usability Effect). Norman's three levels of emotional design suggest elements can serve visceral or reflective purposes beyond strict function.

**DO NOT FLAG WHEN**:
- Information density is high but managed through progressive disclosure in power-user tools (dashboards, IDEs, trading platforms)
- Decorative elements serve the Aesthetic-Usability Effect (brand trust, emotional design, delight) — the distinction is between *arbitrary* decoration and *intentional* emotional design
- A minimal interface retains sufficient signifiers for interactive elements (underlines, button boundaries, cursor changes, state changes)
- Complexity is irreducible for the domain (Tesler's Law) and the design manages it through clear grouping, hierarchy, or progressive disclosure

**Heuristics**:
- [ ] Primary action is the most visually prominent interactive element on the page `[screenshot]`
  Pass: Largest, highest-contrast interactive element matches the intended primary action.
- [ ] Primary and secondary actions are clearly differentiated in visual weight `[screenshot]`
  Pass: Visual stepping — primary (filled/bold), secondary (outlined/muted), tertiary (text-only/subtle).
- [ ] Size and weight decrease from primary to secondary to tertiary content `[screenshot]`
  Pass: Headings > subheadings > body > captions in clear visual steps.
- [ ] Related elements are visually grouped (proximity, borders, background) `[screenshot]`
  Pass: Distinct content groups separated by whitespace, dividers, or containers.
- [ ] Interactive elements are visually distinguishable from non-interactive elements `[screenshot]` `[DOM]`
  Pass: Buttons have visible boundaries or state changes. Links have underlines or distinct color. Pointer cursor on hover. No "mystery meat" navigation.
- [ ] Primary actions are visible without scrolling on key pages `[screenshot]`
  Pass: Main CTA is above the fold on both desktop and mobile.
- [ ] Page has a visible heading or hero that communicates its purpose `[screenshot]`
  Pass: A new visitor can identify what the page does from the first viewport.
- [ ] Instructional and action-oriented text is scannable `[screenshot]`
  Pass: Short paragraphs, lists, or visual breaks for task-oriented content. (Long-form content like articles or docs is exempt.)
- [ ] Every visible element serves an identifiable purpose `[screenshot]`
  Pass: Removing any element would reduce the page's ability to serve its purpose. No placeholder content, Lorem Ipsum, or vestigial UI in production.
- [ ] Tooltips or labels explain icon-only buttons `[DOM]`
  Pass: Every icon-only button has a `title`, `aria-label`, or visible text on hover.

---

### Inclusion

**Principles**: #10 Accessibility

**Definition**: Products must be perceivable, operable, understandable, and robust for users with the full range of human abilities, devices, and contexts. Accessibility is not an add-on — it amplifies every other principle. An inaccessible design fails at feedback, discoverability, and hierarchy for a significant portion of users.

**Tensions**: WCAG Level AAA conformance is often impractical for all content types. Automated accessibility testing catches roughly 30% of issues — the audit score is a floor, not a ceiling. Accessibility constraints can be generative, forcing better solutions that benefit all users (curb-cut effect). The tension between creative expression and compliance is real but rarely requires choosing one over the other.

**DO NOT FLAG WHEN**:
- Accessibility audit score is 90-95 — report as Important, not Critical. Only scores below 80 are Critical.
- Color alone is not the indicator *and* sufficient non-color indicators exist (icons, text labels, patterns)

**Heuristics**:
- [ ] Accessibility audit score >= 90 `[audit]`
  Pass: Score meets threshold. Below 80 is Critical; 80-89 is Important; 90+ is passing.
- [ ] All text meets WCAG AA contrast (>= 4.5:1 normal, >= 3:1 large) `[audit]`
  Pass: No contrast failures in audit report.
- [ ] All form inputs have visible, associated labels `[DOM]`
  Pass: Every `<input>`, `<select>`, `<textarea>` has a corresponding `<label>` or `aria-label`.
- [ ] All images have descriptive alt text or `alt=""` for decorative `[DOM]`
  Pass: No `<img>` without an `alt` attribute.
- [ ] Page is navigable by keyboard alone `[interaction]`
  Pass: All interactive elements reachable via Tab, focus ring visible.
- [ ] Touch targets are at least 44x44px on mobile `[screenshot]` `[DOM]`
  Pass: Buttons and links meet minimum size on 390px viewport.
- [ ] Page renders correctly at 200% zoom `[screenshot]`
  Pass: No overlapping elements, truncated text, or horizontal scroll at 200%.
- [ ] Logical reading order makes sense when CSS is disabled or content is linearized `[DOM]`
  Pass: DOM order matches the intended reading sequence.

---

## Tier 2: Medium Confidence

Requires code inspection, DOM analysis, or interaction testing alongside visual review.

### Resilience

**Principles**: #2 Feedback, #4 Error Prevention, #5 User Control

**Definition**: The system communicates the result of every user action — feedback must be immediate, informative, and proportional (modest for frequent minor actions, substantial for major or irreversible ones). Systems should be designed so that errors are difficult or impossible to make in the first place; errors are always the fault of the design, never the user. Users should initiate actions, not respond to system demands. Every action should be easily reversible.

**Tensions**: Raskin argued universal undo makes confirmation dialogs unnecessary and counterproductive — most practitioners disagree for truly destructive actions. There's a tension between aggressive error prevention (heavy validation, disabled states) and user autonomy. Overly eager inline validation can feel restrictive and violate user control. For asynchronous operations, optimistic UI (showing success before server confirmation) is a legitimate feedback strategy for low-risk actions, not a feedback failure.

**DO NOT FLAG WHEN**:
- A confirmation dialog is absent for easily reversible actions that support undo (Raskin's position — undo is better than confirmation)
- Optimistic UI is used for low-risk actions (toggling a favorite, marking as read)
- Inline validation fires only on blur or submit, not on every keystroke — timing is a design choice
- An action lacks a loading state but completes in under 300ms consistently

**Heuristics**:
- [ ] Form submissions show a loading state while processing `[code]` `[interaction]`
  Pass: Submit button disables or shows spinner during async operations.
- [ ] Success actions show confirmation (toast, redirect, inline message) `[code]` `[interaction]`
  Pass: User gets explicit acknowledgment after completing an action.
- [ ] Error states display a clear, actionable message `[code]` `[interaction]`
  Pass: Error messages explain what happened and what to do next. No generic "Something went wrong" without guidance.
- [ ] Hover and focus states exist on all interactive elements `[interaction]`
  Pass: Buttons, links, and inputs change appearance on hover and focus.
- [ ] Feedback intensity matches action significance `[code]` `[interaction]`
  Pass: Minor actions get subtle feedback. Major or irreversible actions get prominent confirmation.
- [ ] Required form fields are marked before submission, not just after failure `[DOM]`
  Pass: Required indicators visible on initial render.
- [ ] Input constraints are communicated upfront (character limits, format hints) `[DOM]`
  Pass: Placeholder text or helper text explains expected format.
- [ ] Destructive actions require confirmation or support undo `[code]` `[interaction]`
  Pass: Delete, remove, or cancel operations have a confirmation step or an undo path.
- [ ] Modal dialogs can be dismissed (X button, Escape key, backdrop click) `[interaction]`
  Pass: All standard dismissal methods work.
- [ ] Multi-step flows allow going back to previous steps `[interaction]`
  Pass: Wizard/stepper UI has a back button and preserves entered data.
- [ ] Filters, sorts, and selections can be cleared or reset `[interaction]`
  Pass: A clear/reset action is available when filters are active.

---

### Recognition & Recall

**Principles**: #6 Recognition over Recall (interaction-dependent checks)

**Definition**: Don't force users to remember information from one part of the interface to use in another. Prefer interfaces where users can recognize what to do from visible cues rather than recalling procedures from memory. Recognition memory is vastly more reliable than recall memory.

**Tensions**: Command-line interfaces, keyboard shortcuts, and expert workflows rely on recall but are dramatically faster for practiced users. The interface should support both modes (recognition for novices, shortcuts for experts). The challenge is designing for recognition without cluttering the interface, which conflicts with simplicity (#3). Progressive disclosure (#11) is the standard resolution.

**DO NOT FLAG WHEN**:
- Expert shortcuts (keyboard commands, command palette) supplement rather than replace recognition-based UI
- A professional tool surfaces dense information that its trained users expect and need

**Heuristics**:
- [ ] Form fields use appropriate input types (date pickers, dropdowns, toggles) `[DOM]`
  Pass: No free-text input where a constrained input type exists.
- [ ] Empty states provide guidance on what to do next `[screenshot]`
  Pass: Empty lists/tables show a helpful message and a CTA, not just blank space.
- [ ] Secondary actions are accessible but visually subordinate `[screenshot]`
  Pass: Edit, settings, and advanced options are findable but not competing with primary actions.

---

### Progressive Disclosure

**Principles**: #11 Use progressive disclosure to manage complexity

**Definition**: Show only the information and options relevant to the current task. Reveal additional complexity on demand. Layer information from simple to complex so basic users are not overwhelmed and advanced users can still access full functionality. Reducing visible choices from 20 to 5 can cut decision time by more than half (Hick's Law).

**Tensions**: Hiding features too aggressively creates discoverability problems (#7). Progressive disclosure that creates modes — where the interface behaves differently based on what's been revealed — can confuse users (Raskin's critique). Power users of dense tools (Photoshop, Excel, IDEs) often prefer information-dense interfaces where everything is one click away.

**DO NOT FLAG WHEN**:
- A power-user tool deliberately surfaces dense controls (this is progressive disclosure working in reverse — the audience expects it)
- Basic features are clearly surfaced even though advanced features are hidden (this is progressive disclosure working correctly, not a discoverability failure)

**Heuristics**:
- [ ] Advanced options are behind "Advanced", "More options", or equivalent when applicable `[screenshot]` `[DOM]`
  Pass: Power-user features don't clutter the default experience.
- [ ] Long forms are broken into logical sections or steps `[screenshot]`
  Pass: Forms with more than 6 fields use sections, tabs, or multi-step flows.
- [ ] Detail views expand from summary views (click to expand, drill-down) `[interaction]`
  Pass: Information is layered — overview first, details on demand.

---

### User Language

**Principles**: #13 Speak the user's language, not the system's

**Definition**: Use words, labels, and concepts familiar to the target user rather than technical jargon, internal terminology, or system-centric language. Every word's clarity is critical because users scan rather than read — a single confusing label can derail a task flow.

**Tensions**: Domain-specific professional tools legitimately use specialist terminology because their users think in that vocabulary. "Simplifying" medical terminology for clinicians would reduce clarity. The principle is about matching the *user's* language level, not achieving universal simplicity.

**DO NOT FLAG WHEN**:
- Domain-specific terminology appears in tools built for domain experts
- Technical terminology is appropriate for a developer-facing interface

**Heuristics**:
- [ ] Labels use plain language, not internal jargon or system terminology `[DOM]`
  Pass: A user in the target audience would understand every label and message.
- [ ] Error messages are written in the user's language, not developer language `[code]`
  Pass: No stack traces, error codes, or "null reference" shown to end users.
- [ ] Button labels describe the outcome, not the mechanism `[DOM]`
  Pass: Labels answer "what will happen?" not "what HTTP method will fire?" ("Save profile" not "Submit").

---

## Tier 3: Flag for Human Review

Requires domain knowledge, subjective judgment, or contextual understanding the auditor may not have. Use softer language: "consider", "may", "worth reviewing."

### Mental Models

**Principles**: #8 Match the system to the user's mental model (domain-specific checks)

**Definition**: Design systems that align with how users already think about the task. When a system matches the user's mental model, the learning curve nearly vanishes. Schema theory in cognitive psychology shows new information is understood faster when it maps onto existing knowledge structures.

**Tensions**: Sometimes innovative design requires creating new mental models — the original Macintosh desktop metaphor was novel, not matched to prior computing experience. Breaking models is acceptable only when the new model is clearly communicated and substantially better. The question is: when does breaking mental models unlock a genuinely better experience, and when is it designer hubris?

**Heuristics**:
- [ ] Navigation structure matches how users think about the domain `[screenshot]` `[DOM]`
  Consider: Section names should reflect user goals ("My Orders") not internal organization ("order_records").
- [ ] Common patterns follow conventions users expect from similar products `[screenshot]`
  Consider: Cart icon for shopping, gear for settings, magnifying glass for search — unless the product has a strong reason to diverge.

---

### Honest Design

**Principles**: #15 Honest design never manipulates

**Definition**: Design should accurately represent what a product does. It should not deceive users, create false urgency, exploit cognitive biases for the organization's benefit at the user's expense, or make promises the product cannot keep. Trust is the foundation of sustained product use. The key differentiator between persuasion and manipulation: if users would object to the technique upon learning about it, it's manipulation.

**Tensions**: Nudge theory argues that designing choice architecture to guide better decisions is ethical — but "better" is defined by whom? Gamification, variable reward schedules, and engagement-maximizing design sit in a gray zone. A progress bar that motivates profile completion could be helpful or manipulative depending on context and intent.

**Heuristics**:
- [ ] No deceptive design patterns `[screenshot]` `[DOM]`
  Consider: No trick wording, hidden costs, misdirection, forced continuity, confirm-shaming, or disguised ads.
- [ ] Opt-ins are opt-in `[DOM]`
  Consider: Checkboxes for marketing, tracking, or terms default to unchecked. No double negatives.
- [ ] Pricing and commitments are clearly stated before the action `[screenshot]`
  Consider: No surprises after clicking "Continue" or "Sign up."
- [ ] Persuasive techniques pass the transparency test `[screenshot]`
  Consider: Any urgency, scarcity, or social proof elements — would a user who understood the technique feel deceived?

---

### Test with Humans

**Principles**: #14 Test with real humans, then iterate

This is a process principle, not a heuristic. Include the following in every audit report:

> This audit evaluates the rendered experience against design heuristics. It identifies issues that trained designers broadly agree on, but it is not a substitute for observing real users attempting real tasks. Five users uncover roughly 85% of usability problems (Nielsen). Test early, test often.
