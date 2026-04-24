import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ROUTES } from '../packages/contracts/api-contracts.js';
import { requestJson, startBackendTestServer } from './helpers/backend-test-server.mjs';

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(fn, {
  timeoutMs = 8_000,
  pollMs = 140,
  description = 'condition',
} = {}) {
  const started = Date.now();
  while ((Date.now() - started) < timeoutMs) {
    const value = await fn();
    if (value) {
      return value;
    }
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

test('e2e smoke: init sessions, start/stop battles, finish game, reset game, live sync', async (t) => {
  const adminId = 8801;
  const server = await startBackendTestServer({
    adminTelegramUserIds: [adminId],
    battleTickIntervalMs: 90,
    systemLogIntervalMs: 70,
  });

  t.after(async () => {
    await server.stop();
  });

  const adminSession = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: adminId, telegramUsername: 'owner' },
  });
  assert.equal(adminSession.status, 200);
  assert.equal(adminSession.payload.user.role, 'admin');

  const clearUsers = await requestJson(server.baseUrl, API_ROUTES.adminClearUsers, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { telegramUserId: adminId },
  });
  assert.equal(clearUsers.status, 200);

  const userA = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 9901, telegramUsername: 'fighter_a' },
  });
  const userB = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 9902, telegramUsername: 'fighter_b' },
  });
  const adminRecreated = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: adminId, telegramUsername: 'owner' },
  });
  assert.equal(userA.status, 200);
  assert.equal(userB.status, 200);
  assert.equal(adminRecreated.status, 200);

  const startBattles = await requestJson(server.baseUrl, API_ROUTES.adminStartBattles, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { telegramUserId: adminId },
  });
  assert.equal(startBattles.status, 200);
  assert.equal(startBattles.payload.battlesStarted, true);

  await waitUntil(async () => {
    const pA = await requestJson(server.baseUrl, API_ROUTES.profileById(userA.payload.user.id), {
      headers: { 'x-telegram-user-id': '9901' },
    });
    const pB = await requestJson(server.baseUrl, API_ROUTES.profileById(userB.payload.user.id), {
      headers: { 'x-telegram-user-id': '9902' },
    });
    if (pA.status !== 200 || pB.status !== 200) {
      return false;
    }
    const logsA = Array.isArray(pA.payload.profile.logs) ? pA.payload.profile.logs : [];
    const logsB = Array.isArray(pB.payload.profile.logs) ? pB.payload.profile.logs : [];
    return logsA.length > 0 && logsB.length > 0;
  }, { description: 'battle/system logs on users' });

  const stopBattles = await requestJson(server.baseUrl, API_ROUTES.adminStopBattles, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { telegramUserId: adminId },
  });
  assert.equal(stopBattles.status, 200);
  assert.equal(stopBattles.payload.battlesStarted, false);

  const finishGame = await requestJson(server.baseUrl, API_ROUTES.adminFinishGame, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { telegramUserId: adminId },
  });
  assert.equal(finishGame.status, 200);
  assert.equal(finishGame.payload.finished, true);
  assert.equal(Number.isFinite(finishGame.payload.winnerUserId), true);

  const leaderboard = await requestJson(server.baseUrl, API_ROUTES.leaderboard, {
    headers: { 'x-telegram-user-id': String(adminId) },
  });
  assert.equal(leaderboard.status, 200);
  assert.equal(Array.isArray(leaderboard.payload.leaderboard), true);
  assert.equal(leaderboard.payload.gameState.finished, true);

  const resetGame = await requestJson(server.baseUrl, API_ROUTES.adminResetGame, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { telegramUserId: adminId },
  });
  assert.equal(resetGame.status, 200);
  assert.equal(resetGame.payload.finished, false);

  const reveal = await requestJson(server.baseUrl, API_ROUTES.adminLeaderboardDisplay, {
    method: 'POST',
    headers: { 'x-telegram-user-id': String(adminId) },
    body: { mode: 'reveal', telegramUserId: adminId },
  });
  assert.equal(reveal.status, 200);
  assert.equal(reveal.payload.gameState.leaderboardDisplay.revealTopFive, true);

  const live = await requestJson(server.baseUrl, API_ROUTES.liveLeaderboard);
  assert.equal(live.status, 200);
  assert.equal(live.payload.gameState.leaderboardDisplay.revealTopFive, true);
  assert.equal(Array.isArray(live.payload.leaderboard), true);
  assert.ok(live.payload.leaderboard.length >= 2);
});

