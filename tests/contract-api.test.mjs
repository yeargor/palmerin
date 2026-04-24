import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ROUTES, DTO_SHAPES, pickDtoFields, ROLE } from '../packages/contracts/api-contracts.js';

test('API routes expose required backend endpoints', () => {
  const requiredRoutes = [
    'healthz',
    'readyz',
    'sessionInit',
    'users',
    'leaderboard',
    'liveLeaderboard',
    'adminNewUser',
    'adminClearUsers',
    'adminStartBattles',
    'adminStopBattles',
    'adminFinishGame',
    'adminResetGame',
    'adminLeaderboardDisplay',
    'adminTelemetryLastRun',
    'telemetryEvents',
  ];

  for (const key of requiredRoutes) {
    assert.equal(typeof API_ROUTES[key], 'string', `API_ROUTES.${key} must be a string route`);
    assert.ok(API_ROUTES[key].startsWith('/'), `${key} must be absolute path`);
  }

  assert.equal(API_ROUTES.profileById(42), '/api/profile/42');
  assert.equal(API_ROUTES.profileById('abc/xyz'), '/api/profile/abc%2Fxyz');
});

test('roles contract is frozen and contains admin/user', () => {
  assert.equal(ROLE.admin, 'admin');
  assert.equal(ROLE.user, 'user');
  assert.ok(Object.isFrozen(ROLE));
});

test('DTO shapes contain required fields used by API', () => {
  assert.ok(Array.isArray(DTO_SHAPES.user));
  assert.ok(DTO_SHAPES.user.includes('id'));
  assert.ok(DTO_SHAPES.user.includes('telegramUserId'));
  assert.ok(DTO_SHAPES.profile.includes('components'));
  assert.ok(DTO_SHAPES.leaderboardEntry.includes('rating'));
  assert.ok(DTO_SHAPES.apiError.includes('requestId'));
});

test('pickDtoFields keeps only declared fields', () => {
  const source = {
    id: 1,
    telegramUserId: 100,
    role: 'user',
    createdAt: '2026-04-24T00:00:00.000Z',
    extra: 'must be dropped',
  };

  const dto = pickDtoFields('user', source);
  assert.deepEqual(dto, {
    id: 1,
    telegramUserId: 100,
    role: 'user',
    createdAt: '2026-04-24T00:00:00.000Z',
  });
  assert.equal(Object.prototype.hasOwnProperty.call(dto, 'extra'), false);
});
