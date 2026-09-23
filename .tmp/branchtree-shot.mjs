import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const shots = [
  { name: 'phone-whole', w: 393, h: 852, focus: null },
  { name: 'phone-admin', w: 393, h: 852, focus: 'Admin' },
  { name: 'phone-art', w: 393, h: 852, focus: 'Art' },
  { name: 'desktop-whole', w: 1280, h: 900, focus: null },
];

const errors = [];

for (const { name, w, h, focus } of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem('colourmap:onboarded', 'true');
    } catch {}
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 500) errors.push(`[${name}] ${r.status()} ${new URL(r.url()).pathname}`);
  });

  await page.goto('http://localhost:3000/day', { waitUntil: 'networkidle' });

  const tree = page.getByRole('region', { name: 'The three branches' });
  await tree.waitFor({ timeout: 20000 });

  if (focus) {
    const limb = tree.getByRole('button', { name: new RegExp(`^${focus}`) });
    // Hydration can land after the markup does; retry until the state sticks.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await limb.click();
      try {
        await tree.getByRole('button', { name: 'Whole' }).waitFor({ timeout: 1000 });
        break;
      } catch {
        if (attempt === 9) throw new Error(`${name}: never opened — not hydrated?`);
      }
    }
    // Proof the right one opened, not just something.
    await limb.and(page.locator('[aria-pressed="true"]')).waitFor({ timeout: 3000 });
    await page.waitForTimeout(400);
  }

  await tree.screenshot({ path: `.tmp/branchtree-${name}.png` });
  console.log('captured', name, focus ? `(focused ${focus})` : '(whole)');
  await ctx.close();
}

await browser.close();
const app = errors.filter((e) => !e.includes('/api/'));
console.log(`pre-existing /api 500s: ${errors.length - app.length}`);
console.log(app.length ? `APP PROBLEMS:\n${app.join('\n')}` : 'no app-level console or page errors');
