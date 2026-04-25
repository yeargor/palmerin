import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourcePath = path.join(rootDir, 'packages', 'core', 'sprite-constructor.js');
const targetPath = path.join(rootDir, 'apps', 'web', 'src', 'sprite-constructor.js');

const [source, currentTarget] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'),
  fs.readFile(targetPath, 'utf8').catch(() => null),
]);

if (currentTarget === source) {
  console.log('[sync] apps/web/src/sprite-constructor.js is already in sync');
  process.exit(0);
}

await fs.writeFile(targetPath, source, 'utf8');
console.log(`[sync] updated ${targetPath} from ${sourcePath}`);
