import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(rootDir, "artifacts", "mobile");

const targets = [
  { name: "club", url: "http://127.0.0.1:4173/apps/web/index.html?startapp=club" },
  { name: "ghost", url: "http://127.0.0.1:4173/apps/web/index.html?startapp=ghost" },
];

const profiles = [
  { label: "iphone13", device: devices["iPhone 13"] },
  { label: "pixel7", device: devices["Pixel 7"] },
];

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const profile of profiles) {
    const context = await browser.newContext({ ...profile.device });
    for (const target of targets) {
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const filePath = path.join(outDir, `${profile.label}-${target.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved ${filePath}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
