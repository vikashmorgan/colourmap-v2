---
name: design-audit
description: Audit a live page against the 15 consensus design principles
---

# Design Audit

You are a senior designer evaluating a live, rendered page. You assess against the 15 consensus design principles — their full definitions, not just their names. These principles form an interconnected system with documented tensions. A design choice that appears to violate one principle may be a deliberate tradeoff serving another. Your job is to identify genuine problems, not enforce mechanical compliance.

## Process

### 1. Capture

Collect evidence from the live page before evaluating:

- Navigate to the target URL (or use the currently open page).
- Take a full-page screenshot at desktop width.
- Run an accessibility audit (Lighthouse or equivalent — accessibility + best practices categories).
- Take a DOM/accessibility tree snapshot.
- Resize to 390px width, take a second screenshot (mobile).
- Check the browser console for errors and warnings.

### 2. Evaluate

Read `references/principles-checklist.md` (relative to this skill file) for the full checklist with definitions, tensions, suppressions, and heuristics.

Evaluate in clusters — related principles assessed together, not in isolation:

**Tier 1 — High confidence** (screenshots + accessibility audit + DOM):

- **Learnability** (#1 Consistency, #6 Recognition visual checks, #8 Mental Models visual checks) — Consistency enables mental model matching enables recognition. Check: uniform styling, visible location indicators, platform convention alignment.
- **Clarity** (#9 Visual Hierarchy, #7 Discoverability, #3 Simplicity, #12 Intentionality) — Hierarchy implements discoverability and reduces cognitive load; simplicity and intentionality constrain what appears. Check: CTA prominence, signifier clarity, information density, element purpose.
- **Inclusion** (#10 Accessibility) — Amplifies every other principle. Check: audit score, contrast, labels, keyboard access, touch targets, zoom.

**Tier 2 — Medium confidence** (code + interaction testing):

- **Resilience** (#2 Feedback, #4 Error Prevention, #5 User Control) — The error-handling triad: constraints prevent, feedback informs, undo recovers. Check: loading/error/success states, validation, destructive action guards, reversibility.
- **Recognition & Recall** (#6 interaction-dependent checks) — Check: input types, empty states, search affordances.
- **Progressive Disclosure** (#11) — Check: complexity layering, advanced options, form segmentation.
- **User Language** (#13) — Check: jargon, label clarity, outcome-oriented button text.

**Tier 3 — Flag for human review** (requires domain knowledge or subjective judgment):

- **Mental Models** (#8 domain-specific) — Does the structure match how users think about the domain?
- **Honest Design** (#15) — Dark patterns, deceptive urgency, pre-checked opt-ins. Apply the transparency test.
- **Test with Humans** (#14) — Process reminder. Include in every report.

**Cross-cutting rule**: When two principles conflict in a specific finding, name both principles and explain the tradeoff rather than flagging a violation.

### 3. Code check (only if inside a project directory)

Scoped to design-relevant concerns only — no overlap with code review skills:

- **State coverage**: Do page components handle loading, error, empty, and success states?
- **Component consistency**: Same UI pattern uses same component across the page.
- **Interaction completeness**: focus-visible styles present, keyboard event handlers on custom interactive elements, aria-live regions for dynamic content updates.

### 4. Report

```markdown
## Design Audit: [Page Name]
> Audited [date]. Desktop + mobile. Accessibility score: [score].
> This audit evaluates the rendered experience. It is not a substitute for user testing.

### Critical (blocks shipping)
- [Finding] — **[Principle Name]**. [Specific location]. [Concrete fix.]

### Important (fix before v1)
- [Finding]...

### Consider (quality-of-life)
- [Finding]...

### Strong (what's working)
- **[Principle Name]**: [What's done well]

### Tradeoffs Noted
- **[Principle A] vs [Principle B]**: [What the design chose and why it's defensible]
```

## Rules

- Only report what you can see or verify. Don't invent issues.
- Every finding must include a specific location and a concrete fix.
- Tier 3 findings use softer language ("consider", "may", "worth reviewing") — they're suggestions, not verdicts.
- Check the DO NOT FLAG suppressions in the checklist before reporting any finding.
- When a finding involves a tension between principles, present it as a tradeoff observation, not a violation.
- Don't duplicate what code review skills or project design rules already catch.
- If accessibility score >= 95 and no visual issues found, say "Clean audit" and stop. Don't manufacture findings.
- Maximum 10 findings per severity level. If there are more, report the 10 highest-impact ones.
