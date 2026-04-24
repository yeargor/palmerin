import { createSqliteStore } from '../packages/db/sqlite-store.mjs';

const databaseUrl = process.env.DATABASE_URL || 'file:./data/dev.sqlite';
const store = createSqliteStore({ databaseUrl });
console.log(`[db] schema ensured at ${store.dbPath}`);
store.close();
