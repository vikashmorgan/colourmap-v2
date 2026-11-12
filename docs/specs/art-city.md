# City — the future city's chapter

**Status:** Building
**Date:** 2026-11-12
**Where:** `/geometry-field/city`, the **City** pill after Ocean ·
`lib/city.ts` · `components/City.tsx` · the shared trip player
(`components/TripPlayer.tsx`)

## Why

> 2026-11-12: "basically the cells looked like a future city with spaceships
> travelling. work on creating that future city. as vegetal. ocean and city
> after that. in there u can create different components one by one. long
> term aim will be to create that future neon city that we fly through on a
> spaceship. kind of star wars city with spaceships."

The Vegetal chapter's **Cell** (a block of box-edged cells with pulses
travelling between them) read as a city with ships. City is the third chapter
after Vegetal ([art-vegetal.md](art-vegetal.md)) and Ocean
([art-ocean.md](art-ocean.md)), built the same way: one trip in numbered
pieces, each a formula from a grain and the time to a place and a colour,
the same grain budget, the name pills picking any piece.

The film mentioned is a mood reference only: no names, ship designs, planets
or anything recognisable from it. The ships are our own arrowheads; the
words are our own.

Neon is the point, so City leaves Vegetal's gold for cyan, magenta and amber
over a violet night. Colours drift slowly from one to the next (about a
minute each), never flash, as the user prefers.

## The seven pieces

| # | Piece | What you see | Camera |
|---|-------|--------------|--------|
| 1 | Towers | Twenty-five towers on a five-by-five grid of blocks, taller toward the middle, rise floor by floor from the ground, the middle first. Each is the Cell's box stacked: its four corners and a ring at every floor, the rim being built glowing warm. Windows on every face, two rows a floor, warm or cool, now and then one going out or coming on over seconds. Block outlines on the ground, stars overhead | Slowly round the city, above its roofs |
| 2 | Sky lanes | The grown city, dimmer; ships, each a bright head and a short fading trail, stream along lanes in the streets at four heights, crossing grids, both ways in every street: white lights one way, red the other | Round the city, at the height of the lanes |
| 3 | Neon | Each tower wears bands of neon (two to four ribbons), a tall blade sign of glowing dots on some, a spire with a slow beacon on all; coloured light pools on the street; a few ships. Every light drifts slowly round cyan, magenta, amber and violet, each tower on its own beat | Lower and closer, looking up |
| 4 | Chinatown | A red gate (four pillars, two beams, three roofs turned up at the ends, a plaque reading 中華街, Chinatown) at the mouth of a narrow street. Tall signs hang down the street side of the towers, standing out into the street, in real Chinese and Japanese characters: ラーメン ramen, 茶 tea, 龍 dragon, 酒 wine, 夢 dream, 麺 noodles, 福 good fortune, 喫茶 café; a 夜市 night-market banner across the street and a small 喫茶 sign over a doorway. Lantern red and gold mixed with cyan and magenta. Rows of round red lanterns strung across the street, swaying a little | Walking pace through the gate and down the street |
| 5 | Bridges and docks | Sky bridges (tubes of four edges and ribs, lights along the floor) join neighbouring towers high above the street; landing platforms stand out from the faces of the taller towers, lights chasing slowly round their rims. Ships come in on a curve, settle on a deck, rest, lift off and leave the other way | Round the city, from above the bridges |
| 6 | Canyon | Flying down the middle of an endless street: towers either side (only the faces the street sees are drawn, so every grain shows), feet below the eye and roofs above it; traffic in four lanes above and four below, coming on the left, going on the right; every third tower carries a tall Chinatown sign, flown past. Towers and ships that pass behind come round to the far end, so the street never ends and no grain is added | Down the middle of the street |
| 7 | Ship | A game, keys only, as the Shark Sim: you pilot a small ship (a flat arrowhead, a raised spine, two cyan engines streaming light) down an endless avenue of solid, lit towers, with side streets to turn into; every eight blocks the avenue passes through a Chinatown stretch (see **Ship, round two**). **A** / **D** turn (the ship banks into the turn), **W** / **S** climb and dive, **E** or Shift faster, **Q** or X slower, **Space** boosts to three times the cruise while the bar lasts; the bar fills again while you cruise. Towers' walls hold you: you slide along them. Traffic above and below you. Two dials read height and speed. With no one at the controls (the Journey, or before you steer) the ship flies down the avenue; let go with Esc and it carries on from where you were, back to the avenue | Behind the ship and a little above, looking past it |

