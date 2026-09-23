import fs from 'node:fs';

// 1. Mount the dock app-wide, after the existing bottom nav.
const shellPath = 'app/(app)/AppShell.tsx';
let shell = fs.readFileSync(shellPath, 'utf8');
const navBlock = `      {/* Bottom nav — shown when navPosition='bottom' */}`;
if (!shell.includes(navBlock)) throw new Error('AppShell anchor miss');
shell = shell.replace(
  navBlock,
  `      {/*
        The index of the whole, present on every surface. It is furniture
        rather than a feature — see components/BrainDock.tsx.
      */}
      <BrainDock />

${navBlock}`,
);
shell = shell.replace(
  "import { ErrorBoundary }",
  "import BrainDock from '@/components/BrainDock';\nimport { ErrorBoundary }",
);
fs.writeFileSync(shellPath, shell);
console.log('dock mounted:', shell.includes('<BrainDock />'));
console.log('import added:', shell.includes("import BrainDock"));

// 2. The figure is no longer a block on /day — it lives in the dock.
const dayPath = 'app/(app)/day/page.tsx';
let day = fs.readFileSync(dayPath, 'utf8');
const block = `      {/* The index of the whole, before the day it opens onto. */}\n      <BranchTree />\n`;
if (!day.includes(block)) throw new Error('day anchor miss');
day = day.replace(block, '');
day = day.replace("import BranchTree from '@/components/BranchTree';\n", '');
fs.writeFileSync(dayPath, day);
console.log('day cleaned:', !day.includes('BranchTree'));
