import { API_ROUTES } from '../packages/contracts/api-contracts.js';

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
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || `API request failed: ${response.status}`);
    }
    return payload;
  };

  return {
    baseUrl,
    healthz: () => request(API_ROUTES.healthz),
    readyz: () => request(API_ROUTES.readyz),
    sessionInit: (body = {}) =>
      request(API_ROUTES.sessionInit, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  };
}

export async function probeBackendConnection(apiClient = createApiClient()) {
  const [health, ready] = await Promise.all([apiClient.healthz(), apiClient.readyz()]);
  return { health, ready, baseUrl: apiClient.baseUrl };
}