The page opens on one piece alone, picked by name, as Ocean's do: it starts
at its beginning with no ball of stars and loops, each grain gliding back to
where the piece began; the canyon and the ship fly on, so their loops do not show.
**Journey** plays the seven as one trip: between pieces a ball of faint
stars.

Backgrounds: **Violet night** (the default, darkening downward), **Black**,
**Deep night**, **Dusk**; remembered on the device.

## Chinatown

> 2026-11-12: "add chinese signs on side of buildings. or japanese. like that
> cyberpunk asian mood. so we can create a chinatown in the city."

The characters are real: rasterised once at 16 × 16 from the MS Gothic font
and kept in `lib/city.ts` as bits, so they read the same in tests, on the
server and in the browser, with no canvas. Every grain of a sign falls on a
lit pixel of its characters (or on its thin frame). In a vertical sign the
long vowel mark ー stands upright, as it is written down a page. Only common,
kind shop and street words, each meaning listed beside the table in the code.

## Ship, round two

> 2026-11-12: "solid tower walls while you fly the ship, since they still look like sparse lines of
> light. After that would come the ship flying down the canyon past Chinatown, which is the start
> of the full fly-through." ("work on it.")

**The city.** An endless grid of blocks with a tower on each. A wide avenue (18 across) runs on
forward down the middle, with narrower streets beside it and side streets across, at least six
wide, so you can turn into any of them. Three blocks in every eight, the avenue is **Chinatown**:

- a red gate at each end (the Chinatown piece's gate made larger, with 中華街 on its plaque, tall
  enough to fly under its beams);
- tall signs hanging down the walls in real characters (from the same glyph bitmaps), standing
  out over the avenue and facing down it so you read them as you come;
- ten strings of red lanterns across the avenue, over the ship's head;
- a 夜市 banner across the middle.

Chinatown's towers are lower and lit warm, with red and gold bands. After it come neon towers
again.

**Solid walls.** The grain budget stays fixed, but it now goes only where the eye can see. Every
frame the city becomes a list of light sites, taken only from:

- towers in front of the eye and within sight (160);
- the faces turned toward the eye;
- faces that other towers don't hide (each site is checked when a face is partly hidden).

Each face has a dense grid of windows (lit warm or cool, now and then one going out or coming on
over seconds), clearly drawn corners and roof edge, floor lines, neon bands and a faint fill.
Nearer sites are kept more densely than far ones. Far light dims and leans violet, gone by 160.
Grains closer than about ten to the eye fade out, so they never show as big soft dots. The
player draws every grain the same size (one size for the whole cloud) and lets a piece set only
its colour, so fading is the only way to tame them. The pool of grains is dealt out to the
sites, and the rest wait unlit. This is the Canyon's recycling made general: towers that fall
behind give their grains to the ones ahead. A site keeps its grain from frame to frame, and sites
come and go by fading, never popping.

**Flight.** With no one steering, the autopilot flies down the middle of the avenue, weaving a
little. It dips low (8 over the street) through each Chinatown, under the gate's beam and the
lanterns, and rises again among the neon towers. If you let go, it carries on from where you
were: it follows the street you're in, turns back toward the avenue at the next crossing, then
heads on down it. Traffic streams above and below you along the avenue and the nearby streets,
both ways. The avenue's low lanes go quiet through Chinatown. Like the canyon, the ship flies on
with no loop. In the Journey its route passes near the middle of the city, so the grains pour in
and out over a short distance.

**Acceptance (round two)**

- Walls: faces within 40 of the eye carry at least three times the grains per area of faces 80 or
  more away. No lit grain is behind the eye or beyond 160 (apart from the star dome), and the
  pool never asks for more grains than the player draws.
