import { chromium } from 'playwright';
import path from 'node:path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 375, height: 667 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.6 Mobile/15E148 Safari/604.1',
});
await page.goto('http://127.0.0.1:4173/?startapp=club', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const out = path.join('artifacts', 'mobile', 'iphone-se-375x667-club.png');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`Saved ${out}`);
