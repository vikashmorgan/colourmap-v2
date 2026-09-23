import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const errors = [];
const shots = [
  { name: 'closed', focus: null },
  { name: 'open', focus: null, open: true },
  { name: 'open-admin', focus: 'Admin', open: true },
  { name: 'open-art', focus: 'Art', open: true },
];

for (const { name, focus, open } of shots) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try { window.localStorage.setItem('colourmap:onboarded', 'true'); } catch {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));

  await page.goto('http://localhost:3000/day', { waitUntil: 'networkidle' });

  const bar = page.getByRole('button', { name: /All one brain/ });
  await bar.waitFor({ timeout: 20000 });

  if (open) {
    for (let i = 0; i < 10; i += 1) {
      await bar.click();
      if (await bar.getAttribute('aria-expanded') === 'true') break;
      if (i === 9) throw new Error(`${name}: dock never opened`);
    }
    await page.waitForTimeout(300);
    if (focus) {
      await page.getByRole('button', { name: focus, exact: true }).click();
      await page.waitForTimeout(450);
    }
  }

  await page.screenshot({ path: `.tmp/dock-${name}.png` });
  console.log('captured', name);
  await ctx.close();
}

await browser.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
