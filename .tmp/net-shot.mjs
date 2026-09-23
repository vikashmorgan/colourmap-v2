import { chromium } from '@playwright/test';

const OUT = 'C:/Users/victor/Desktop/ADMIN/visuals';
const browser = await chromium.launch();
const errors = [];

const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:3001/network', { waitUntil: 'networkidle' });
await page.getByTestId('network-figure').waitFor({ timeout: 25000 });
await page.waitForTimeout(600);

await page.screenshot({ path: `${OUT}/network-whole.png`, fullPage: true });
console.log('captured whole');

await page.getByRole('button', { name: 'Information' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/network-information.png`, fullPage: true });
console.log('captured information selected');

await page.getByRole('button', { name: 'Everything' }).click();
await page.getByRole('button', { name: 'Mercuria' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/network-mercuria.png`, fullPage: true });
console.log('captured mercuria selected');

await browser.close();
console.log(errors.length ? `PAGE ERRORS: ${errors.join(' | ')}` : 'no page errors');
