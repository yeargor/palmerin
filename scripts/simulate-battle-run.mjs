import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const telemetryPath = path.join(rootDir, "artifacts", "battle", "battle-events.jsonl");

function parseArgs(argv) {
  const options = {
    baseUrl: "http://127.0.0.1:4173",
    users: 8,
    durationMs: 120000,
    smoke: false,
    headed: false,
    cleanupAfter: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--smoke") {
      options.smoke = true;
    } else if (arg === "--headed") {
      options.headed = true;
    } else if (arg === "--no-cleanup-after") {
      options.cleanupAfter = false;
    } else if (arg === "--cleanup-after") {
      options.cleanupAfter = true;
    } else if (arg === "--base-url" && argv[i + 1]) {
      options.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--users" && argv[i + 1]) {
      options.users = Math.max(2, Number.parseInt(argv[i + 1], 10) || options.users);
      i += 1;
    } else if (arg === "--duration-ms" && argv[i + 1]) {
      options.durationMs = Math.max(1000, Number.parseInt(argv[i + 1], 10) || options.durationMs);
      i += 1;
    }
  }

  if (options.smoke) {
    options.users = 3;
    options.durationMs = 8000;
  }

  return options;
}

async function ensureTelemetryFileCleared() {
  await fs.mkdir(path.dirname(telemetryPath), { recursive: true });
  await fs.writeFile(telemetryPath, "", "utf8");
}

async function clickIfEnabled(page, selector) {
  const button = page.locator(selector);
  const exists = (await button.count()) > 0;
  if (!exists) {
    return false;
  }
  const disabled = await button.isDisabled();
  if (disabled) {
    return false;
  }
  await button.click();
  return true;
}

async function runSimulation(options) {
  await ensureTelemetryFileCleared();

  const browser = await chromium.launch({ headless: !options.headed });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const adminUrl = `${options.baseUrl}/?view=admin&startapp=random&v=sim_${Date.now()}`;

  try {
    await page.goto(adminUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("#adminNewUserBtn", { timeout: 10000 });

    await clickIfEnabled(page, "#adminClearUsersBtn");

    for (let i = 0; i < options.users; i += 1) {
      await page.click("#adminNewUserBtn");
      await page.waitForTimeout(60);
    }

    await page.click("#adminStartBattlesBtn");
    // Battle engine ticks run on the profile page (not in admin view), so switch into a user session.
    const firstUserRow = page.locator(".admin-row").first();
    await firstUserRow.click();
    await page.waitForTimeout(options.durationMs);

    // Return to admin view and freeze the run.
    await page.goto(adminUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("#finishGameBtn", { timeout: 10000 });
    await clickIfEnabled(page, "#finishGameBtn");
    await page.waitForTimeout(600);
    if (options.cleanupAfter) {
      await clickIfEnabled(page, "#adminClearUsersBtn");
      await page.waitForTimeout(200);
    }
  } finally {
    await browser.close();
  }

  const raw = await fs.readFile(telemetryPath, "utf8");
  const lineCount = raw.split("\n").filter(Boolean).length;
  return { lineCount, telemetryPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runSimulation(options);
  console.log("Simulation completed");
  console.log(`telemetry_file=${result.telemetryPath}`);
  console.log(`events=${result.lineCount}`);
  console.log(`users=${options.users}`);
  console.log(`duration_ms=${options.durationMs}`);
  console.log(`cleanup_after=${options.cleanupAfter}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
