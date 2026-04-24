import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { API_ROUTES, ROLE } from '../../packages/contracts/api-contracts.js';
import { createSqliteStore } from '../../packages/db/sqlite-store.mjs';
import {
  applyRatingsFromLeaderboard,
  buildLeaderboardEntries,
  runBattleTick,
  runSystemTick,
} from '../../packages/core/battle-engine.mjs';
import {
  buildRandomPreset,
  detectPresetDominantBaseClass,
  getPresetCombatStats,
  getPresetColorTierWeights,
  validatePresetOrThrow,
} from '../../packages/core/sprite-constructor.js';

const COLOR_TIER_SEQUENCE = Object.freeze(['uncommon', 'rare', 'seraph', 'amber', 'reggae', 'palmerin']);
const DEFAULT_RANDOM_TIER = 'uncommon';
const SPECIAL_ADJECTIVES = new Set(['Палмерин', 'Регги']);
const RANDOM_ADJECTIVES = Object.freeze([
  'Перегруженный', 'Фуззовый', 'Дистортнутый', 'Ламповый', 'Аналоговый', 'Ревербнутый', 'Дилейный',
  'Транзисторный', 'Басовый', 'Гитарный', 'Низкочастотный', 'Педальный', 'Двухканальный', 'Ультразвуковой',
  'Лоуфайный', 'Дабстеп', 'Синкопированный', 'Виниловый', 'Кассетный', 'Шугейзный', 'Стоунер', 'Фьюжн',
  'Джазовый', 'Нейрофанковый', 'Гранж', 'Хорус', 'Фланжерный', 'Синтезаторный', 'Компрессированный',
  'Акустический', 'Микрофонный', 'Бум-бэп', 'Хип-хоп', 'Блэк-мет', 'Кумбийский', 'Регги', 'Палмерин',
  'Крафтовый', 'Подвальный', 'Гаражный', 'Барный', 'Трехаккордовый', 'Разогревочный', 'Стейдждайвовый',
  'Трушный', 'Андеграундный', 'Гримерный', 'Безбашенный', 'Прокуренный', 'Глухой', 'Сорванный', 'Отбитый',
  'Безумный', 'Разрывной', 'Оглушительный', 'Кровожадный', 'Эпичный', 'Непробиваемый', 'Грязный', 'Шумный',
]);
const SYSTEM_LOOP_CHECK_MS = 250;
const MAX_TELEMETRY_TICKS_STORED = 200;
const DEFAULT_LEADERBOARD_DISPLAY = Object.freeze({
  hiddenValues: false,
  revealTopFive: false,
});

const env = {
  apiPort: Number.parseInt(process.env.API_PORT || '3001', 10),
  corsAllowedOrigins: String(process.env.CORS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  battleTickIntervalMs: Number.parseInt(process.env.BATTLE_TICK_INTERVAL_MS || '300000', 10),
  matchmakingMaxDelta: Number.parseFloat(process.env.MATCHMAKING_MAX_DELTA || '1.75'),
  systemLogIntervalMs: Number.parseInt(process.env.SYSTEM_LOG_INTERVAL_MS || '2500', 10),
  adminTelegramUserIds: String(process.env.ADMIN_TELEGRAM_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value)),
  databaseUrl: process.env.DATABASE_URL || 'file:./data/dev.sqlite',
};

if (!env.adminTelegramUserIds.length && process.env.NODE_ENV !== 'production') {
  env.adminTelegramUserIds.push(1);
}

const dbStore = createSqliteStore({ databaseUrl: env.databaseUrl });
const store = {
  users: dbStore.readUsers(),
  gameState: dbStore.readGameState(),
  telegramToUserId: new Map(),
};
let storeMutatedByNormalization = false;
for (const user of store.users) {
  if (normalizeStoredUser(user)) {
    storeMutatedByNormalization = true;
  }
}
for (const user of store.users) {
  if (Number.isFinite(user.telegramUserId)) {
    store.telegramToUserId.set(user.telegramUserId, user.id);
  }
}
if (store.users.length > 0 || storeMutatedByNormalization) {
  const participants = store.users.filter((user) => user.role !== ROLE.admin);
  const leaderboard = buildLeaderboardEntries(participants);
  applyRatingsFromLeaderboard(participants, leaderboard);
  for (const user of store.users) {
    if (user.role === ROLE.admin) {
      user.rating = 0;
    }
  }
  if (!store.gameState.finished) {
    store.gameState.frozenLeaderboard = [];
  }
  persistStore();
}
if (normalizeGameStateDisplay(store.gameState)) {
  persistStore();
}
if (normalizeGameStateTelemetry(store.gameState)) {
  persistStore();
}

