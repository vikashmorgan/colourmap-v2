import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/education', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: '.tmp/edu-after-fix.png', fullPage: false });
await ctx.close();
await browser.close();
console.log('done');
