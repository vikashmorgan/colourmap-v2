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
- **Used in:** Liquid Butterflies (an Eclipse piece); Light Bodies, as its own kind (Burning Ring, Blue Corona, Blood Moon, `docs/specs/light-bodies.md`); later a Chill Machine mode where hits make the streaks.

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

## Where each look lives

| Look | Art (first) | Music (after) |
|---|---|---|
| Time slices | Liquid Butterflies | Chill Machine: each note adds a slice |
| Eclipse | Light Bodies · Eclipse; Liquid Butterflies · Eclipse | Chill Machine: hits make the glitch streaks |
| Crystal tunnel | Crystal Tunnel piece | TunnelSurfer / Chill Machine tunnel mode |
| Iridescent liquid | Butterfly wings; Light Bodies · Light Bubble | Chill Machine: the drop wobbles with each note |
| Digital deity | Light Bodies · Enlightenment | Centre of the Grid menu; dances to the Chill Machine |
