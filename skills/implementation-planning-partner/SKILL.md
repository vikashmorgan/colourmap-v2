---
name: implementation-planning-partner
description: Run deep product and implementation discovery sessions for new ideas before coding. Use when a user wants detailed questioning about what to build, the problem it solves, user outcomes, UX feel, constraints, and tradeoffs, then wants concrete implementation options and a step-by-step execution plan.
---

# Implementation Planning Partner

Canonical shared skill. Keep this file runtime-agnostic. Agent-specific wrappers or helper configs can live alongside it, but this file defines the behavior.

## Workflow

1. Run discovery interview using structured question tools when the runtime provides them.
2. Synthesize problem and success criteria.
3. Propose implementation options with tradeoffs.
4. Drive decision-making and close unknowns.
5. Produce execution-ready implementation plan.

Keep momentum by asking focused question batches (2-4 questions at a time), then synthesize before moving to the next batch.

## Discovery Interview

Drive the interview in rounds. Use `references/question-bank.md` and pull only the sections relevant to the project.

Round structure:
1. Ask targeted questions for one domain.
2. Reflect back what is known and unknown.
3. Confirm assumptions explicitly.
4. Decide whether to continue probing or advance.

Core domains:
- User/problem: target user, pain, current workaround, urgency.
- Outcome: business goal, user success signals, launch scope.
- Experience: tone, feel, interaction style, brand constraints.
- Capability: core features, must-haves vs nice-to-haves, non-goals.
- Constraints: timeline, team, budget, tech/legal/security limits.
- Quality bar: reliability, performance, accessibility, observability.

## Option Synthesis

After enough discovery, present 2-4 implementation options:
- Start with a short framing of assumptions.
- For each option, include architecture shape, delivery speed, complexity, risk, and scalability.
- Recommend one option and explain why it best fits stated constraints.

If key facts are missing, flag them as decision blockers and ask only the minimum questions needed to unblock.

## Decision Session

Convert options into decisions:
- Capture chosen stack, architecture, and delivery slices.
- Log rejected options with reasons.
- Call out unresolved decisions with owner and deadline.

Challenge weak assumptions and request evidence when choices create major risk.

## Implementation Plan Output

Produce a concrete plan using `references/implementation-plan-template.md`.

Minimum plan quality:
- Includes phases, milestones, and sequencing.
- Breaks milestones into tasks small enough to implement directly.
- Defines acceptance criteria per milestone.
- Includes risk register and mitigations.
- Lists open questions and next decisions.

When appropriate, include a "Start tomorrow" checklist with the first 3-5 execution tasks.

## Interaction Rules

- Ask concise but high-signal questions.
- Avoid dumping the full questionnaire at once.
- Prefer structured question or planning tools when available; otherwise ask plainly in conversation.
- Prefer specificity over generic advice.
- Restate the plan after each major decision.
- End each round with either the next question batch or a draft plan update.
- Avoid slash-command-specific wording in the canonical skill itself.
