import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const CORE_PATH = new URL('../packages/core/sprite-constructor.js', import.meta.url);
const WEB_PATH = new URL('../apps/web/src/sprite-constructor.js', import.meta.url);

test('web sprite constructor matches core source of truth', async () => {
  const [coreSource, webSource] = await Promise.all([
    fs.readFile(CORE_PATH, 'utf8'),
    fs.readFile(WEB_PATH, 'utf8'),
  ]);

  assert.equal(
    webSource,
    coreSource,
    'apps/web/src/sprite-constructor.js is out of sync with packages/core/sprite-constructor.js. Run: npm run sync:web-sprites',
  );
});