let serverLoopHandle = null;

function persistStore() {
  dbStore.writeUsers(store.users);
  dbStore.writeGameState(store.gameState);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeGameStateDisplay(gameState) {
  let changed = false;
  if (!gameState || typeof gameState !== 'object') {
    return false;
  }
  if (!gameState.leaderboardDisplay || typeof gameState.leaderboardDisplay !== 'object') {
    gameState.leaderboardDisplay = { ...DEFAULT_LEADERBOARD_DISPLAY };
    return true;
  }
  if (typeof gameState.leaderboardDisplay.hiddenValues !== 'boolean') {
    gameState.leaderboardDisplay.hiddenValues = DEFAULT_LEADERBOARD_DISPLAY.hiddenValues;
    changed = true;
  }
  if (typeof gameState.leaderboardDisplay.revealTopFive !== 'boolean') {
    gameState.leaderboardDisplay.revealTopFive = DEFAULT_LEADERBOARD_DISPLAY.revealTopFive;
    changed = true;
  }
  if (gameState.leaderboardDisplay.hiddenValues && gameState.leaderboardDisplay.revealTopFive) {
    gameState.leaderboardDisplay.revealTopFive = false;
    changed = true;
  }
  return changed;
}

function normalizeGameStateTelemetry(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return false;
  }
  const candidate = gameState.telemetryLastRun;
  if (!candidate || typeof candidate !== 'object') {
    gameState.telemetryLastRun = null;
    return true;
  }
  const sanitized = {
    runId: Math.max(0, Number(candidate.runId) || 0),
    status: ['running', 'paused', 'finished'].includes(candidate.status) ? candidate.status : 'paused',
    startedAt: candidate.startedAt ? String(candidate.startedAt) : null,
    lastUpdatedAt: candidate.lastUpdatedAt ? String(candidate.lastUpdatedAt) : null,
    finishedAt: candidate.finishedAt ? String(candidate.finishedAt) : null,
    winnerUserId: Number.isFinite(Number(candidate.winnerUserId)) ? Number(candidate.winnerUserId) : null,
    tickCount: Math.max(0, Number(candidate.tickCount) || 0),
    fightsTotal: Math.max(0, Number(candidate.fightsTotal) || 0),
    latestTick: candidate.latestTick && typeof candidate.latestTick === 'object' ? candidate.latestTick : null,
    ticks: Array.isArray(candidate.ticks)
      ? candidate.ticks.filter((item) => item && typeof item === 'object').slice(-MAX_TELEMETRY_TICKS_STORED)
      : [],
  };
  const before = JSON.stringify(candidate);
  const after = JSON.stringify(sanitized);
  if (before !== after) {
    gameState.telemetryLastRun = sanitized;
    return true;
  }
  return false;
}

function pickByWeight(weightedItems) {
  const total = weightedItems.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (total <= 0) {
    return weightedItems[0] || null;
  }
  let roll = Math.random() * total;
  for (const item of weightedItems) {
    roll -= Math.max(0, Number(item.weight) || 0);
    if (roll <= 0) {
      return item;
    }
  }
  return weightedItems[weightedItems.length - 1] || null;
}

function pickRandomRegularAdjectiveWord() {
  const regularAdjectives = RANDOM_ADJECTIVES.filter((word) => !SPECIAL_ADJECTIVES.has(word));
  return regularAdjectives[Math.floor(Math.random() * regularAdjectives.length)] || 'Дикий';
}

function buildAdjectiveFromTier(tier) {
  if (tier === 'palmerin') return 'Палмерин';
  if (tier === 'reggae') return 'Регги';
  return pickRandomRegularAdjectiveWord();
}

function pickRandomTierByPreset(preset) {
  const adaptive = getPresetColorTierWeights(preset);
  const weightedTiers = COLOR_TIER_SEQUENCE.map((id) => ({
    id,
    weight: adaptive.weights[id] || 0,
  }));
  return pickByWeight(weightedTiers)?.id || DEFAULT_RANDOM_TIER;
}

