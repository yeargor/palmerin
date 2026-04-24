#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const webDir = path.join(repoRoot, 'apps', 'web');
const htmlFiles = ['index.html', 'admin.html', 'profiles.html', 'live.html'];
const appJsPath = path.join(webDir, 'app.js');

if (!fs.existsSync(appJsPath)) {
  console.error('Missing apps/web/app.js');
  process.exit(1);
}

const files = fs.readdirSync(webDir);
const versions = files
  .map((name) => {
    const match = /^app\.v(\d+)\.js$/.exec(name);
    return match ? Number(match[1]) : null;
  })
  .filter((v) => Number.isFinite(v));

const maxVersion = versions.length ? Math.max(...versions) : 1;
const nextVersion = maxVersion + 1;
const nextBundleName = `app.v${nextVersion}.js`;
const nextBundlePath = path.join(webDir, nextBundleName);

fs.copyFileSync(appJsPath, nextBundlePath);

for (const htmlFile of htmlFiles) {
  const filePath = path.join(webDir, htmlFile);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original.replace(/src="\.\/app(?:\.v\d+)?\.js"/g, `src="./${nextBundleName}"`);

  if (original === updated) {
    console.error(`No bundle script tag updated in ${htmlFile}`);
    process.exit(1);
  }
  fs.writeFileSync(filePath, updated, 'utf8');
}

console.log(`Created ${path.relative(repoRoot, nextBundlePath)}`);
console.log(`Updated HTML entries to ${nextBundleName}`);
