# Visual References

> Martin (2026-10-25): "save these refs in spec. for all the art or music (art always the core then we can test it and pass it to music.)"

The references Martin has pinned for the generative art, with what each one teaches and how close a live shader can get. They are here to learn the technique and the feel from, never to copy a piece.

## The rule: art first, then music

1. A look is built and tuned in the **Art section** first, as a still or slow piece with sliders and Save PNG.
2. Once it holds up there, it is **passed to music**: it becomes a visual mode in the Chill Machine (chillmachine.vercel.app), where notes and pads drive the same settings.
3. Art never waits on music, and music only gets looks that have already been tested as art.

## The references

### 1. Time slices: heat-map form cut into moments
- Pins: https://i.pinimg.com/1200x/dc/41/55/dc415553ee15894be905dc812913354d.jpg · https://ch.pinterest.com/pin/903394006499654024/ · https://ch.pinterest.com/pin/431641945554251939/ (credited to Martin Naumann)
- **What it is:** a soft glowing blob coloured like a thermal camera (blue core, dark rim, red, orange, yellow glow), cut into vertical strips. Each strip shows the form a moment later and a little bigger, so one shape grows across the picture like frames of a sound wave.
- **Technique:** a signed distance field coloured through a six-stop ramp, with x mapped to a strip index and each strip mapped to a moment in time. Strips melt at the edges.
- **Reach:** fully, in real time (WebGL 1).
- **Used in:** Liquid Butterflies (slices and echoes).

### 2. Eclipse: a void with a burning ring
- Pin: https://ch.pinterest.com/pin/33706697181656318/
- **What it is:** a black disc inside a painted ring of fire (orange, yellow, red, a touch of cyan), vertical glitch streaks through the middle, and sparks drifting off. Flat dark background.
- **Technique:** the ring is a distance band broken up by noise to look brush-painted. The streaks are columns of noise stretched along y, cut by a hash per column. The sparks are hashed points with twinkle.
- **Reach:** very close, in real time.
- **Used in:** Liquid Butterflies (an Eclipse piece); Light Bodies, as its own kind (Burning Ring, Blue Corona, Blood Moon, `docs/specs/light-bodies.md`); later a Chill Machine mode where hits make the flares. The glitch streaks were taken out of every new visual on 2026-10-26 ("not needed").

### 3. Crystal tunnel: prismatic realism
- Pin: https://pin.it/2bJmQxDj1 (https://ch.pinterest.com/pin/642255596905055646/), a video
- **What it is:** flying through a tunnel of clear crystal shards toward a white-gold burst. Rainbow dispersion on every edge, bokeh sparkles, motion blur outward.
- **Technique:** raymarched shards (folded, repeated prisms) in a tunnel; refraction with a separate index per colour channel for the rainbow split (chromatic dispersion); radial blur from the centre; additive bokeh points.
- **Reach:** about 80% live. The shards, rainbow edges, sparkle and motion are all achievable on a laptop GPU. Full path-traced glass (light bouncing inside every crystal) needs an offline render in Blender. For the gallery or prints: live in the browser, final frames rendered offline.
- **Used in:** a future Crystal Tunnel piece; a natural partner for TunnelSurfer.

### 4. Iridescent liquid: material realism
- Pin: https://ch.pinterest.com/pin/406238828904271623/ (by @marcodelmart), a video
- **What it is:** a single wobbling drop of liquid glass on a pale background. Its surface shifts pink, violet, green and cyan like a soap film or oil, with sharp highlights on the edge.
- **Technique:** a raymarched blob whose surface is moved by slow noise. Colour comes from thin-film interference: the hue depends on the viewing angle and a varying film thickness. Fresnel makes the edges bright. A soft environment is reflected and refracted.
- **Reach:** very close, in real time. This is the most achievable kind of "realism": one object, no scene.
- **Used in:** the Liquid Butterflies' wing material (iridescent, liquid); Light Bodies, as the Light Bubble (Opal Bubble, Night Bubble); later Chill Machine pads (a drop that wobbles with each note).

### 5. Digital deity: a god between imagination, digital and light
- Pin: https://i.pinimg.com/1200x/4b/d8/cf/4bd8cf90fc3724161c773a9b663d4475.jpg
- Martin: "a symbol of divine energy with many arms. who over time will be dancing meditating. praying and animated. with numbers and text around. like a god between imagination digital. and light." It could become **the centre of the Grid menu**, but it is developed in Art first.
- **What it is:** a floating human figure made of fine gold filament lines, with six arms, a blinding white light at the heart and crown, a vertical beam, halo rings and sacred-geometry circles behind, and handwritten equations, diagrams and numbers orbiting around. Black background.
- **Technique:** a 3D figure drawn as glowing wire filaments: the mesh edges plus flowing lines along the muscles, additive gold, with bloom. Extra arm pairs are duplicated from the shoulders and offset in pose. The heart and crown lights are bloom points with a lens streak. Halo rings and geometry are thin animated circles. The numbers and equations are text sprites on slow orbits that fade in and out. The poses (meditating, praying, dancing) come from rigged animations (Mixamo), blended over time.
- **Reach:** close, in real time with three.js. The existing figure work (`/figures`, `/figure-stars`, the Golden God OBJ, the Mixamo pipeline) is the base.
- **Used in:** Light Bodies, as Enlightenment (Enlightenment, Night Prayer, Dance of Light): a first 2D version drawn by a shader, with poses blended from arm positions. The 3D figure on the Mixamo rig is still to come. Later, the animated centre of the Grid and the quick-menu wheel. Later still, in the Chill Machine, it moves with the music.

