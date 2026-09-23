import fs from 'node:fs';
const f = 'scripts/brain-read.ts';
let s = fs.readFileSync(f, 'utf8');

const start = s.indexOf('/**\n * What has gone quiet.');
const end = s.indexOf('async function main()');
if (start === -1 || end === -1) throw new Error('silence block anchors miss');

const replacement = `/**
 * What has gone quiet.
 *
 * The one thing a query sees that rereading cannot. Absence is invisible when
 * you scroll and obvious when you count, which is why
 * \`docs/specs/integrated-system.md\` names it as the reason the weekly session
 * is worth having at all.
 *
 * THIS REPORTS LESS THAN IT WANTS TO, AND SAYS SO.
 *
 * The first version asked which BRANCH had gone quiet, by reading a route off
 * \`day_events\`. That column does not exist — \`day_events\` carries a date, a
 * type and a payload, and nothing in this database records which part of a life
 * was worked in. The figure can colour a branch by how many surfaces it owns;
 * it cannot colour one by how recently it moved.
 *
 * That gap is the finding, not a reason to fake the answer. It is also exactly
 * what the missions work in \`integrated-system.md\` needs in order to show
 * "moving" and "stalled" — so it is named here rather than papered over.
 */
async function readSilence(): Promise<void> {
  const from = since();
  const db = getDb();
  const who = userId();

  const [lastNote] = await db
    .select({ createdAt: notebookEntries.createdAt, category: notebookEntries.category })
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, who))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(1);

  const [lastCheckIn] = await db
    .select({ createdAt: checkIns.createdAt })
    .from(checkIns)
    .where(eq(checkIns.userId, who))
    .orderBy(desc(checkIns.createdAt))
    .limit(1);

  const [lastMission] = await db
    .select({ createdAt: missions.createdAt, title: missions.title })
    .from(missions)
    .where(eq(missions.userId, who))
    .orderBy(desc(missions.createdAt))
    .limit(1);

  const recentNotes = await db
    .select({ category: notebookEntries.category, createdAt: notebookEntries.createdAt })
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, who), gte(notebookEntries.createdAt, from)))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(500);

  console.log(\`# what moved, and what did not — window opens \${day(from)}\n\`);

  const line = (label: string, at: Date | undefined) =>
    console.log(
      at
        ? \`\${label.padEnd(12)} \${day(at)} — \${daysAgo(at)} days ago\`
        : \`\${label.padEnd(12)} never\`,
    );

  line('Notebook', lastNote?.createdAt);
  line('Check-in', lastCheckIn?.createdAt);
  line('Mission', lastMission?.createdAt);

  /* Categories are what the notebook actually files by, so they are what can
   * honestly be counted. They are not branches and are not pretended to be. */
  const byCategory = new Map<string, Date>();
  for (const row of recentNotes) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, row.createdAt);
  }

  if (byCategory.size > 0) {
    console.log('\nNotebook categories touched in this window:');
    for (const [category, at] of byCategory) {
      console.log(\`  \${category.padEnd(20)} \${day(at)} — \${daysAgo(at)} days ago\`);
    }
  } else {
    console.log('\nNo notebook entries in this window at all.');
  }

  console.log(
    '\nWHAT THIS CANNOT TELL YOU: which branch went quiet. Nothing in this\n' +
      'database records which part of a life was worked in — day_events carries a\n' +
      'date, a type and a payload, and no route. Until missions land on the tree\n' +
      'and write their movement back, "Art has been silent for eleven days" is not\n' +
      'a sentence this script can honestly say.',
  );
}

`;

s = s.slice(0, start) + replacement + s.slice(end);

// dayEvents is no longer used.
s = s.replace(
  "import { checkIns, dayEvents, missions, notebookEntries } from '@/lib/db/schema';",
  "import { checkIns, missions, notebookEntries } from '@/lib/db/schema';",
);
s = s.replace(
  `import {
  type Branch,
  BRANCH_LABELS,
  BRANCHES,
  branchOf,
  CENTRE_ROUTES,
} from '@/lib/branches';
`,
  '',
);

fs.writeFileSync(f, s);
console.log('silence rewritten against the real schema');
