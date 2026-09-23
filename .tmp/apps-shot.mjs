import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try { window.localStorage.setItem('colourmap:onboarded', 'true'); } catch {}
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:3000/day', { waitUntil: 'networkidle' });
const bar = page.getByRole('button', { name: /All one brain/ });
await bar.waitFor({ timeout: 20000 });
for (let i = 0; i < 10; i += 1) {
  await bar.click();
  if ((await bar.getAttribute('aria-expanded')) === 'true') break;
}
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'The apps' }).click();
await page.getByTestId('app-constellation').waitFor({ timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: '.tmp/apps-whole.png' });
console.log('captured whole');

await page.getByRole('button', { name: /^Network Map/ }).first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: '.tmp/apps-network.png' });
console.log('captured focused');

await browser.close();
console.log(errors.length ? `PAGE ERRORS: ${errors.join(' | ')}` : 'no page errors');
