import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'artifacts', 'mobile', 'audit');
await fs.mkdir(outDir, { recursive: true });

const cases = [
  { name: 'iphone-se1-320x568', width: 320, height: 568 },
  { name: 'android-small-360x640', width: 360, height: 640 },
  { name: 'iphone-se2-375x667', width: 375, height: 667 },
  { name: 'iphone12-390x844', width: 390, height: 844 },
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
];

const browser = await chromium.launch({ headless: true });
const report = [];

for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: c.width, height: c.height } });
  await page.goto('http://127.0.0.1:4173/?startapp=club', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const metrics = await page.evaluate(() => {
    const hero = document.getElementById('heroSection')?.getBoundingClientRect();
    const quote = document.getElementById('fighterQuote')?.getBoundingClientRect();
    const sprite = document.querySelector('.sprite')?.getBoundingClientRect();
    const stage = document.querySelector('.fighter-stage')?.getBoundingClientRect();
    const logWrap = document.getElementById('logContainer')?.getBoundingClientRect();
    const logoWrap = document.querySelector('.game-logo-wrap')?.getBoundingClientRect();
    const logo = document.querySelector('.game-logo')?.getBoundingClientRect();

    const overlapQuoteSprite = quote && sprite ? quote.bottom - sprite.top : null;
    const stageTopAfterHero = hero && stage ? stage.top - hero.bottom : null;
    const logVisibleHeight = logWrap ? logWrap.height : null;
    const logoOverflow = logo && logoWrap ? logo.width - logoWrap.width : null;

    return {
      overlapQuoteSprite,
      stageTopAfterHero,
      logVisibleHeight,
      logoOverflow,
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
    };
  });

  const shotPath = path.join(outDir, `${c.name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  report.push({ case: c.name, ...metrics, screenshot: shotPath });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
