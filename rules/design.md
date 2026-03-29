# Visual Design Guardrails

Opinionated defaults. Follow unless explicitly overridden.

## Spacing

8px grid. All spacing values must be multiples of 4: 4, 8, 12, 16, 24, 32, 48, 64. No magic numbers.

## Typography

One font family per project. Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48. Line-height 1.5 for body, 1.2 for headings. Max line length 65ch.

## Color

60-30-10 rule: 60% neutral background, 30% secondary, 10% accent. Max 3 brand colors + neutrals. Contrast ratio ≥ 4.5:1 for all text.

## Hierarchy

Size > weight > color for importance. One primary action per screen. Visual weight guides the eye top-left → primary action.

## Whitespace

When in doubt, add more. Sections separated by ≥ 32px. Related elements grouped tightly (8–16px). Unrelated elements spaced apart (24–48px).

## Consistency

Same element = same style everywhere. Don't invent new button variants. Use shadcn/ui defaults before customizing.