- The autopilot's route never enters a tower, stays at least two inside the avenue's walls and
  heads down it. It passes a Chinatown stretch about every half minute, and through each one it
  flies under 12 (below the gate's beam).
- Passing a Chinatown sign, most of its characters' pixels are alight, so it reads. Red lanterns
  hang over the avenue above the eye.
- D at a crossing turns you into the side street. Letting go never jumps the ship, and within 40
  seconds the autopilot is back on the avenue heading down it, never inside a tower on the way.
- Colours drift and flicker as elsewhere (signs never more than 0.02 a frame); nothing flashes.
- Frame cost, 9000 grains: Ship 5.4 ms (it was 6.5 ms before this round), against 2.5–4.2 ms for the
  other pieces (bench on the build machine, bun).

## Game · Studio, and the phone

(2026-11-12; the shared player, [art-journey.md](art-journey.md#design-menu-game--studio-phone-controls-2026-11-12).)
Every control sits in the **Design** menu. The Ship is the **Game** side, every other piece the
**Studio** (found by `game.has`, so new pieces join the Studio on their own); the page reopens
on the side last used. On a phone the Ship has a stick (turn, climb, dive) and a round
**Boost** button (Space).

## Words

Each piece has a line saying what you see and two lines of its own on cities,
light and travel: a city built one floor at a time; lights making one slow
river; light as how a city speaks after dark; smaller cities kept inside a
city; a bridge as a promise, a dock as somewhere to arrive and leave; the sky
between walls becoming a road; a window waiting for you somewhere.

## Acceptance

- `/geometry-field/city` opens on Towers alone, looping; the name pills pick any piece, which starts
  with no ball of stars; Space pauses (in Ship, Space boosts while you steer).
- The pills read Stars · Geometry · Tunnels · Oils · Big Bang · Journey · Vegetal · Ocean · City ·
  Experiment, on the Art panel and the trip pages.
- **Journey** plays the seven pieces as one trip and loops; each piece opens as a wide ball of faint
  stars and every grain pours into the next piece with no cut.
- Towers rise from the ground, the middle first; no grain goes below the ground.
- No ship in the sky lanes is ever inside a tower; lanes run both ways at four heights.
- Neon colours never jump: a frame apart, a light's colour moves by under a hundredth.
- Chinatown (2026-11-12: "add chinese signs on side of buildings. or japanese. like that cyberpunk
  asian mood. so we can create a chinatown in the city."): tall signs hang on the towers' street
  walls, inside each tower's length and below its roof; every glyph grain lands on a lit pixel of a
  real character; signs flicker very gently (never more than 0.02 a frame, never below 0.45), with a
  soft dip now and then; red lanterns hang across the street inside its walls; a gate with 中華街
  stands at its mouth. Some signs show in the Canyon and the Ship too.
- Ships rest on a dock's deck a while, still, between arriving and leaving.
- In the Canyon every tower grain stays within the stretch of street round the eye however far it
  has flown; ships pass above and below the eye, both ways.
- Ship: it takes over from the autopilot where it is; A turns left and D right; W climbs, S dives;
  E speeds up, Q slows; Space boosts until the bar runs dry, then the pace falls back, and cruising
  fills the bar again; it never flies into a tower, through the ground or past the sky; two dials
  read height and speed.
- The same moment always gives the same picture.
- No new dependencies.

## Next components

For the long-term fly-through of a future neon city:

1. **Free flight in the canyon:** begun in Ship, round two (the avenue, side streets, Chinatown);
   still to come: traffic you weave through, and near misses that ruffle the trail.
2. **Districts:** the field of towers in kinds (Chinatown, a harbour of docks, a tall business
   heart, a market under bridges), flown from one into the next.
3. **Layers of the city:** a dim undercity of pipes and steam below the street, the lit middle, and
   gardens on the roofs high above.
4. **Traffic that turns:** ships changing lanes and turning at crossings, the Cell's pulses again,
   and a landing you can make on a dock.
5. **Weather:** slow rain streaks that catch the neon, mist that softens the far towers.
6. **Signs that speak:** more words, and signs the user writes, rasterised the same way.
7. **Arrival:** a sky-port at the edge of the city where the flight begins and ends.
