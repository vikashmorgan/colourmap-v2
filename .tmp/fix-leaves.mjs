import fs from 'node:fs';
const f = 'components/LatticeTree.tsx';
let s = fs.readFileSync(f, 'utf8');

const old = `                  const tip = polar(
                    RINGS[2].radius,
                    angle + fan * spread * 0.92 + leafFan * spread * 0.2,
                  );`;
const neu = `                  /*
                   * THE LEAF FAN HAD TO OPEN MUCH WIDER HERE.
                   *
                   * ColourMesh fans its leaves across 0.2 of a sector, which
                   * works when a sector is a fifth of the circle and the labels
                   * are short interest names. This has three sectors, so a
                   * sector is 120°, and the labels are route names — "Figure
                   * stars trio" is seventeen characters. At 0.2 the plates
                   * landed on each other, and an opaque plate does not smudge
                   * what it covers, it deletes it.
                   */
                  const tip = polar(
                    RINGS[2].radius,
                    angle + fan * spread * 0.92 + leafFan * spread * 0.42,
                  );
                  /* Alternating the label side buys a second row of clearance. */
                  const lift = leafIndex % 2 === 0 ? -12 : 15;`;
if (!s.includes(old)) throw new Error('tip anchor miss');
s = s.replace(old, neu);

const oldPlate = `<Plate x={tip.x} y={tip.y - 12} text={leaf.label} muted size={9} />`;
if (!s.includes(oldPlate)) throw new Error('leaf plate anchor miss');
s = s.replace(oldPlate, `<Plate x={tip.x} y={tip.y + lift} text={leaf.label} muted size={9} />`);

fs.writeFileSync(f, s);
console.log('leaf fan widened and staggered');