function createRandomIdentityFromPreset(preset) {
  const colorTier = pickRandomTierByPreset(preset);
  return {
    colorTier,
    adjective: buildAdjectiveFromTier(colorTier),
  };
}

function isValidPreset(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  try {
    validatePresetOrThrow(value);
    return true;
  } catch {
    return false;
  }
}

function generateRandomProfileState() {
  const components = buildRandomPreset();
  const classId = detectPresetDominantBaseClass(components);
  const stats = getPresetCombatStats(components);
  const identity = createRandomIdentityFromPreset(components);
  return {
    components,
    classId,
    hp: stats.hp,
    attack: stats.attack,
    colorTier: identity.colorTier,
    adjective: identity.adjective,
  };
}

function normalizeStoredUser(user) {
  let changed = false;
  if (!user || typeof user !== 'object') {
    return false;
  }
  const normalizedUsername = normalizeTelegramUsername(user.telegramUsername);
  if (normalizedUsername !== String(user.telegramUsername || '')) {
    user.telegramUsername = normalizedUsername;
    changed = true;
  }
  if (!user.templateKey) {
    user.templateKey = 'random';
    changed = true;
  }

  const hasPreset = isValidPreset(user.components);
  if (!hasPreset) {
    const generated = generateRandomProfileState();
    user.components = generated.components;
    user.classId = generated.classId;
    user.hp = generated.hp;
    user.attack = generated.attack;
    user.colorTier = generated.colorTier;
    user.adjective = generated.adjective;
    user.templateKey = 'random';
    changed = true;
    return changed;
  }

  const stats = getPresetCombatStats(user.components);
  const expectedClassId = detectPresetDominantBaseClass(user.components);
  if (user.classId !== expectedClassId) {
    user.classId = expectedClassId;
    changed = true;
  }
  if (Number(user.hp) !== stats.hp) {
    user.hp = stats.hp;
    changed = true;
  }
  if (Number(user.attack) !== stats.attack) {
    user.attack = stats.attack;
    changed = true;
  }
  if (!user.colorTier) {
    user.colorTier = pickRandomTierByPreset(user.components);
    changed = true;
  }
  if (!user.adjective) {
    user.adjective = buildAdjectiveFromTier(user.colorTier);
    changed = true;
  }
  if (user.role === ROLE.admin) {
    if (user.colorTier !== 'palmerin') {
      user.colorTier = 'palmerin';
      changed = true;
    }
    if (user.adjective !== 'Палмерин') {
      user.adjective = 'Палмерин';
      changed = true;
    }
  }
  return changed;
}

function buildLeaderboard() {
  if (store.gameState.finished && Array.isArray(store.gameState.frozenLeaderboard) && store.gameState.frozenLeaderboard.length) {
    const adminUserIds = new Set(
      store.users
        .filter((user) => user.role === ROLE.admin)
        .map((user) => Number(user.id)),
    );
    return store.gameState.frozenLeaderboard.filter((entry) => !adminUserIds.has(Number(entry.userId)));
  }
  const participants = store.users.filter((user) => user.role !== ROLE.admin);
  return buildLeaderboardEntries(participants);
}

function buildPublicUser(user, { ratingOverride } = {}) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    telegramUsername: String(user.telegramUsername || ''),
    role: user.role,
    templateKey: user.templateKey,
    createdAt: user.createdAt,
    name: user.name,
    classId: user.classId,
    level: user.level,
    rating: Number.isFinite(ratingOverride) ? ratingOverride : user.rating,
  };
}

function buildPublicProfile(user, { ratingOverride } = {}) {
  return {
    id: user.id,
    userId: user.id,
    classId: user.classId,
    level: user.level,
    rating: Number.isFinite(ratingOverride) ? ratingOverride : user.rating,
    hp: user.hp,
    attack: user.attack,
    colorTier: user.colorTier,
    adjective: user.adjective || '',
    components: user.components && typeof user.components === 'object' ? user.components : null,
    logs: Array.isArray(user.logs) ? user.logs : [],
  };
}

