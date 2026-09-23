import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('console', (msg) => console.log(`CONSOLE[${msg.type()}]:`, msg.text()));
await page.goto('http://localhost:3000/proportion-buddy', { waitUntil: 'networkidle' });
const stage = page.locator('[data-testid="proportion-stage"]');
await stage.waitFor();
await page.waitForTimeout(300);

await page.getByRole('button', { name: 'Ruler' }).click();
console.log('clicked ruler');

const hintCount = await page.getByText(/Click & drag to measure/i).count();
console.log('hint count:', hintCount);

const stageBox = await stage.boundingBox();
console.log('stageBox:', stageBox);
const startX = stageBox.x + stageBox.width / 2;
const startY = stageBox.y + stageBox.height * 0.28;
const endX = stageBox.x + stageBox.width / 2 + 60;
const endY = stageBox.y + stageBox.height * 0.6;

// Try dispatching pointer events directly
await page.evaluate(({ startX, startY, endX, endY }) => {
  const stage = document.querySelector('[data-testid="proportion-stage"]');
  if (!stage) { console.log('no stage'); return; }
  const fire = (type, x, y) => {
    const evt = new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      buttons: type === 'pointerup' ? 0 : 1,
    });
    stage.dispatchEvent(evt);
  };
  fire('pointerdown', startX, startY);
  fire('pointermove', (startX + endX) / 2, (startY + endY) / 2);
  fire('pointermove', endX, endY);
  fire('pointerup', endX, endY);
  console.log('dispatched pointer events');
}, { startX, startY, endX, endY });

await page.waitForTimeout(500);
const readoutCount = await page.locator('[data-testid="ruler-readout"]').count();
console.log('readout count:', readoutCount);
if (readoutCount > 0) {
  const readout = await page.locator('[data-testid="ruler-readout"]').textContent();
  console.log('readout:', readout);
}
await stage.screenshot({ path: '.tmp/proportion-ruler-phone.png' });
await browser.close();
