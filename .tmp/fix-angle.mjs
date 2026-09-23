import fs from 'node:fs';
const f = 'components/LatticeTree.tsx';
let s = fs.readFileSync(f, 'utf8');

const old = `  /** Even spacing: each branch owns one third of the circle, whatever its size. */
  const angleOf = (index: number) =>
    -Math.PI / 2 + ((Math.PI * 2) / Math.max(sectors.length, 1)) * index;`;

const neu = `  /**
   * Even spacing, offset by half a sector so nothing lands on twelve o'clock.
   *
   * The three ring names are stacked up the vertical axis, which is the only
   * place they can go and stay level. Starting the branches at -90° put Art
   * exactly on top of all three, and the opaque plates then hid the branch —
   * a label plate does not smudge what it lands on, it deletes it.
   *
   * ColourMesh never hit this because five sectors and three rings happen to
   * miss each other. Three sectors do not. Half a sector of rotation clears
   * the axis and costs nothing: the branches are still evenly spaced peers.
   */
  const sector = (Math.PI * 2) / Math.max(sectors.length, 1);
  const angleOf = (index: number) => -Math.PI / 2 + sector * index + sector / 2;`;

if (!s.includes(old)) throw new Error('angleOf anchor miss');
s = s.replace(old, neu);

// `sector` now shadows nothing, but the spread prop was computing the same value.
s = s.replace(
  'spread={(Math.PI * 2) / Math.max(sectors.length, 1)}',
  'spread={sector}',
);

fs.writeFileSync(f, s);
console.log('branches rotated off the vertical axis');