function buildPublicGameState() {
  normalizeGameStateDisplay(store.gameState);
  normalizeGameStateTelemetry(store.gameState);
  return {
    finished: store.gameState.finished,
    battlesStarted: store.gameState.battlesStarted,
    winnerUserId: store.gameState.winnerUserId,
    usersCount: store.users.filter((user) => user.role !== ROLE.admin).length,
    leaderboardDisplay: {
      hiddenValues: Boolean(store.gameState.leaderboardDisplay?.hiddenValues),
      revealTopFive: Boolean(store.gameState.leaderboardDisplay?.revealTopFive),
    },
    telemetryLastRun: store.gameState.telemetryLastRun,
  };
}

function buildPublicRuntimeConfig() {
  return {
    battleTickIntervalMs: env.battleTickIntervalMs,
    matchmakingMaxDelta: env.matchmakingMaxDelta,
    systemLogIntervalMs: env.systemLogIntervalMs,
  };
}

function createRandomUserRecord({ telegramUserId = null, telegramUsername = '', createdBy = 'admin' } = {}) {
  const generated = generateRandomProfileState();
  const nextId = store.users.length > 0
    ? (Math.max(...store.users.map((item) => item.id)) + 1)
    : 1;
  const user = {
    id: nextId,
    telegramUserId: Number.isFinite(telegramUserId) ? telegramUserId : null,
    telegramUsername: normalizeTelegramUsername(telegramUsername),
    role: Number.isFinite(telegramUserId) && env.adminTelegramUserIds.includes(telegramUserId)
      ? ROLE.admin
      : ROLE.user,
    classId: generated.classId,
    templateKey: 'random',
    name: `${generated.classId.toUpperCase()} USER #${String(nextId).padStart(3, '0')}`,
    level: 1,
    rating: 0,
    hp: generated.hp,
    attack: generated.attack,
    colorTier: generated.colorTier,
    adjective: generated.adjective,
    components: generated.components,
    logs: [],
    createdBy,
    createdAt: nowIso(),
  };
  if (user.role === ROLE.admin) {
    user.colorTier = 'palmerin';
    user.adjective = 'Палмерин';
  }
  store.users.push(user);
  if (Number.isFinite(user.telegramUserId)) {
    store.telegramToUserId.set(user.telegramUserId, user.id);
  }
  const participants = store.users.filter((item) => item.role !== ROLE.admin);
  const leaderboard = buildLeaderboardEntries(participants);
  applyRatingsFromLeaderboard(participants, leaderboard);
  for (const item of store.users) {
    if (item.role === ROLE.admin) {
      item.rating = 0;
    }
  }
  persistStore();
  return user;
}

function clearAllUsers() {
  store.users = [];
  store.telegramToUserId.clear();
  store.gameState.finished = false;
  store.gameState.battlesStarted = false;
  store.gameState.winnerUserId = null;
  store.gameState.frozenLeaderboard = [];
  store.gameState.telemetryTickId = 0;
  store.gameState.lastBattleTickAt = 0;
  store.gameState.lastSystemLogAt = 0;
  store.gameState.leaderboardDisplay = { ...DEFAULT_LEADERBOARD_DISPLAY };
  if (store.gameState.telemetryLastRun && store.gameState.telemetryLastRun.status === 'running') {
    store.gameState.telemetryLastRun.status = 'paused';
    store.gameState.telemetryLastRun.lastUpdatedAt = nowIso();
  }
  persistStore();
}

function resetGameAndRegenerateProfiles() {
  let regeneratedUsers = 0;
  for (const user of store.users) {
    if (user.role === ROLE.admin) {
      continue;
    }
    const generated = generateRandomProfileState();
    user.classId = generated.classId;
    user.templateKey = 'random';
    user.name = `${generated.classId.toUpperCase()} USER #${String(user.id).padStart(3, '0')}`;
    user.level = 1;
    user.rating = 0;
    user.hp = generated.hp;
    user.attack = generated.attack;
    user.colorTier = generated.colorTier;
    user.adjective = generated.adjective;
    user.components = generated.components;
    user.logs = [];
    regeneratedUsers += 1;
  }

  store.gameState.finished = false;
  store.gameState.battlesStarted = false;
  store.gameState.winnerUserId = null;
  store.gameState.frozenLeaderboard = [];
  store.gameState.telemetryTickId = 0;
  store.gameState.lastBattleTickAt = 0;
  store.gameState.lastSystemLogAt = 0;
  store.gameState.leaderboardDisplay = { ...DEFAULT_LEADERBOARD_DISPLAY };
  if (store.gameState.telemetryLastRun && store.gameState.telemetryLastRun.status === 'running') {
    store.gameState.telemetryLastRun.status = 'paused';
    store.gameState.telemetryLastRun.lastUpdatedAt = nowIso();
  }

  const participants = store.users.filter((item) => item.role !== ROLE.admin);
  const leaderboard = buildLeaderboardEntries(participants);
  applyRatingsFromLeaderboard(participants, leaderboard);
  for (const item of store.users) {
    if (item.role === ROLE.admin) {
      item.rating = 0;
    }
  }
  persistStore();
  return { regeneratedUsers };
}

