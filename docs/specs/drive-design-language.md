# Drive: the design language

So every screen of the racing game feels like one game, not nine experiments (2026-11-21:
"overall coherence … awesome menus"). Applies to the menus, the race intro, the HUD and the
results. The rest of the app keeps `rules/design.md`; this is the game's own layer on top.

## Space

- The game is a dark, deep space. Menus float over it; nothing is a flat page.
- Depth comes from a sheet lifted over the scene with a soft shadow (the notepad's lifted shadow),
  and from the scene behind blurring a little when a menu opens over it.

## Colour

- Each track owns one colour (`TRACKS[id].colour`, lib/art/track-registry.ts). It is the track's
  screen frame in the ring, its map line, its HUD accent and its results header. Nothing else
  takes a track's colour.
- Everything else is warm neutrals: near-black backgrounds, warm white text at 85–92% opacity,
  secondary text at 55%.
- Gold is the game's own accent (records, first place, the selected item) on every track.
- Never blue for notebooks or panels (the app's rule); neon only in the Neon District.

## Type

- The app's display serif for names (track names, titles, results), large and spaced.
- A narrow monospace for numbers (speed, times, places), tabular figures so they never jump.
- Two sizes per screen at most besides the numbers.

## Motion

- Slow, eased, never flashing (the mellow rule): 300–600 ms for menus, 2–4 s for the scenery.
- Things draw themselves: a map line draws from the start gate round the track; a name fades in
  letter by letter at most once.
- Light breathes (a slow pulse, 1.5–3 s) rather than blinks.
- The race intro may be skipped at any moment with any key or a click.

## Quiet

- Few counts, badges or pills. Secondary things sit behind a small +.
- One primary action per screen, named in plain words ("Race", "Click to start").
- Keyboard first (arrows, Enter, Esc), touch and mouse equal.

## Sound (when it comes)

- Menu moves: a soft low tick. Selection: a warm swell. Countdown: three low tones, a higher GO.
