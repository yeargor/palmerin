export async function loadUsersForSelector(apiClient) {
  const payload = await apiClient.users();
  return {
    users: Array.isArray(payload?.users) ? payload.users : [],
    gameState: payload?.gameState && typeof payload.gameState === 'object'
      ? payload.gameState
      : { finished: false },
  };
}

export async function initSessionAndLoadProfile(apiClient, telegramUserId, requestedUserId) {
  await apiClient.sessionInit({ telegramUserId });
  const payload = await apiClient.profileById(requestedUserId);
  if (!payload || typeof payload !== 'object' || !payload.profile) {
    throw new Error('Backend profile response is invalid');
  }
  return payload;
}

export async function loadProfile(apiClient, userId) {
  const payload = await apiClient.profileById(userId);
  if (!payload || typeof payload !== 'object' || !payload.profile) {
    throw new Error('Backend profile response is invalid');
  }
  return payload;
}

export async function callAdminAction(apiClient, actionName, telegramUserId) {
  const fn = apiClient?.[actionName];
  if (typeof fn !== 'function') {
    throw new Error(`Unknown admin action: ${actionName}`);
  }
  return fn({ telegramUserId });
}
