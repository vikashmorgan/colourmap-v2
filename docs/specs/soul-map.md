# Soul Map

> Topographic terrain visualization of your inner world — clickable territories that reveal and collect your data.

## Context

Check-ins, life scan answers, and FGAC entries accumulate as raw data. The soul map transforms this data into a visual landscape — a cartography of who you are right now.

## Behavior

- SVG visualization with 8 territories as colored concentric circles
- Each territory has 3 color tones (light outer → mid → dark inner) with contour rings
- Territory size and opacity scale with data intensity (more data = more vivid)
- Click a territory to open a detail panel below the map
- Detail panel shows: territory name, guiding question, input field
- Enter to add items directly (saves to life scan answers)
- Chapter name at bottom, archetype at top (subtle)

## Territories

| Territory | Color Family | Data Source | Guiding Question |
|-----------|-------------|-------------|-----------------|
| Emotions | Purple | Check-in slider average + recent words | What are you feeling? |
| Strengths | Forest green | Life scan strengths list | What strength to develop? |
| Fears | Red | Life scan fears list + FGAC fear count | What are you afraid of? |
| Vision | Teal | Life scan vision text | Where are you heading? |
| Energy | Orange | Life scan energy list | What gives you energy? |
| Body | Terracotta | Pulse body average | How does your body feel? |
| Shadows | Slate blue | FGAC avoidance + confusion counts | What are you avoiding? |
| Gratitude | Bright green | FGAC gratitude count | What are you grateful for? |

## States & Edge Cases

- No data: territories appear faded with placeholder text
- Clicking empty territory: shows input with "Name them to map them" style prompts
- Items added via territory input save to life_scan_answers API
- Vision territory replaces value (not appends) since it's a single text

## Done When

- 8 territories render with correct data-driven intensity
- Click any territory to open detail panel with input
- Items save to database via life scan answers API
- Map updates when underlying data changes
