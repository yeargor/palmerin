import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        if (!Number.isFinite(port)) {
          reject(new Error('Failed to resolve free port'));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForReady(baseUrl, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/readyz`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Backend not ready within ${timeoutMs}ms at ${baseUrl}`);
}

export async function startBackendTestServer({
  adminTelegramUserIds = [9001],
  battleTickIntervalMs = 120,
  systemLogIntervalMs = 80,
} = {}) {
  const port = await getFreePort();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tma-backend-test-'));
  const dbPath = path.join(tmpDir, 'test.sqlite');
  const databaseUrl = `file:${dbPath}`;

  const child = spawn('node', ['./apps/backend/server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_PORT: String(port),
      DATABASE_URL: databaseUrl,
      ADMIN_TELEGRAM_USER_IDS: adminTelegramUserIds.join(','),
      BATTLE_TICK_INTERVAL_MS: String(battleTickIntervalMs),
      SYSTEM_LOG_INTERVAL_MS: String(systemLogIntervalMs),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout?.on('data', (chunk) => {
    logs += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    logs += String(chunk);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl, 15_000);

  const stop = async () => {
    if (child.exitCode !== null) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      return;
    }

    await new Promise((resolve) => {
      const onExit = () => resolve();
      child.once('exit', onExit);
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
      }, 1_500).unref();
    });

    await fs.rm(tmpDir, { recursive: true, force: true });
  };

  return {
    baseUrl,
    stop,
    logsRef: () => logs,
  };
}

export async function requestJson(baseUrl, route, {
  method = 'GET',
  headers = {},
  body,
} = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}
