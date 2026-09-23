import { chromium } from '@playwright/test';

const targets = [
  { url: 'http://localhost:3000/education/world', sel: '[data-testid="geopolitics-world"]', name: 'hub' },
  { url: 'http://localhost:3000/education/world?page=epic-fury', sel: '[data-testid="page-reader"]', name: 'page-epic-fury' },
  { url: 'http://localhost:3000/education/world/intel', sel: '[data-testid="shipping-intel-dashboard"]', name: 'intel' },
  { url: 'http://localhost:3000/proposal/cma-cgm', sel: '[data-testid="cma-cgm-proposal"]', name: 'proposal' },
];

const browser = await chromium.launch();
for (const { url, sel, name } of targets) {
  for (const { vp, vpName } of [
    { vp: { width: 393, height: 852 }, vpName: 'phone' },
    { vp: { width: 1280, height: 900 }, vpName: 'desktop' },
  ]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator(sel).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.tmp/world-${name}-${vpName}.png`, fullPage: true });
    await ctx.close();
  }
  console.log('captured', name);
}
await browser.close();
