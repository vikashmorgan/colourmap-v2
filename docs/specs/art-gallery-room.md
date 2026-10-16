# The gallery room (AI Sculptures · Flow)

**Status:** Active
**Date:** 2026-10-16
**Where:** `/art/flow/gallery` (from the Flow collection page: "Walk the gallery in 3D") · `components/GalleryRoom.tsx` · `lib/art/gallery-room.ts`. Public twin: vikashmorganart.vercel.app (repo `vikashmorgan/vikashmorganart`).

## Purpose

The collection's final mission: a real 3D art gallery that visitors walk through, with the sculptures in different materials (asked for 2026-10-16: "build the 3D room for me", "put it in vikashmorganart.vercel.app").

## What it holds

- A long hall. The collection's pictures hang in frames on both long walls; sculptures stand on plinths down the middle, slowly turning under spotlights.
- Five sculptures of the collection's themes until the real 3D models arrive: Flow (bronze), Total fracture (glass shards, a figure curled in a ball), Wave (marble), Ascension (gold), Lotus (marble). Tap one to change its material: marble, bronze, gold, glass.
- Three empty plinths: drop a `.glb` (from Tripo or Meshy) on the page and it stands on the next one, scaled and centred, in marble (or its own colours). For this visit only.
- Three moods: white cube, golden temple (gold walls, marble columns and floor), dark space of light (black, motes of light).
- Walk with W A S D or the arrows, drag to look, wheel to glide; on a phone, drag and hold the arrows. Tap a picture to see it large.

## How the pictures show

In Colour Brain the pictures are the owner's private Drive thumbnails. Drive gives a WebGL canvas no access to them, so they are real `<img>` elements placed by a CSS3D layer *behind* a transparent canvas; the canvas cuts a window where each frame hangs, so the picture shows through and sculptures in front still hide it. They load only for a browser signed in to the owner's Google account.

The public site uses the same component with the pictures copied into the site (`src/art/`), with the owner's go-ahead (2026-10-16), so everyone sees them.
