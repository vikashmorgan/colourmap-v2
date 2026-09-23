import { chromium } from '@playwright/test';

const browser = await chromium.launch();
for (const { name, viewport } of [
  { name: 'phone', viewport: { width: 393, height: 852 } },
  { name: 'desktop', viewport: { width: 1280, height: 900 } },
]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/education/world', { waitUntil: 'networkidle' });
  await page.locator('[data-testid="geopolitics-world"]').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `.tmp/world-hub-${name}.png`, fullPage: true });

  await page.locator('[data-testid="open-program-hormuz-briefing"]').click();
  await page.locator('[data-testid="page-reader"]').waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `.tmp/world-page-${name}.png`, fullPage: true });

  // Step through the chapter
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-testid="next-page"]').click();
    await page.waitForTimeout(80);
  }
  await page.screenshot({ path: `.tmp/world-page3-${name}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('done');
