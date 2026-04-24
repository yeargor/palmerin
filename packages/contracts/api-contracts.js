export const API_ROUTES = Object.freeze({
  healthz: '/healthz',
  readyz: '/readyz',
  sessionInit: '/api/session/init',
  users: '/api/users',
  profileById: (id) => `/api/profile/${encodeURIComponent(String(id))}`,
  leaderboard: '/api/leaderboard',
  liveLeaderboard: '/api/live-leaderboard',
  adminNewUser: '/api/admin/new-user',
  adminClearUsers: '/api/admin/clear-users',
  adminStartBattles: '/api/admin/start-battles',
  adminStopBattles: '/api/admin/stop-battles',
  adminFinishGame: '/api/admin/finish-game',
  adminResetGame: '/api/admin/reset-game',
  adminLeaderboardDisplay: '/api/admin/leaderboard-display',
  adminTelemetryLastRun: '/api/admin/telemetry-last-run',
  telemetryEvents: '/api/telemetry/events',
});

export const ROLE = Object.freeze({
  admin: 'admin',
  user: 'user',
});

// Minimal DTO shapes for stage A contract freeze.
export const DTO_SHAPES = Object.freeze({
  user: ['id', 'telegramUserId', 'role', 'createdAt'],
  profile: ['id', 'userId', 'classId', 'level', 'rating', 'hp', 'attack', 'colorTier', 'components'],
  leaderboardEntry: ['userId', 'name', 'rating', 'level', 'hp', 'attack', 'position'],
  battleTickEvent: ['tick', 'pairs', 'results', 'at'],
  componentRollEvent: ['type', 'context', 'userId', 'slot', 'candidateId', 'componentWeight', 'finalWeight', 'at'],
  gameFinishedEvent: ['type', 'winnerUserId', 'at'],
  apiError: ['error', 'message', 'requestId'],
});

export function pickDtoFields(shapeName, source) {
  const fields = DTO_SHAPES[shapeName];
  if (!fields) throw new Error(`Unknown DTO shape: ${shapeName}`);
  const out = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  }
  return out;
}
