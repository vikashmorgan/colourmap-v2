# Personality Map

> IFS-inspired inner parts mapping — name the fragments of who you are and see how they relate.

## Context

Everyone has multiple inner parts — The Party Animal, The Perfectionist, The Dreamer. These parts have different needs, triggers, and levels of presence. Making them visible creates self-understanding.

## Behavior

- "+ name a part of you" button to add parts
- Each part: name, color (10 options), needs (text), triggers (text), strength (0-100)
- Collapsed: colored pill with name + strength bar
- Expanded: editable name, strength slider (6 blocks), needs input, triggers input, delete
- Visual constellation: SVG with circles sized by strength, connected by lines
- Click circles in SVG or pills in list to expand

## Overview Panel

Appears when 2+ parts have needs or triggers filled:
- **What your parts need**: all needs as colored pills — shows contrasts at a glance
- **Presence ranking**: horizontal bars sorted by strength — shows which parts dominate

## States & Edge Cases

- No parts: just the add button
- 1 part: no constellation, no overview
- Parts with no needs/triggers: show in list but not in overview
- Color assignment: auto-cycles through palette for new parts
- All data in localStorage

## Done When

- User can add, name, color, and describe inner parts
- Strength slider works with visual blocks
- Constellation renders with correct sizing
- Overview shows needs and presence ranking
- Data persists in localStorage
