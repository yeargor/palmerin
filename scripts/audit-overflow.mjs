import { chromium } from 'playwright';

const cases = [
  { name: 'iphone-se1-320x568', width: 320, height: 568 },
  { name: 'android-small-360x640', width: 360, height: 640 },
  { name: 'iphone-se2-375x667', width: 375, height: 667 },
  { name: 'iphone12-390x844', width: 390, height: 844 },
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
];

const selectors = [
  '#heroSection',
  '.game-logo-wrap',
  '.game-logo',
  '.hero-grid',
  '#statsRow',
  '.fighter-quote-anchor',
  '#fighterQuote',
  '.fighter-stage',
  '.sprite',
  '#logContainer',
  '#logList',
];

const browser = await chromium.launch({ headless: true });

for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: c.width, height: c.height } });
  await page.goto('http://127.0.0.1:4173/?startapp=club', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const result = await page.evaluate((selectors) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const failures = [];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 0.6 || r.left < -0.6) {
        failures.push({ sel, type: 'horizontal', left: r.left, right: r.right, vw });
      }
      if (sel !== '#logContainer' && r.bottom > vh + 0.6) {
        failures.push({ sel, type: 'vertical', bottom: r.bottom, vh });
      }
    }

    const app = document.getElementById('appRoot');
    const rootOverflowX = app ? app.scrollWidth - app.clientWidth : 0;

    return { failures, rootOverflowX };
  }, selectors);

  console.log(JSON.stringify({ case: c.name, ...result }, null, 2));
  await page.close();
}

await browser.close();
