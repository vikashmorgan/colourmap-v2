# The gallery room (AI Sculptures · Flow)

**Status:** Active
**Date:** 2026-10-16
**Where:** `/art/flow/gallery` (from the Flow collection page: "Walk the gallery in 3D") · `components/GalleryRoom.tsx` · `lib/art/gallery-room.ts`. Public twin: vikashmorganart.vercel.app (repo `vikashmorgan/vikashmorganart`).

## Purpose

The collection's final mission: a real 3D art gallery that visitors walk through, with the sculptures in different materials (asked for 2026-10-16: "build the 3D room for me", "put it in vikashmorganart.vercel.app").

## What it holds

Three rooms joined by doorways (the owner's vision, 2026-10-16: "one room for projections; one room, the corridor with 7 sculptures; one room a circle room with the 24 sculptures disposed in a circle"):

- **The corridor:** the collection's pictures on both walls, and the seven gold circle sculptures (Orbit, Spiral, Cascade, Gyroscope, Chain, Bloom, Infinity) down the middle, some with rings spinning on their own axis.
- **The circle room:** truly round (radius 13 m, wider than the corridor), with twenty-four ring sculptures in a circle. They come from ten families of shape, each drawn from a seed, so all differ: mostly gold, some bronze, some glass. A gold ring is inlaid in the floor. In the centre, the plinth where a dropped `.glb` (Tripo, Meshy) stands for the visit.
- **The projection room:** unlit black, with three walls projecting the Geometry Builder live (`artprojection.vercel.app/?preset=…&display=1`): Liquid Quantum, Quantum Chaos, Liquid Chaos, Music Liquid Chaos, the Magnetic Sands, Star Sand Lines, Starflow Galaxy, Liquid Pearl. Tap a screen for the next program. The projections load only while you are near the room.
- Tap a sculpture to change its material (marble, bronze, gold, glass). Three moods: white cube, golden temple, dark space of light.
- Walk with W A S D or the arrows and drag to look; on a phone, drag and hold the arrows. Walls slide you along rather than stop you. Buttons jump between rooms; `?at=circles` and `?at=projections` open at a room's door.
- Seven broad spotlights in all, and a capped pixel ratio on phones, so it stays smooth.

## How the pictures show

In Colour Brain the pictures are the owner's private Drive thumbnails. Drive gives a WebGL canvas no access to them, so they are real `<img>` elements placed by a CSS3D layer *behind* a transparent canvas; the canvas cuts a window where each frame hangs, so the picture shows through and sculptures in front still hide it. They load only for a browser signed in to the owner's Google account.

The public site uses the same component with the pictures copied into the site (`src/art/`), with the owner's go-ahead (2026-10-16), so everyone sees them.
