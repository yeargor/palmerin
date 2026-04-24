import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ROUTES } from '../packages/contracts/api-contracts.js';
import { requestJson, startBackendTestServer } from './helpers/backend-test-server.mjs';

test('session init creates user, reuses user, updates telegram username', async (t) => {
  const server = await startBackendTestServer({ adminTelegramUserIds: [5001] });
  t.after(async () => {
    await server.stop();
  });

  const first = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 7001, telegramUsername: 'alpha' },
  });
  assert.equal(first.status, 200);
  assert.equal(first.payload.user.telegramUserId, 7001);
  assert.equal(first.payload.user.telegramUsername, 'alpha');

  const second = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 7001, telegramUsername: '@alpha_2' },
  });
  assert.equal(second.status, 200);
  assert.equal(second.payload.user.id, first.payload.user.id);
  assert.equal(second.payload.user.telegramUsername, 'alpha_2');

  const ownProfile = await requestJson(server.baseUrl, API_ROUTES.profileById(first.payload.user.id), {
    headers: { 'x-telegram-user-id': '7001' },
  });
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.payload.profile.userId, first.payload.user.id);
});

test('admin endpoints are protected and admin display mode is persisted in API response', async (t) => {
  const server = await startBackendTestServer({ adminTelegramUserIds: [5001] });
  t.after(async () => {
    await server.stop();
  });

  const deniedUsers = await requestJson(server.baseUrl, API_ROUTES.users);
  assert.equal(deniedUsers.status, 403);

  const allowedUsers = await requestJson(server.baseUrl, API_ROUTES.users, {
    headers: { 'x-telegram-user-id': '5001' },
  });
  assert.equal(allowedUsers.status, 200);

  const createUser = await requestJson(server.baseUrl, API_ROUTES.adminNewUser, {
    method: 'POST',
    headers: { 'x-telegram-user-id': '5001' },
    body: { telegramUserId: 5001 },
  });
  assert.equal(createUser.status, 200);
  assert.equal(Number.isFinite(createUser.payload.createdUser.id), true);

  const badMode = await requestJson(server.baseUrl, API_ROUTES.adminLeaderboardDisplay, {
    method: 'POST',
    headers: { 'x-telegram-user-id': '5001' },
    body: { mode: 'not-valid' },
  });
  assert.equal(badMode.status, 400);

  const hideMode = await requestJson(server.baseUrl, API_ROUTES.adminLeaderboardDisplay, {
    method: 'POST',
    headers: { 'x-telegram-user-id': '5001' },
    body: { mode: 'hide' },
  });
  assert.equal(hideMode.status, 200);
  assert.equal(hideMode.payload.gameState.leaderboardDisplay.hiddenValues, true);

  const live = await requestJson(server.baseUrl, API_ROUTES.liveLeaderboard);
  assert.equal(live.status, 200);
  assert.equal(live.payload.gameState.leaderboardDisplay.hiddenValues, true);
});

test('profile access: user can only read own profile, admin can read any profile', async (t) => {
  const server = await startBackendTestServer({ adminTelegramUserIds: [5001] });
  t.after(async () => {
    await server.stop();
  });

  const userA = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 7101 },
  });
  const userB = await requestJson(server.baseUrl, API_ROUTES.sessionInit, {
    method: 'POST',
    body: { telegramUserId: 7102 },
  });

  assert.equal(userA.status, 200);
  assert.equal(userB.status, 200);

  const denied = await requestJson(server.baseUrl, API_ROUTES.profileById(userB.payload.user.id), {
    headers: { 'x-telegram-user-id': '7101' },
  });
  assert.equal(denied.status, 403);

  const adminRead = await requestJson(server.baseUrl, API_ROUTES.profileById(userB.payload.user.id), {
    headers: { 'x-telegram-user-id': '5001' },
  });
  assert.equal(adminRead.status, 200);
  assert.equal(adminRead.payload.profile.userId, userB.payload.user.id);
});