function buildTickTelemetrySummary(currentTick, outcome, participantsCount) {
  const leaderboardTop = Array.isArray(outcome?.leaderboardAfter || outcome?.leaderboard)
    ? (outcome.leaderboardAfter || outcome.leaderboard).slice(0, 5).map((row) => ({
      userId: Number(row.userId) || 0,
      rating: Number(row.rating) || 0,
      level: Number(row.level) || 0,
      power: Number(row.power) || 0,
    }))
    : [];
  return {
    tick: Number(currentTick) || 0,
    at: nowIso(),
    participants: Math.max(0, Number(participantsCount) || 0),
    fights: Math.max(0, Number(outcome?.fights) || 0),
    pairs: Array.isArray(outcome?.pairs) ? outcome.pairs : [],
    unmatchedUserIds: Array.isArray(outcome?.unmatchedUserIds) ? outcome.unmatchedUserIds : [],
    pairing: outcome?.pairing && typeof outcome.pairing === 'object'
      ? {
        effectiveMaxDelta: Number(outcome.pairing.effectiveMaxDelta) || 0,
        forcedPairsCount: Math.max(0, Number(outcome.pairing.forcedPairsCount) || 0),
        passStats: Array.isArray(outcome.pairing.passStats) ? outcome.pairing.passStats : [],
      }
      : null,
    leaderboardTop,
  };
}

function ensureTelemetryRunOnStart() {
  const runId = Math.max(0, Number(store.gameState.telemetryRunId) || 0);
  store.gameState.telemetryLastRun = {
    runId,
    status: 'running',
    startedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    finishedAt: null,
    winnerUserId: null,
    tickCount: 0,
    fightsTotal: 0,
    latestTick: null,
    ticks: [],
  };
}

function markTelemetryRunPaused() {
  const run = store.gameState.telemetryLastRun;
  if (!run || typeof run !== 'object') {
    return;
  }
  run.status = 'paused';
  run.lastUpdatedAt = nowIso();
}

function appendTelemetryTick(tickSummary) {
  const run = store.gameState.telemetryLastRun;
  if (!run || typeof run !== 'object') {
    return;
  }
  const ticks = Array.isArray(run.ticks) ? run.ticks : [];
  ticks.push(tickSummary);
  run.ticks = ticks.slice(-MAX_TELEMETRY_TICKS_STORED);
  run.latestTick = tickSummary;
  run.tickCount = Math.max(0, Number(run.tickCount) || 0) + 1;
  run.fightsTotal = Math.max(0, Number(run.fightsTotal) || 0) + Math.max(0, Number(tickSummary?.fights) || 0);
  run.lastUpdatedAt = nowIso();
}

function markTelemetryRunFinished(winnerUserId) {
  const run = store.gameState.telemetryLastRun;
  if (!run || typeof run !== 'object') {
    return;
  }
  run.status = 'finished';
  run.winnerUserId = Number.isFinite(Number(winnerUserId)) ? Number(winnerUserId) : null;
  run.finishedAt = nowIso();
  run.lastUpdatedAt = run.finishedAt;
}

function getUserById(id) {
  return store.users.find((user) => user.id === id) || null;
}

function extractRequesterTelegramUserId(req, body) {
  const headerValue = req.headers['x-telegram-user-id'];
  const fromHeader = Number(headerValue);
  if (Number.isFinite(fromHeader)) {
    return fromHeader;
  }
  const fromBody = Number(body?.telegramUserId);
  if (Number.isFinite(fromBody)) {
    return fromBody;
  }
  const fromQuery = Number(new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('tgUserId'));
  if (Number.isFinite(fromQuery)) {
    return fromQuery;
  }
  return null;
}

