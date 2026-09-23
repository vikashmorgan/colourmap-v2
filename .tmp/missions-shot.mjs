import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try { window.localStorage.setItem('colourmap:onboarded', 'true'); } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:3000/day', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Missions/i }).first().click();
await page.waitForTimeout(3500);
await page.screenshot({ path: '.tmp/missions-lane.png' });
console.log('captured');
console.log(errors.length ? `PAGE ERRORS: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
