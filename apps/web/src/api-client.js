import { API_ROUTES } from '../../../packages/contracts/api-contracts.js';

const DEFAULT_API_BASE = 'http://127.0.0.1:3001';

export function resolveApiBaseUrl() {
  const fromWindow =
    typeof window !== 'undefined' && typeof window.__API_BASE_URL__ === 'string'
      ? window.__API_BASE_URL__
      : null;
  const fromMeta =
    typeof document !== 'undefined'
      ? document.querySelector('meta[name="miniapp:api-base"]')?.getAttribute('content')
      : null;

  return (fromWindow || fromMeta || DEFAULT_API_BASE).replace(/\/$/, '');
}

export function createApiClient(baseUrl = resolveApiBaseUrl()) {
  let requesterTelegramUserId = null;

  const setRequesterTelegramUserId = (value) => {
    const numeric = Number(value);
    requesterTelegramUserId = Number.isFinite(numeric) && numeric > 0
      ? Math.floor(numeric)
      : null;
  };

  const request = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (Number.isFinite(requesterTelegramUserId) && requesterTelegramUserId > 0) {
      headers['X-Telegram-User-Id'] = String(requesterTelegramUserId);
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || `API request failed: ${response.status}`);
    }
    return payload;
  };

  return {
    baseUrl,
    setRequesterTelegramUserId,
    healthz: () => request(API_ROUTES.healthz),
    readyz: () => request(API_ROUTES.readyz),
    sessionInit: (body = {}) =>
      request(API_ROUTES.sessionInit, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    users: () => request(API_ROUTES.users),
    profileById: (id) => request(API_ROUTES.profileById(id)),
    leaderboard: () => request(API_ROUTES.leaderboard),
    liveLeaderboard: () => request(API_ROUTES.liveLeaderboard),
    adminNewUser: (body = {}) =>
      request(API_ROUTES.adminNewUser, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminClearUsers: (body = {}) =>
      request(API_ROUTES.adminClearUsers, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminStartBattles: (body = {}) =>
      request(API_ROUTES.adminStartBattles, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminStopBattles: (body = {}) =>
      request(API_ROUTES.adminStopBattles, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminFinishGame: (body = {}) =>
      request(API_ROUTES.adminFinishGame, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminResetGame: (body = {}) =>
      request(API_ROUTES.adminResetGame, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminLeaderboardDisplay: (body = {}) =>
      request(API_ROUTES.adminLeaderboardDisplay, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  };
}

export async function probeBackendConnection(apiClient = createApiClient()) {
  const [health, ready] = await Promise.all([apiClient.healthz(), apiClient.readyz()]);
  return { health, ready, baseUrl: apiClient.baseUrl };
}