function normalizeTelegramUsername(value) {
  const trimmed = String(value || '').trim().replace(/^@+/, '');
  if (!trimmed) {
    return '';
  }
  if (/\s/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function extractRequesterTelegramUsername(req, body) {
  const fromBody = normalizeTelegramUsername(body?.telegramUsername);
  if (fromBody) {
    return fromBody;
  }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const fromQuery = normalizeTelegramUsername(url.searchParams.get('tgUsername'));
  if (fromQuery) {
    return fromQuery;
  }
  return '';
}

function isAdminTelegramUser(telegramUserId) {
  return Number.isFinite(telegramUserId) && env.adminTelegramUserIds.includes(telegramUserId);
}

function setLeaderboardDisplayMode(mode) {
  normalizeGameStateDisplay(store.gameState);
  if (mode === 'hide') {
    store.gameState.leaderboardDisplay.hiddenValues = true;
    store.gameState.leaderboardDisplay.revealTopFive = false;
    return;
  }
  if (mode === 'reveal') {
    store.gameState.leaderboardDisplay.hiddenValues = false;
    store.gameState.leaderboardDisplay.revealTopFive = true;
    return;
  }
  store.gameState.leaderboardDisplay.hiddenValues = false;
  store.gameState.leaderboardDisplay.revealTopFive = false;
}

function ensureAdminOrThrow(req, body) {
  const requesterTelegramId = extractRequesterTelegramUserId(req, body);
  if (!isAdminTelegramUser(requesterTelegramId)) {
    const error = new Error('Admin access denied');
    error.statusCode = 403;
    throw error;
  }
}

function getRequesterUserOrThrow(req, body) {
  const requesterTelegramId = extractRequesterTelegramUserId(req, body);
  if (!Number.isFinite(requesterTelegramId)) {
    const error = new Error('telegramUserId is required');
    error.statusCode = 401;
    throw error;
  }
  return getOrCreateUserForTelegram(requesterTelegramId);
}

function ensureProfileAccessOrThrow(req, targetUserId) {
  const requester = getRequesterUserOrThrow(req);
  if (requester.role === ROLE.admin) {
    return requester;
  }
  if (Number(requester.id) !== Number(targetUserId)) {
    const error = new Error('Profile access denied');
    error.statusCode = 403;
    throw error;
  }
  return requester;
}

function getOrCreateUserForTelegram(telegramUserId, telegramUsername = '') {
  if (!Number.isFinite(telegramUserId)) {
    const error = new Error('telegramUserId is required for session initialization');
    error.statusCode = 400;
    throw error;
  }
  const existingUserId = store.telegramToUserId.get(telegramUserId);
  if (existingUserId) {
    const existing = getUserById(existingUserId);
    if (existing) {
      const normalizedUsername = normalizeTelegramUsername(telegramUsername);
      if (normalizedUsername && normalizedUsername !== String(existing.telegramUsername || '')) {
        existing.telegramUsername = normalizedUsername;
        persistStore();
      }
      return existing;
    }
  }
  const normalizedUsername = normalizeTelegramUsername(telegramUsername);
  const created = createRandomUserRecord({ telegramUserId, telegramUsername: normalizedUsername, createdBy: 'session' });
  return created;
}

function maybeRunSystemTick(nowMs) {
  const usersForSystemLogs = store.users;
  if (store.gameState.finished || usersForSystemLogs.length === 0) {
    return;
  }
  if ((nowMs - store.gameState.lastSystemLogAt) < env.systemLogIntervalMs) {
    return;
  }
  runSystemTick(usersForSystemLogs);
  store.gameState.lastSystemLogAt = nowMs;
  persistStore();
}

function maybeRunBattleTick(nowMs) {
  const participants = store.users.filter((user) => user.role !== ROLE.admin);
  if (store.gameState.finished || !store.gameState.battlesStarted || participants.length < 2) {
    return;
  }
  if ((nowMs - store.gameState.lastBattleTickAt) < env.battleTickIntervalMs) {
    return;
  }
  store.gameState.telemetryTickId = Math.max(0, Number(store.gameState.telemetryTickId) || 0) + 1;
  const currentTick = store.gameState.telemetryTickId;
  const outcome = runBattleTick(participants, {
    currentTick,
    matchmakingMaxDelta: env.matchmakingMaxDelta,
  });
  const tickSummary = buildTickTelemetrySummary(currentTick, outcome, participants.length);
  appendTelemetryTick(tickSummary);
  store.gameState.lastBattleTickAt = nowMs;
  if (outcome?.leaderboard?.length) {
    store.gameState.frozenLeaderboard = [];
  }
  persistStore();
}

function startServerLoop() {
  if (serverLoopHandle) {
    return;
  }
  serverLoopHandle = setInterval(() => {
    const nowMs = Date.now();
    maybeRunSystemTick(nowMs);
    maybeRunBattleTick(nowMs);
  }, SYSTEM_LOOP_CHECK_MS);
}

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

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  const method = req.method || 'GET';
  const origin = req.headers.origin;
  const corsHeaders = {
    ...buildCorsHeaders(origin),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Telegram-User-Id, X-Telegram-Init-Data',
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
          dbPath: dbStore.dbPath,
          config: {
            battleTickIntervalMs: env.battleTickIntervalMs,
            matchmakingMaxDelta: env.matchmakingMaxDelta,
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
      const telegramUserId = extractRequesterTelegramUserId(req, body);
      const telegramUsername = extractRequesterTelegramUsername(req, body);
      const user = getOrCreateUserForTelegram(telegramUserId, telegramUsername);
      writeJson(
        res,
        200,
        {
          user: buildPublicUser(user),
          profile: buildPublicProfile(user),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path === API_ROUTES.users) {
      ensureAdminOrThrow(req);
      const leaderboard = buildLeaderboard();
      const ratingByUserId = new Map(leaderboard.map((entry) => [Number(entry.userId), Number(entry.rating)]));
      writeJson(
        res,
        200,
        {
          users: store.users.map((user) => buildPublicUser(user, {
            ratingOverride: ratingByUserId.get(Number(user.id)),
          })),
          leaderboard,
          gameState: buildPublicGameState(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path.startsWith('/api/profile/')) {
      const id = Number(path.slice('/api/profile/'.length));
      if (!Number.isFinite(id) || id <= 0) {
        writeJson(res, 400, { error: 'bad_request', message: 'Invalid profile id', requestId }, corsHeaders);
        return;
      }
      ensureProfileAccessOrThrow(req, id);
      const user = getUserById(id);
      if (!user) {
        writeJson(res, 404, { error: 'not_found', message: 'Profile not found', requestId }, corsHeaders);
        return;
      }
      const leaderboard = buildLeaderboard();
      const ratingByUserId = new Map(leaderboard.map((entry) => [Number(entry.userId), Number(entry.rating)]));
      writeJson(
        res,
        200,
        {
          profile: buildPublicProfile(user, {
            ratingOverride: ratingByUserId.get(Number(user.id)),
          }),
          user: buildPublicUser(user, {
            ratingOverride: ratingByUserId.get(Number(user.id)),
          }),
          gameState: buildPublicGameState(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path === API_ROUTES.leaderboard) {
      ensureAdminOrThrow(req);
      const leaderboard = buildLeaderboard();
      writeJson(
        res,
        200,
        {
          leaderboard,
          users: store.users.map((user) => ({
            id: user.id,
            name: user.name,
            classId: user.classId,
            role: user.role,
            adjective: user.adjective || '',
            telegramUserId: Number.isFinite(user.telegramUserId) ? user.telegramUserId : null,
            telegramUsername: String(user.telegramUsername || ''),
          })),
          gameState: buildPublicGameState(),
          config: buildPublicRuntimeConfig(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path === API_ROUTES.liveLeaderboard) {
      const leaderboard = buildLeaderboard();
      writeJson(
        res,
        200,
        {
          leaderboard,
          users: store.users
            .filter((user) => user.role !== ROLE.admin)
            .map((user) => ({
              id: user.id,
              name: user.name,
              classId: user.classId,
              role: user.role,
              adjective: user.adjective || '',
              telegramUserId: Number.isFinite(user.telegramUserId) ? user.telegramUserId : null,
              telegramUsername: String(user.telegramUsername || ''),
            })),
          gameState: buildPublicGameState(),
          config: buildPublicRuntimeConfig(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminLeaderboardDisplay) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      const mode = String(body?.mode || '').trim().toLowerCase();
      if (!['hide', 'reveal', 'clean'].includes(mode)) {
        writeJson(res, 400, { error: 'bad_request', message: 'Invalid display mode', requestId }, corsHeaders);
        return;
      }
      setLeaderboardDisplayMode(mode);
      persistStore();
      writeJson(
        res,
        200,
        {
          ok: true,
          mode,
          gameState: buildPublicGameState(),
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminNewUser) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      const createdUser = createRandomUserRecord({ createdBy: 'admin' });
      writeJson(
        res,
        200,
        {
          ok: true,
          createdUser: {
            id: createdUser.id,
            name: createdUser.name,
            classId: createdUser.classId,
          },
          usersCount: store.users.length,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminClearUsers) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      const clearedUsers = store.users.length;
      clearAllUsers();
      writeJson(res, 200, { ok: true, clearedUsers, at: nowIso(), requestId }, corsHeaders);
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminStartBattles) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      if (!store.gameState.finished) {
        store.gameState.battlesStarted = true;
        store.gameState.telemetryRunId = Math.max(0, Number(store.gameState.telemetryRunId) || 0) + 1;
        ensureTelemetryRunOnStart();
      }
      persistStore();
      writeJson(
        res,
        200,
        {
          ok: true,
          battlesStarted: store.gameState.battlesStarted,
          finished: store.gameState.finished,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminResetGame) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      const { regeneratedUsers } = resetGameAndRegenerateProfiles();
      writeJson(
        res,
        200,
        {
          ok: true,
          regeneratedUsers,
          battlesStarted: store.gameState.battlesStarted,
          finished: store.gameState.finished,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminStopBattles) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      store.gameState.battlesStarted = false;
      markTelemetryRunPaused();
      persistStore();
      writeJson(
        res,
        200,
        {
          ok: true,
          battlesStarted: store.gameState.battlesStarted,
          finished: store.gameState.finished,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.adminFinishGame) {
      const body = await parseBody(req);
      ensureAdminOrThrow(req, body);
      const participants = store.users.filter((user) => user.role !== ROLE.admin);
      const leaderboard = buildLeaderboardEntries(participants);
      applyRatingsFromLeaderboard(participants, leaderboard);
      for (const user of store.users) {
        if (user.role === ROLE.admin) {
          user.rating = 0;
        }
      }
      const winner = leaderboard[0] || null;
      store.gameState.finished = true;
      store.gameState.battlesStarted = false;
      store.gameState.winnerUserId = winner?.userId || null;
      store.gameState.frozenLeaderboard = leaderboard;
      markTelemetryRunFinished(store.gameState.winnerUserId);
      persistStore();
      writeJson(
        res,
        200,
        {
          ok: true,
          finished: store.gameState.finished,
          winnerUserId: store.gameState.winnerUserId,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'GET' && path === API_ROUTES.adminTelemetryLastRun) {
      ensureAdminOrThrow(req);
      normalizeGameStateTelemetry(store.gameState);
      writeJson(
        res,
        200,
        {
          telemetryLastRun: store.gameState.telemetryLastRun,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    if (method === 'POST' && path === API_ROUTES.telemetryEvents) {
      const body = await parseBody(req);
      writeJson(
        res,
        202,
        {
          accepted: true,
          received: Array.isArray(body?.events) ? body.events.length : 1,
          at: nowIso(),
          requestId,
        },
        corsHeaders,
      );
      return;
    }

    notFound(res, requestId, corsHeaders);
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 400;
    writeJson(
      res,
      statusCode,
      {
        error: statusCode === 403 ? 'forbidden' : 'bad_request',
        message: error instanceof Error ? error.message : 'Request failed',
        requestId,
      },
      corsHeaders,
    );
  }
});

startServerLoop();
server.listen(env.apiPort, () => {
  console.log(`[backend] listening on :${env.apiPort}`);
  console.log(`[backend] sqlite: ${dbStore.dbPath}`);
});

function shutdown() {
  if (serverLoopHandle) {
    clearInterval(serverLoopHandle);
    serverLoopHandle = null;
  }
  try {
    persistStore();
  } catch {
    // ignore shutdown write error
  }
  try {
    dbStore.close();
  } catch {
    // ignore close errors
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
