import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { API_ROUTES, ROLE } from '../../packages/contracts/api-contracts.js';

const env = {
  apiPort: Number.parseInt(process.env.API_PORT || '3001', 10),
  corsAllowedOrigins: String(process.env.CORS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  battleTickIntervalMs: Number.parseInt(process.env.BATTLE_TICK_INTERVAL_MS || '3500', 10),
  systemLogIntervalMs: Number.parseInt(process.env.SYSTEM_LOG_INTERVAL_MS || '2500', 10),
};

const nowIso = () => new Date().toISOString();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function buildCorsHeaders(origin) {
  if (!origin) {
    return { 'access-control-allow-origin': '*' };
  }
  if (env.corsAllowedOrigins.includes('*') || env.corsAllowedOrigins.includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      vary: 'Origin',
    };
  }
  return { 'access-control-allow-origin': 'null' };
}

function notFound(res, requestId, corsHeaders) {
  writeJson(
    res,
    404,
    {
      error: 'not_found',
      message: 'Route not found',
      requestId,
    },
    corsHeaders,
  );
}

function stubUser(role = ROLE.user) {
  return {
    id: 1,
    telegramUserId: 0,
    role,
    createdAt: nowIso(),
  };
}

function stubProfile() {
  return {
    id: 1,
    userId: 1,
    classId: 'random',
    level: 1,
    rating: 1200,
    hp: 5,
    attack: 5,
    colorTier: 'unusual',
    components: {
      hat: 'hat_plain',
      face: 'face_default',
      arms: 'arms_plain',
      torso: 'torso_plain',
      legs: 'legs_plain',
    },
  };
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  const method = req.method || 'GET';
  const origin = req.headers.origin;
  const corsHeaders = {
    ...buildCorsHeaders(origin),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
  };

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  try {
    if (method === 'GET' && path === API_ROUTES.healthz) {
      writeJson(res, 200, { ok: true, service: 'backend', at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'GET' && path === API_ROUTES.readyz) {
      writeJson(
        res,
        200,
        {
          ok: true,
          ready: true,
          service: 'backend',
          config: {
            battleTickIntervalMs: env.battleTickIntervalMs,
            systemLogIntervalMs: env.systemLogIntervalMs,
          },
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.sessionInit) {
      const body = await parseBody(req);
      writeJson(
        res,
        200,
        {
          user: stubUser(body?.asAdmin ? ROLE.admin : ROLE.user),
          profile: stubProfile(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path.startsWith('/api/profile/')) {
      const id = path.slice('/api/profile/'.length);
      writeJson(res, 200, { profile: { ...stubProfile(), id: Number(id) || 1 }, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'GET' && path === API_ROUTES.leaderboard) {
      writeJson(res, 200, { leaderboard: [], at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminNewUser) {
      writeJson(res, 200, { ok: true, createdUser: stubUser(), at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminClearUsers) {
      writeJson(res, 200, { ok: true, clearedUsers: 0, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminStartBattles) {
      writeJson(res, 200, { ok: true, battlesStarted: true, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminStopBattles) {
      writeJson(res, 200, { ok: true, battlesStarted: false, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminFinishGame) {
      writeJson(res, 200, { ok: true, finished: true, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.telemetryEvents) {
      const body = await parseBody(req);
      writeJson(res, 202, { accepted: true, received: Array.isArray(body?.events) ? body.events.length : 1, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    notFound(res, requestId, corsHeaders);
  } catch (error) {
    writeJson(
      res,
      400,
      {
        error: 'bad_request',
        message: error instanceof Error ? error.message : 'Request failed',
        requestId,
      },
      corsHeaders,
    );
  }
});

server.listen(env.apiPort, () => {
  console.log(`[backend] listening on :${env.apiPort}`);
});
