# Current Mission

> Active objectives you're working toward today — with space to name the challenge and define the target.

## Context

Tasks without awareness become a grind. Awareness without tasks becomes navel-gazing. Missions sit on the right side of the cockpit so you see what you're doing alongside how you're feeling. The interaction between the two columns IS the product.

## Behavior

- Missions live in a card titled "Current Mission" on the right column.
- Add via a + button in the header. Clicking + reveals an input field. Input hides after adding.
- Each mission is a collapsible card showing the title.
- Clicking the title expands the card to show three collapsible fields:
  - **Objective** — single-line input. "Define the target."
  - **Challenge** — single-line input. "What's making this hard?" Red accent when filled.
  - **Notes** — multiline textarea. "Background, links..." Hidden behind toggle.
- All three fields are collapsed by default, showing a truncated preview if they have content.
- Only one field open at a time within a card.
- Fields auto-save with 800ms debounce.
- Circle checkbox to mark complete. Completed missions move to a "Done" section with strikethrough.
- Delete via ✕ button.

## States & Edge Cases

- Zero missions: show "No missions yet. What are you working toward?"
- New mission: auto-expands after creation so you can fill in details.
- All fields empty: valid. A mission can just be a title.
- Challenge filled: card border tints red to signal a blocker at a glance.
- Completed missions: can be unchecked to reactivate.

## Done When

- Missions persist across page loads (Supabase).
- All fields auto-save without a save button.
- The card is minimalist when collapsed, detailed when expanded.
- Adding a mission takes one click + typing. No friction.

## Dependencies

- Supabase auth and database.
- Missions table with: id, userId, title, description, blocking, nextStep, completed, createdAt.