### 6. Eclipse, evolved: jets above and below, rays like a pulse
- Pins: https://ch.pinterest.com/pin/304274518610934855/ · https://ch.pinterest.com/pin/525091637780744504/ (a hand-painted eclipse: a black disc on navy, a white-gold rim and sharp spikes of light of every length, "Eclipse Tattoo")
- Martin (2026-10-26): "add the burning ring to the music slider options. keeping the circle stable. but also do another mode for burning ring where the fire pulses out above and below … how the eclipse should evolve to grow with vertical and lower exit of the energy … or in this last one where energy goes out in rayons like a pulse. different types for this eclipse preset"
- **Technique:** the ring stays a still distance band. The jets are a column of fire along the vertical axis: they widen with distance, are flickered by noise travelling outward, and their length beats. The rays are 28 angular cells, each with a thin tapering spike whose length grows and fades on its own clock, so the light leaves in pulses.
- **Used in:** Light Bodies, as the eclipse's Style (Ring, Jets, Rays): Twin Jets and Sun Rays. Chill Machine: the Burning Ring mode.

### 7. Psychedelic circle
- Pin: https://ch.pinterest.com/pin/304274518610934924/
- Martin: "1 is this psychedelic circle. it can be with similar tools as butterfly but another mode overall."
- **Used in:** Liquid Butterflies, design **Circle** (a breathing disc with the butterfly's tools: echoes, slices, pool, iris): the Psychedelic Circle piece.

### 8. Sacred geometry of colour
- Pin: https://ch.pinterest.com/pin/304274518610934917/
- Martin: "2 is this sacred geometry of colour. we will also use it for music geometry stuff. develop it as well."
- **Used in:** Liquid Butterflies, design **Sacred** (the flower of life in lines of light, slowly turning): the Sacred Geometry piece. Later it becomes a music-geometry mode in the Chill Machine, where each note lights a circle.

### 9. Digital mountains
- Pin: https://ch.pinterest.com/pin/304274518610934875/
- **Used in:** Liquid Butterflies, design **Digital** (the ridge drawn as an outline with strata lines rising like a scan): the Digital Peaks piece.

### 10. Flying island, volcano
- Pins: https://ch.pinterest.com/pin/304274518610934940/ · https://ch.pinterest.com/pin/304274518610934941/
- **Used in:** Liquid Butterflies, design **Island** (a rock hanging in the air with a volcano on it, lava rising, small stones drifting): the Floating Island piece. Also the Volcano design and piece.

### 11. More butterflies and their kin
- Pins: https://ch.pinterest.com/pin/304274518609138677/ · https://ch.pinterest.com/pin/304274518610064603/
- Martin: "extra inspiration for the butterfly and similar category alternatives."
- **Used in:** reference for future Liquid Butterflies and Liquid Forms pieces.

### 12. Round psychedelic colour shapes (Martin's screenshots)
- Files on Martin's machine: `C:\Users\victor\Pictures\Screenshots\Screenshot 2026-10-26 220104.png`, `220119.png`, `220133.png` and `220442.png`.
- Martin: "just took a bunch of screenshots to develop a butterfly type of visual. but a different preset of it" · "check em. round psych colourshapes."
- **What they are:**
  1. A butterfly-like fan of petals, with a teardrop and two round lower wings, inside a round lens.
  2. A diamond cut into vertical strips, each a moment later.
  3. Nested doorways receding into a disc.
  - These first three share a heat-map palette: navy-black cores, red, orange and peach, rainbow fringes along every edge, on a dark grainy warm-brown ground.
  4. A pastel painted orb: pink and lavender clouds in a thin iridescent rim, a horizon line with the lower half mirrored, and four-point star glints on the rim.
- **Used in:** Liquid Butterflies designs **Lens**, **Diamond**, **Portal** and **Orb**, with the pieces Lens Butterfly, Sliced Diamond, Portal and Dream Orb, and the new Lens and Dream palettes.

> **Note (2026-10-26):** pins 7–11 (the 3042745186… ones) are not public; Pinterest returns "Not found" without a sign-in, so they were built from Martin's words. Direct image links (i.pinimg.com/…) or screenshots would let the pieces match them more closely.

## Where each look lives

| Look | Art (first) | Music (after) |
|---|---|---|
| Time slices | Liquid Butterflies | Chill Machine: each note adds a slice |
| Eclipse | Light Bodies · Eclipse; Liquid Butterflies · Eclipse | Chill Machine: hits make the flares |
| Crystal tunnel | Crystal Tunnel piece | TunnelSurfer / Chill Machine tunnel mode |
| Iridescent liquid | Butterfly wings; Light Bodies · Light Bubble | Chill Machine: the drop wobbles with each note |
| Digital deity | Light Bodies · Enlightenment | Centre of the Grid menu; dances to the Chill Machine |
| Eclipse jets and rays | Light Bodies · Twin Jets, Sun Rays | Chill Machine · Burning Ring (Ring, Jets, Rays) |
| Psychedelic circle | Liquid Forms · Psychedelic Circle | Chill Machine · Butterflies, design Circle |
| Sacred geometry | Liquid Forms · Sacred Geometry | Chill Machine: music geometry (next) |
| Digital mountains, floating island | Liquid Forms · Digital Peaks, Floating Island, Volcano | Chill Machine · Butterflies, designs |
