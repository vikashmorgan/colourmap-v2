import { chromium } from '@playwright/test';

const cases = [
  { name: 'phone', viewport: { width: 393, height: 852 }, dsf: 2 },
  { name: 'desktop', viewport: { width: 1280, height: 900 }, dsf: 1 },
];

const browser = await chromium.launch();
for (const { name, viewport, dsf } of cases) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/proportion-buddy', { waitUntil: 'networkidle' });
  const stage = page.locator('[data-testid="proportion-stage"]');
  await stage.waitFor();
  await page.waitForTimeout(400);
  await stage.screenshot({ path: `.tmp/proportion-squares-${name}.png` });

  // Also dump pxPerCm + first/last X grid line positions for verification
  const info = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="proportion-stage"]');
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const xLines = [...stage.querySelectorAll('[data-x-grid-line]')].map((el) => ({
      cm: Number(el.getAttribute('data-x-grid-cm')),
      left: (el).getBoundingClientRect().left - rect.left,
    }));
    return { stageWidth: rect.width, stageHeight: rect.height, xLines };
  });
  console.log(name, JSON.stringify(info, null, 2));
  await ctx.close();
}
await browser.close();
