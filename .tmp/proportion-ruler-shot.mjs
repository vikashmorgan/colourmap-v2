import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/proportion-buddy', { waitUntil: 'networkidle' });
const stage = page.locator('[data-testid="proportion-stage"]');
await stage.waitFor();
await page.waitForTimeout(300);

await page.getByRole('button', { name: 'Ruler' }).click();
const stageBox = await stage.boundingBox();
const startX = stageBox.x + stageBox.width / 2;
const startY = stageBox.y + stageBox.height * 0.28;
const endX = stageBox.x + stageBox.width / 2 + 60;
const endY = stageBox.y + stageBox.height * 0.6;

await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(endX, endY, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);

const readout = await page.locator('[data-testid="ruler-readout"]').textContent();
console.log('readout:', readout);
await stage.screenshot({ path: '.tmp/proportion-ruler-phone.png' });
await browser.close();
