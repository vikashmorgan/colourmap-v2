import fs from 'node:fs';
const f = 'components/LatticeTree.tsx';
let s = fs.readFileSync(f, 'utf8');

const old = `  /** Past the outermost ring, where nothing else is drawn. */
  const outer = polar(RINGS[2].radius + 26, angle);`;
const neu = `  /*
   * Past the outermost ring, where nothing else is drawn — except once the
   * branch opens, when its own leaf labels arrive at exactly that radius. So
   * the name steps further out when expanded rather than fighting them.
   */
  const outer = polar(RINGS[2].radius + (expanded ? 52 : 26), angle);`;
if (!s.includes(old)) throw new Error('outer anchor miss');
s = s.replace(old, neu);
fs.writeFileSync(f, s);
console.log('branch name steps clear when open');
