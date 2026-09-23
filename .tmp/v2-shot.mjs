import { chromium } from '@playwright/test';

const targets = [
  { url: 'http://localhost:3000/education/world', sel: '[data-testid="geopolitics-world"]', name: 'hub' },
  { url: 'http://localhost:3000/education/world?page=epic-fury', sel: '[data-testid="page-reader"]', name: 'page-epic-fury' },
  { url: 'http://localhost:3000/education/world/map', sel: '[data-testid="geopolitics-map"]', name: 'map' },
  { url: 'http://localhost:3000/education/world/graph', sel: '[data-testid="geopolitics-graph"]', name: 'graph' },
];

const browser = await chromium.launch();
for (const { url, sel, name } of targets) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator(sel).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `.tmp/world-v2-${name}-phone.png`, fullPage: true });
  await ctx.close();
  console.log('captured', name);
}
await browser.close();
