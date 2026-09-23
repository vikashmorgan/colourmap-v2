import fs from 'node:fs';
const f = 'components/BranchWheel.tsx';
let s = fs.readFileSync(f, 'utf8');

// The limb group becomes the control: focusable, labelled, keyboard-operable.
const oldOpen = `          <g
            key={branch}
            opacity={dimmed ? RECEDED : 1}
            style={{ transition: 'opacity 320ms ease' }}
          >`;
const newOpen = `          <g
            key={branch}
            role="button"
            tabIndex={0}
            aria-pressed={focused}
            aria-label={\`\${BRANCH_LABELS[branch]} — \${focused ? 'close' : 'open'}\`}
            onClick={() => setFocus(focused ? null : branch)}
            onKeyDown={(event) => {
              /*
               * An SVG shape with an onClick is invisible to a keyboard. These
               * are the app's primary orienting controls, so they answer to
               * Enter and Space like any other button.
               */
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFocus(focused ? null : branch);
              }
            }}
            opacity={dimmed ? RECEDED : 1}
            style={{ cursor: 'pointer', transition: 'opacity 320ms ease' }}
          >`;
if (!s.includes(oldOpen)) throw new Error('limb <g> anchor miss');
s = s.replace(oldOpen, newOpen);

// The separate transparent hit circle is now redundant.
const oldHit = `            {/* The whole limb is the control, so the hit area is generous. */}
            <circle
              cx={hub.x}
              cy={hub.y}
              r={22}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => setFocus(focused ? null : branch)}
            />

`;
if (!s.includes(oldHit)) throw new Error('hit circle anchor miss');
s = s.replace(oldHit, '');

// Less dead air around the drawing.
s = s.replace('const PAD = 62;', 'const PAD = 46;');
s = s.replace("style={{ display: 'block', maxHeight: '58vh' }}", "style={{ display: 'block', maxHeight: '52vh' }}");

fs.writeFileSync(f, s);
console.log('wheel: limb is now a real button, hit circle removed');
