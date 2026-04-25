import {
  SPRITE_GRID_WIDTH,
  SPRITE_MIN_GRID_HEIGHT,
  COMPONENT_SLOTS,
  componentById,
  randomPoolBySlot,
  characterPresetByClassId,
  buildRandomPreset,
  validatePresetOrThrow,
  detectPresetDominantBaseClass,
  getPresetColorTierWeights,
  getPresetCombatStats,
  renderPresetToSprite,
} from "../../packages/core/sprite-constructor.js";
import { CHARACTER_QUOTES } from "./src/character-quotes.js";
import { createApiClient, probeBackendConnection } from "./src/api-client.js";
import { requireTelegramUserId, resolveTelegramUserId, resolveTelegramUsername } from "./src/telegram-context.js";
import {
  callAdminAction,
  initSessionAndLoadProfile,
  loadProfile,
  loadUsersForSelector,
} from "./src/session-api.js";

const tg = window.Telegram?.WebApp;
document.body.classList.add("app-booting");

if (tg) {
  tg.ready();
  tg.expand();
}

const apiClient = createApiClient();
void probeBackendConnection(apiClient)
  .then((result) => {
    console.info("[api] backend probe ok", result.baseUrl, result.health?.ok, result.ready?.ready);
  })
  .catch((error) => {
    console.warn("[api] backend probe failed", error instanceof Error ? error.message : error);
  });

const ADMIN_TARGET_USER_STORAGE_KEY = "miniapp.adminTargetUserId";
const DEBUG_PROFILE_TEMPLATE_STORAGE_KEY = "miniapp.debugStartTemplate";
const PAGE_ROUTE_MODE = String(window.__PALMERIN_ROUTE__ || "home").trim().toLowerCase();

const profileTemplateByParam = {
  club: {
    id: 42,
    classId: "warrior",
    name: "ANIME WARRIOR",
    level: 1,
    rating: 1250,
    rarity: "rare",
    stats: {
      hp: "HP 42",
      str: "STR 3",
      dex: "DEX 8",
      luck: "LUK 12",
    },
    equipment: {
      leftHand: "Wood Shield",
      rightHand: "Rust Sword",
      body: "Empty",
    },
    logs: [
      { time: "21:00", type: "system", text: "arena entry" },
      { time: "21:05", type: "combat", combatResult: "victory", text: "победа: щит выдержал" },
    ],
  },
  ghost: {
    id: 77,
    classId: "warrior",
    name: "NOISE WARDEN",
    level: 2,
    rating: 1308,
    rarity: "epic",
    stats: {
      hp: "HP 39",
      str: "STR 4",
      dex: "DEX 9",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Iron Buckler",
      rightHand: "Needle Blade",
      body: "Patch Vest",
    },
    logs: [
      { time: "21:02", type: "system", text: "crowd scan" },
      { time: "21:06", type: "combat", combatResult: "defeat", text: "поражение: позиция потеряна" },
    ],
  },
  mage: {
    id: 88,
    classId: "mage",
    name: "ARCANE HERMIT",
    level: 1,
    rating: 1211,
    rarity: "rare",
    stats: {
      hp: "HP 36",
      str: "STR 2",
      dex: "DEX 10",
      luck: "LUK 11",
    },
    equipment: {
      leftHand: "Empty",
      rightHand: "Oak Staff",
      body: "Cloth Hood",
    },
    logs: [
      { time: "21:03", type: "system", text: "mana check" },
      { time: "21:07", type: "combat", combatResult: "victory", text: "победа: серия точна" },
    ],
  },
  cowboy: {
    id: 99,
    classId: "cowboy",
    name: "DUST RANGER",
    level: 1,
    rating: 1224,
    rarity: "rare",
    stats: {
      hp: "HP 40",
      str: "STR 4",
      dex: "DEX 9",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Iron Revolver",
      rightHand: "Short Revolver",
      body: "Dust Poncho",
    },
    logs: [
      { time: "21:04", type: "system", text: "saloon watch" },
      { time: "21:08", type: "combat", combatResult: "defeat", text: "поражение: патроны кончились" },
    ],
  },
  random: {
    id: 111,
    classId: "random",
    name: "WILD MIX",
    level: 1,
    rating: 1199,
    rarity: "rare",
    stats: {
      hp: "HP 38",
      str: "STR 3",
      dex: "DEX 10",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Mixed Gear",
      rightHand: "Mixed Gear",
      body: "Mixed Outfit",
    },
    logs: [
      { time: "21:09", type: "system", text: "Концерт начался!" },
    ],
  },
};

const STORAGE_KEY = "miniapp.runtime.v1";
const BATTLE_POWER_K = 1;
const BATTLE_W_LVL = 0.6;
const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  systemLogIntervalMs: 2500,
  battleTickIntervalMs: 300000,
  matchmakingMaxDelta: 1.75,
});
const MATCHMAKING_PRIORITY_QUANTILE = 0.25;
const MATCHMAKING_STALE_TICKS = 3;
const MATCHMAKING_RELAX_OFFSETS = Object.freeze([0, 0.4, 0.8]);
const MATCHMAKING_FORCED_PAIR_CAP = 1;
const LEVEL_GAIN_UPSET_THRESHOLD = 0.35;
const LEVEL_GAIN_BALANCED_THRESHOLD = 0.6;
const LOSER_STREAK_SHIELD_PER_LOSS = 0.06;
const LOSER_STREAK_SHIELD_MAX = 0.3;
const MIN_INTERVAL_MS = 1000;
const MAX_INTERVAL_MS = 300000;
const MAX_STORED_LOGS_PER_USER = 20;
const MAX_UI_LOGS = 5;

const logPoolByType = {
  system: ["arena sync", "match queue ready", "signal stable"],
  drop: ["new item drop", "rare salvage found", "loot secured"],
  levelup: ["level increased", "inventory upgraded", "power node unlocked"],
};
const combatOutcomePhrases = {
  victory: [
    "Разнёс танцпол",
    "Отправил на бар",
    "Выдал соло",
    "Прыгнул со сцены",
    "Сломал стойку микрофона",
    "Вызвал на бис",
    "Оглушил дисторшном",
    "Допил чужое пиво",
    "Забрал пиво",
    "Переорал комбик",
    "Заглушил фуззом",
    "Пробил фанеру",
    "Пережил жесткий слэм",
    "Забрал микрофон",
    "Взорвал колонки",
    "Поймал медиатор",
    "Выдал брейкдаун",
    "Сфоткал сетлист",
    "Раскачал толпу",
    "Раздал стиля",
    "Ушел в отрыв",
    "Вырвал джек",
    "Услышал басиста",
    "Попал в ритм",
    "Забрал последний шот",
    "Пробил стену звука",
    "Выдержал стейдждайв",
    "Залез на комбик",
    "Порвал струны",
    "Прыгнул в толпу",
    "Оглушил басом",
    "Разогнал мошпит",
    "Прошел фейсконтроль",
    "Покорил бэкстейдж",
    "Разбил гитару",
    "Сорвал голос",
    "Перепел вокалиста",
    "Пробил барабаны",
    "Включил овердрайв",
    "Порвал майку",
    "Раздал автографы",
    "Занял первый ряд",
    "Придумал рифф",
    "Спас пиво",
    "Выиграл проходку",
    "Снёс двери в толчек",
    "Поймал палочку",
    "Заглушил фидбэк",
    "Поплыл по рукам",
    "Разбудил соседей",
    "Сломал тарелку",
    "Перепил бармена",
    "Оглушил весь зал",
    "Разнёс гримёрку",
    "Выдал соло",
    "Сломал монитор",
    "Залез на колонку",
    "Сыграл на бис",
    "Врубил дилей",
    "Устроил ад",
    "Задал ровный ритм",
    "Посчитал под метроном",
    "Прошел без билета",
    "Разбудил звукача",
    "Спалил усилитель"
  ],
  defeat: [
    "Упал в слэме",
    "Пролил пиво",
    "Порвалась струна",
    "Не попал в бит",
    "Уснул за баром",
    "Оглушило фидбэком",
    "Забыл текст песни",
    "Выгнали из клуба",
    "Сбежал на курилку",
    "Потерял медиатор",
    "Не прошел фейсконтроль",
    "Отключили от пульта",
    "Наступили на педаль",
    "Уронил стакан",
    "Выронил палочки",
    "Оттоптали ноги",
    "Наступили на провод",
    "Залил пульт пивом",
    "Сгорели лампы",
    "Порвал кеды",
    "Завалил кардан",
    "Ошибся в припеве",
    "Ушел к звукачу",
    "Застрял в толпе",
    "Выгнали с бэкстейджа",
    "Пластмассовый мир победил",
    "Порвал ремень гитары",
    "Получил пустым стаканом",
    "Потерял правый ботинок",
    "Опоздал на репу",
    "Застрял в туалете",
    "Оглушило монитором",
    "Забыл беруши",
    "Уснул на колонке",
    "Получил локтем",
    "Влетел в стойку",
    "Сломал очки",
    "Не хватило денег",
    "Выключился комбик",
    "Села батарейка в педали",
    "Наступил в лужу",
    "Получил по носу",
    "Споткнулся о провод",
    "Запутался в проводах",
    "Упал со сцены",
    "Облили пивом",
    "Выгнал охранник",
    "Забыл главную мелодию",
    "Уронил медиатор",
    "Задохнулся в мошпите",
    "Порвал джинсы",
    "Поскользнулся на танцполе",
    "Вырвало джек гитары",
    "Перепутал аккорды",
    "Уронил гитару",
    "Разбил педальборд",
    "Унесли на руках",
    "Упал в обморок",
    "Оглох на правое",
    "Оглох на левое",
    "Не поймал ритм",
    "Уснул под сценой",
  ]
};

const rarityToCssVar = {
  common: "var(--common)",
  uncommon: "var(--uncommon)",
  rare: "var(--rare)",
  epic: "var(--epic)",
  legendary: "var(--legendary)",
};

let latestRenderedSpriteMeta = {
  lines: Array.from({ length: SPRITE_MIN_GRID_HEIGHT }, () => "".padEnd(SPRITE_GRID_WIDTH, " ")),
  width: SPRITE_GRID_WIDTH,
  height: SPRITE_MIN_GRID_HEIGHT,
};
let currentCombatStats = { hp: 1, attack: 1 };
let battleTelemetryTickId = 0;
const LOGO_TEXT_COLUMNS = 74;

function getStartParam() {
  const fromTelegram = String(tg?.initDataUnsafe?.start_param || "").trim().toLowerCase();
  if (profileTemplateByParam[fromTelegram]) {
    return fromTelegram;
  }
  const fromStorage = String(window.sessionStorage.getItem(DEBUG_PROFILE_TEMPLATE_STORAGE_KEY) || "")
    .trim()
    .toLowerCase();
  if (profileTemplateByParam[fromStorage]) {
    return fromStorage;
  }
  return "club";
}

function makeTelemetryId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function getOrCreateTelemetrySessionId() {
  const current = window.localStorage.getItem(TELEMETRY_SESSION_STORAGE_KEY);
  if (current) {
    return current;
  }
  const next = makeTelemetryId();
  window.localStorage.setItem(TELEMETRY_SESSION_STORAGE_KEY, next);
  return next;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPositiveIntervalFromUrlParam(paramName, fallback) {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(paramName);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return clampNumber(parsed, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
}

function resolveRuntimeConfig() {
  return {
    systemLogIntervalMs: getPositiveIntervalFromUrlParam("sysLogMs", DEFAULT_RUNTIME_CONFIG.systemLogIntervalMs),
    battleTickIntervalMs: getPositiveIntervalFromUrlParam("battleMs", DEFAULT_RUNTIME_CONFIG.battleTickIntervalMs),
    matchmakingMaxDelta: clampNumber(
      Number.parseFloat(new URL(window.location.href).searchParams.get("mmMaxDelta") || ""),
      0.1,
      5,
    ) || DEFAULT_RUNTIME_CONFIG.matchmakingMaxDelta,
  };
}

function isSpriteDebugMode() {
  const url = new URL(window.location.href);
  return url.searchParams.get("debugSprite") === "1";
}

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isProfileSelectorMode() {
  return PAGE_ROUTE_MODE === "profiles";
}

function isAdminMode() {
  return PAGE_ROUTE_MODE === "admin";
}

function isLiveLeaderboardMode() {
  return PAGE_ROUTE_MODE === "live";
}

function templateKeyFromClassId(classId) {
  if (classId === "mage") {
    return "mage";
  }
  if (classId === "cowboy") {
    return "cowboy";
  }
  if (classId === "warrior") {
    return "club";
  }
  return "random";
}

function getRequiredTelegramUserIdForApi() {
  return requireTelegramUserId({
    tg,
    url: new URL(window.location.href),
    localStorageRef: window.localStorage,
  });
}

function getRequestedUserId() {
  const raw = window.sessionStorage.getItem(ADMIN_TARGET_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyRoleBasedRouteGuards(ownUserId) {
  if (isCurrentSessionAdmin) {
    return;
  }
  window.sessionStorage.setItem(ADMIN_TARGET_USER_STORAGE_KEY, String(ownUserId));
  requestedUserId = ownUserId;
}

function scheduleAdminLayoutResizeRender() {
  if (!isAdminMode() || !isCurrentSessionAdmin) {
    return;
  }
  if (adminLayoutResizeTimer) {
    window.clearTimeout(adminLayoutResizeTimer);
  }
  adminLayoutResizeTimer = window.setTimeout(() => {
    adminLayoutResizeTimer = null;
    if (isAdminMode() && isCurrentSessionAdmin) {
      void renderAdminPage();
    }
  }, 120);
}

function attachAdminLayoutResizeSync() {
  if (adminLayoutResizeBound) {
    return;
  }
  window.addEventListener("resize", scheduleAdminLayoutResizeRender);
  window.addEventListener("orientationchange", scheduleAdminLayoutResizeRender);
  window.visualViewport?.addEventListener("resize", scheduleAdminLayoutResizeRender);
  adminLayoutResizeBound = true;
}

function detachAdminLayoutResizeSync() {
  if (!adminLayoutResizeBound) {
    return;
  }
  window.removeEventListener("resize", scheduleAdminLayoutResizeRender);
  window.removeEventListener("orientationchange", scheduleAdminLayoutResizeRender);
  window.visualViewport?.removeEventListener("resize", scheduleAdminLayoutResizeRender);
  if (adminLayoutResizeTimer) {
    window.clearTimeout(adminLayoutResizeTimer);
    adminLayoutResizeTimer = null;
  }
  adminLayoutResizeBound = false;
}

function applyRoleBasedBottomButtons() {
  const shouldShow = isCurrentSessionAdmin === true;
  if (closeAsciiBtnEl) {
    closeAsciiBtnEl.style.display = shouldShow ? "" : "none";
  }
  if (adminAsciiBtnEl) {
    adminAsciiBtnEl.style.display = shouldShow ? "" : "none";
  }
}

async function initializeSessionContext() {
  const telegramUserId = getRequiredTelegramUserIdForApi();
  const telegramUsername = resolveTelegramUsername({
    tg,
    url: null,
    localStorageRef: window.localStorage,
  });
  currentTelegramUserId = telegramUserId;
  apiClient.setRequesterTelegramUserId?.(telegramUserId);
  const payload = await apiClient.sessionInit({
    telegramUserId,
    telegramUsername: telegramUsername || undefined,
  });
  const user = payload?.user;
  const ownUserId = Number(user?.id || payload?.profile?.userId || payload?.profile?.id);
  if (!user || !Number.isFinite(ownUserId)) {
    throw new Error("Invalid session payload");
  }
  currentSessionUser = user;
  isCurrentSessionAdmin = String(user.role || "") === "admin";
  applyRoleBasedRouteGuards(ownUserId);
  if (isCurrentSessionAdmin) {
    requestedUserId = Number.isFinite(getRequestedUserId()) ? getRequestedUserId() : ownUserId;
  } else {
    requestedUserId = ownUserId;
  }
}

let requestedProfileParam;
let runtimeConfig;
let requestedUserId;
let runtimeStore;
let selectedUser;
let selectedTemplateKey;
let selectedSession;
let spriteDebugMode;
let state;
let activeUserId;
let hasActiveRuntimeUser;
let telemetrySessionId;
let telemetryPageSessionId;
let stateBackendControlled = false;
let currentSessionUser = null;
let isCurrentSessionAdmin = false;
let currentTelegramUserId = null;
let liveLeaderboardPollTimer = null;
let adminPagePollTimer = null;
const ADMIN_PAGE_POLL_INTERVAL_MS = 2000;
const randomClassAdjectives = [
  "Перегруженный",
  "Фуззовый",
  "Дистортнутый",
  "Ламповый",
  "Аналоговый",
  "Ревербнутый",
  "Дилейный",
  "Транзисторный",
  "Басовый",
  "Гитарный",
  "Низкочастотный",
  "Педальный",
  "Двухканальный",
  "Ультразвуковой",
  "Лоуфайный",
  "Дабстеп",
  "Синкопированный",
  "Виниловый",
  "Кассетный",
  "Шугейзный",
  "Стоунер",
  "Фьюжн",
  "Джазовый",
  "Нейрофанковый",
  "Гранж",
  "Хорус",
  "Фланжерный",
  "Синтезаторный",
  "Компрессированный",
  "Акустический",
  "Микрофонный",
  "Бум-бэп",
  "Хип-хоп",
  "Блэк-мет",
  "Кумбийский",
  "Регги",
  "Палмерин",
  "Крафтовый",
  "Подвальный",
  "Гаражный",
  "Барный",
  "Трехаккордовый",
  "Разогревочный",
  "Стейдждайвовый",
  "Трушный",
  "Андеграундный",
  "Гримерный",
  "Безбашенный",
  "Прокуренный",
  "Глухой",
  "Сорванный",
  "Отбитый",
  "Безумный",
  "Разрывной",
  "Оглушительный",
  "Кровожадный",
  "Эпичный",
  "Непробиваемый",
  "Грязный",
  "Шумный",
];
const RANDOM_COLOR_HEX_BY_TIER = {
  uncommon: "#2f78ff",
  rare: "#2f78ff",
  seraph: "#f866af",
  amber: "#f9970b",
};
const COLOR_TIER_SEQUENCE = ["uncommon", "rare", "seraph", "amber", "reggae", "palmerin"];
const DEFAULT_RANDOM_TIER = "uncommon";
const specialAdjectiveSet = new Set(["Палмерин", "Регги"]);
const BATTLE_TELEMETRY_ENDPOINT = "/__telemetry/battle";
const TELEMETRY_SCHEMA_VERSION = 1;
const TELEMETRY_EVENT_VERSION = 2;
const TELEMETRY_SESSION_STORAGE_KEY = "miniapp.telemetry.sessionId";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function pickRandomFrom(items, fallback = "") {
  if (!Array.isArray(items) || !items.length) {
    return fallback;
  }
  return items[Math.floor(Math.random() * items.length)] || fallback;
}

function safeParseJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function buildInitialSystemLogs(template) {
  const systemLogs = [...(template?.logs || [])].filter((item) => item?.type === "system");
  if (systemLogs.length > 0) {
    return [systemLogs[0]];
  }
  return [{ time: nowTime(), type: "system", text: "arena sync" }];
}

function sanitizePreset(rawPreset, templateKey = "club", classId = "warrior") {
  const fallbackClass = classId === "random"
    ? "warrior"
    : (characterPresetByClassId[classId] ? classId : "warrior");
  const fallbackPreset =
    templateKey === "random"
      ? buildRandomPreset()
      : { ...(characterPresetByClassId[fallbackClass] || characterPresetByClassId.warrior) };

  if (!rawPreset || typeof rawPreset !== "object") {
    return fallbackPreset;
  }
  const candidate = {};
  for (const slot of COMPONENT_SLOTS) {
    candidate[slot] = rawPreset[slot];
  }
  try {
    validatePresetOrThrow(candidate);
    return candidate;
  } catch {
    return fallbackPreset;
  }
}

function pickRandomTierByPreset(preset) {
  const adaptive = getPresetColorTierWeights(preset);
  const weightedTiers = COLOR_TIER_SEQUENCE.map((id) => ({
    id,
    weight: adaptive.weights[id] || 0,
  }));
  return pickByWeight(weightedTiers)?.id || DEFAULT_RANDOM_TIER;
}

function getTierStep(tier) {
  const idx = COLOR_TIER_SEQUENCE.indexOf(tier);
  return idx >= 0 ? idx : 0;
}

function clampTierStep(step) {
  return COLOR_TIER_SEQUENCE[clampNumber(step, 0, COLOR_TIER_SEQUENCE.length - 1)];
}

function pickRandomRegularAdjectiveWord() {
  const regularAdjectives = randomClassAdjectives.filter((word) => !specialAdjectiveSet.has(word));
  return regularAdjectives[Math.floor(Math.random() * regularAdjectives.length)] || "Дикий";
}

function buildAdjectiveFromTier(tier) {
  if (tier === "palmerin") {
    return "Палмерин";
  }
  if (tier === "reggae") {
    return "Регги";
  }
  return pickRandomRegularAdjectiveWord();
}

function createRandomIdentityFromPreset(preset) {
  const colorTier = pickRandomTierByPreset(preset);
  return {
    colorTier,
    adjective: buildAdjectiveFromTier(colorTier),
  };
}

function stepColorTier(currentTier, direction) {
  const currentStep = getTierStep(currentTier);
  const nextStep = currentStep + direction;
  return clampTierStep(nextStep);
}

class User {
  constructor({
    id,
    templateKey,
    classId,
    name,
    level = 1,
    rating = 0,
    rarity = "rare",
    logs = [],
    preset = null,
    colorTier = null,
    adjective = "",
    createdByAdmin = true,
    battlesTotal = 0,
    lastBattleTick = 0,
    winStreak = 0,
    loseStreak = 0,
  }) {
    this.id = Number.isFinite(id) ? Math.max(0, Math.floor(id)) : 0;
    this.templateKey = profileTemplateByParam[templateKey] ? templateKey : "club";
    this.classId = classId || profileTemplateByParam[this.templateKey].classId || "warrior";
    this.name = name || `USER #${this.id}`;
    this.level = Math.max(1, Number(level) || 1);
    this.rating = Math.max(0, Number(rating) || 0);
    this.rarity = rarity || "rare";
    this.preset = sanitizePreset(preset, this.templateKey, this.classId);
    this.classId = detectPresetDominantBaseClass(this.preset);
    this.colorTier = colorTier || (this.templateKey === "random" ? DEFAULT_RANDOM_TIER : "rare");
    this.adjective = adjective || "";
    this.logs = [...(logs || [])].slice(-MAX_STORED_LOGS_PER_USER);
    this.createdByAdmin = createdByAdmin === true;
    this.battlesTotal = Math.max(0, Number(battlesTotal) || 0);
    this.lastBattleTick = Math.max(0, Number(lastBattleTick) || 0);
    this.winStreak = Math.max(0, Number(winStreak) || 0);
    this.loseStreak = Math.max(0, Number(loseStreak) || 0);
  }

  static fromTemplate(templateKey, userId, createdByAdmin = true, spawnSelectionTelemetry = null) {
    const template = profileTemplateByParam[templateKey] || profileTemplateByParam.club;
    const preset = templateKey === "random"
      ? buildRandomPreset(60, spawnSelectionTelemetry)
      : { ...(characterPresetByClassId[template.classId] || characterPresetByClassId.warrior) };
    const randomIdentity = templateKey === "random" ? createRandomIdentityFromPreset(preset) : null;
    return new User({
      id: userId,
      templateKey,
      classId: template.classId,
      name: userId > 0 ? `${template.name} #${userId}` : template.name,
      level: Math.max(1, Number(template.level) || 1),
      rating: Math.max(0, Number(template.rating) || 0),
      rarity: template.rarity || "rare",
      logs: buildInitialSystemLogs(template),
      preset,
      colorTier: randomIdentity?.colorTier || null,
      adjective: randomIdentity?.adjective || "",
      createdByAdmin,
    });
  }

  static fromStored(item, index = 0) {
    const safeId = Number.isFinite(item?.id) ? Math.max(1, Math.floor(item.id)) : (index + 1);
    return new User({
      id: safeId,
      templateKey: item?.templateKey,
      classId: item?.classId,
      name: item?.name || `USER #${safeId}`,
      level: item?.level,
      rating: 0,
      rarity: item?.rarity,
      logs: [...(item?.logs || [])],
      preset: item?.preset,
      colorTier: item?.colorTier,
      adjective: item?.adjective,
      createdByAdmin: item?.createdByAdmin === true,
      battlesTotal: item?.battlesTotal,
      lastBattleTick: item?.lastBattleTick,
      winStreak: item?.winStreak,
      loseStreak: item?.loseStreak,
    });
  }

  withLogs(logs) {
    this.logs = [...(logs || [])].slice(-MAX_STORED_LOGS_PER_USER);
  }

  toRecord() {
    return {
      id: this.id,
      templateKey: this.templateKey,
      classId: this.classId,
      name: this.name,
      level: this.level,
      rarity: this.rarity,
      preset: this.preset,
      colorTier: this.colorTier,
      adjective: this.adjective,
      logs: (this.logs || []).slice(-MAX_STORED_LOGS_PER_USER),
      createdByAdmin: this.createdByAdmin === true,
      battlesTotal: this.battlesTotal,
      lastBattleTick: this.lastBattleTick,
      winStreak: this.winStreak,
      loseStreak: this.loseStreak,
    };
  }
}

function createUserFromTemplate(templateKey, userId, createdByAdmin = true, spawnSelectionTelemetry = null) {
  return User.fromTemplate(templateKey, userId, createdByAdmin, spawnSelectionTelemetry);
}

requestedProfileParam = getStartParam();
runtimeConfig = resolveRuntimeConfig();
requestedUserId = getRequestedUserId();
runtimeStore = loadRuntimeStore(requestedProfileParam);
selectedUser = pickActiveUser(runtimeStore, requestedUserId, requestedProfileParam);
selectedTemplateKey = profileTemplateByParam[requestedProfileParam] ? requestedProfileParam : "club";
selectedSession = selectedUser || createUserFromTemplate(selectedTemplateKey, 0, false);
spriteDebugMode = isSpriteDebugMode();
state = {
  id: selectedSession.id,
  userId: selectedUser ? selectedSession.id : null,
  templateKey: selectedSession.templateKey || selectedTemplateKey,
  classId: selectedSession.classId,
  preset: sanitizePreset(selectedSession.preset, selectedSession.templateKey, selectedSession.classId),
  colorTier: selectedSession.colorTier || (selectedSession.templateKey === "random" ? DEFAULT_RANDOM_TIER : "rare"),
  adjective: selectedSession.adjective || "",
  name: selectedSession.name,
  level: selectedSession.level,
  rating: selectedSession.rating || 0,
  rarity: selectedSession.rarity || "rare",
  logs: [...(selectedSession.logs || [])].slice(-MAX_UI_LOGS),
  backendStatsOverride: null,
};
activeUserId = state.userId;
hasActiveRuntimeUser = Number.isFinite(activeUserId);
telemetrySessionId = getOrCreateTelemetrySessionId();
telemetryPageSessionId = makeTelemetryId();
battleTelemetryTickId = Number(runtimeStore.gameState.telemetryTickId) || 0;

function buildDefaultUsers(initialTemplateKey = "club") {
  void initialTemplateKey;
  return [];
}

function computeBattlePower(level, hp, attack) {
  const safeLevel = Number(level) || 0;
  const safeHp = Math.max(1, Number(hp) || 1);
  const safeAttack = Math.max(1, Number(attack) || 1);
  return (safeAttack / (safeHp + BATTLE_POWER_K)) + (safeHp / (safeAttack + BATTLE_POWER_K)) + (BATTLE_W_LVL * safeLevel);
}

function computeMatchmakingScore(user, rngTrace = null) {
  const preset = buildProfilePreset(user);
  const stats = getPresetCombatStats(preset);
  const power = computeBattlePower(user.level, stats.hp, stats.attack);
  const jitterRoll = drawRandom(rngTrace, `mm.jitter.user_${user.id}`);
  const jitter = (jitterRoll - 0.5) * 0.2;
  return power + jitter;
}

function buildUserCombatSnapshot(user) {
  const preset = buildProfilePreset(user);
  const stats = getPresetCombatStats(preset);
  const power = computeBattlePower(user.level, stats.hp, stats.attack);
  return {
    user,
    preset,
    hp: stats.hp,
    attack: stats.attack,
    power,
  };
}

function pickWeightedCandidate(items, getWeight, rngTrace = null, rollLabel = "weighted_pick") {
  if (!items.length) {
    return { item: null, meta: { poolSize: 0, totalWeight: 0, roll: null, mode: "empty", selectedWeight: 0 } };
  }
  const weighted = items.map((item) => ({
    item,
    weight: Math.max(0, Number(getWeight(item)) || 0),
  }));
  const sum = weighted.reduce((acc, entry) => acc + entry.weight, 0);
  if (sum <= 0) {
    const uniformRoll = drawRandom(rngTrace, `${rollLabel}.uniform`);
    const idx = Math.floor(uniformRoll * items.length);
    const selected = items[idx] || null;
    return {
      item: selected,
      meta: {
        poolSize: items.length,
        totalWeight: 0,
        roll: Number(uniformRoll.toFixed(6)),
        mode: "uniform_fallback",
        selectedWeight: Number((weighted[idx]?.weight || 0).toFixed(6)),
      },
    };
  }
  const weightedRoll = drawRandom(rngTrace, `${rollLabel}.weighted`) * sum;
  let roll = weightedRoll;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return {
        item: entry.item,
        meta: {
          poolSize: items.length,
          totalWeight: Number(sum.toFixed(6)),
          roll: Number(weightedRoll.toFixed(6)),
          mode: "weighted",
          selectedWeight: Number(entry.weight.toFixed(6)),
        },
      };
    }
  }
  const selected = weighted[weighted.length - 1] || null;
  return {
    item: selected?.item || null,
    meta: {
      poolSize: items.length,
      totalWeight: Number(sum.toFixed(6)),
      roll: Number(weightedRoll.toFixed(6)),
      mode: "weighted_fallback",
      selectedWeight: Number((selected?.weight || 0).toFixed(6)),
    },
  };
}

function getComponentScore(componentId) {
  const component = componentById[componentId];
  if (!component) {
    return 0;
  }
  return (Number(component.stats?.hp) || 0) + (Number(component.stats?.attack) || 0);
}

function getComponentWeight(componentId) {
  const component = componentById[componentId];
  const weight = Number(component?.weight);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

function getSlotUpgradePool(slot, currentId) {
  const currentScore = getComponentScore(currentId);
  const pool = (randomPoolBySlot[slot] || []).filter((candidateId) => candidateId !== currentId);
  return pool.filter((candidateId) => getComponentScore(candidateId) > currentScore);
}

function getSlotDowngradePool(slot, currentId) {
  const currentScore = getComponentScore(currentId);
  const pool = (randomPoolBySlot[slot] || []).filter((candidateId) => candidateId !== currentId);
  return pool.filter((candidateId) => getComponentScore(candidateId) < currentScore);
}

function tryApplyWinnerDrop(user, powerDelta, rngTrace = null) {
  const preset = buildProfilePreset(user);
  const slotsWithUpgrades = COMPONENT_SLOTS
    .map((slot) => ({ slot, upgrades: getSlotUpgradePool(slot, preset[slot]) }))
    .filter((entry) => entry.upgrades.length > 0);
  if (!slotsWithUpgrades.length) {
    return {
      item: null,
      meta: {
        reason: "no_upgrade_pool",
        selection: {
          context: "winner_upgrade",
          slot: null,
          currentComponentId: null,
          candidatePoolSize: 0,
          candidateId: null,
          gain: null,
          drop: null,
          componentWeight: null,
          finalWeight: null,
          antiJumpWeight: null,
          roll: null,
          totalWeight: null,
          selectionMode: "empty_pool",
        },
      },
    };
  }

  const dropChance = clampNumber(0.28 + (powerDelta * 0.15), 0.2, 0.8);
  const dropRoll = drawRandom(rngTrace, "winner.drop.roll");
  if (dropRoll > dropChance) {
    return {
      item: null,
      meta: {
        reason: "chance_failed",
        dropChance: Number(dropChance.toFixed(4)),
        dropRoll: Number(dropRoll.toFixed(6)),
        selection: {
          context: "winner_upgrade",
          slot: null,
          currentComponentId: null,
          candidatePoolSize: 0,
          candidateId: null,
          gain: null,
          drop: null,
          componentWeight: null,
          finalWeight: null,
          antiJumpWeight: null,
          roll: Number(dropRoll.toFixed(6)),
          totalWeight: null,
          selectionMode: "chance_failed",
        },
      },
    };
  }

  const slotIdx = Math.floor(drawRandom(rngTrace, "winner.drop.slot_roll") * slotsWithUpgrades.length);
  const slotEntry = slotsWithUpgrades[slotIdx];
  const currentComponentId = preset[slotEntry.slot];
  const currentScore = getComponentScore(currentComponentId);
  const upgradeCandidates = slotEntry.upgrades.map((candidateId) => {
    const gain = Math.max(1, getComponentScore(candidateId) - currentScore);
    const antiJumpWeight = 1 / (gain * gain);
    const componentWeight = getComponentWeight(candidateId);
    const finalWeight = antiJumpWeight * componentWeight;
    return {
      componentId: candidateId,
      gain,
      antiJumpWeight: Number(antiJumpWeight.toFixed(6)),
      componentWeight: Number(componentWeight.toFixed(6)),
      finalWeight: Number(finalWeight.toFixed(6)),
    };
  });
  const pickedUpgradeResult = pickWeightedCandidate(
    upgradeCandidates,
    (candidate) => candidate.finalWeight,
    rngTrace,
    "winner.drop.component_roll",
  );
  const pickedUpgrade = pickedUpgradeResult.item;
  if (!pickedUpgrade?.componentId) {
    return { item: null, meta: { reason: "no_component_selected" } };
  }

  const nextPreset = { ...preset, [slotEntry.slot]: pickedUpgrade.componentId };
  try {
    validatePresetOrThrow(nextPreset);
  } catch {
    return { item: null, meta: { reason: "validation_failed" } };
  }

  user.preset = nextPreset;
  user.classId = detectPresetDominantBaseClass(nextPreset);
  return {
    item: { slot: slotEntry.slot, componentId: pickedUpgrade.componentId },
    meta: {
      reason: "applied",
      dropChance: Number(dropChance.toFixed(4)),
      dropRoll: Number(dropRoll.toFixed(6)),
      slotPoolSize: slotsWithUpgrades.length,
      selection: {
        context: "winner_upgrade",
        slot: slotEntry.slot,
        currentComponentId,
        candidatePoolSize: upgradeCandidates.length,
        candidateId: pickedUpgrade.componentId,
        gain: pickedUpgrade.gain,
        drop: null,
        componentWeight: pickedUpgrade.componentWeight,
        finalWeight: pickedUpgrade.finalWeight,
        antiJumpWeight: pickedUpgrade.antiJumpWeight,
        roll: pickedUpgradeResult.meta.roll,
        totalWeight: pickedUpgradeResult.meta.totalWeight,
        selectionMode: pickedUpgradeResult.meta.mode,
      },
    },
  };
}

function tryApplyLoserDowngrade(user, powerDelta, rngTrace = null) {
  const preset = buildProfilePreset(user);
  const slotsWithDowngrades = COMPONENT_SLOTS
    .map((slot) => ({ slot, downgrades: getSlotDowngradePool(slot, preset[slot]) }))
    .filter((entry) => entry.downgrades.length > 0);
  if (!slotsWithDowngrades.length) {
    return {
      item: null,
      meta: {
        reason: "no_downgrade_pool",
        selection: {
          context: "loser_downgrade",
          slot: null,
          currentComponentId: null,
          candidatePoolSize: 0,
          candidateId: null,
          gain: null,
          drop: null,
          componentWeight: null,
          finalWeight: null,
          antiJumpWeight: null,
          roll: null,
          totalWeight: null,
          selectionMode: "empty_pool",
        },
      },
    };
  }

  const loseStreak = Math.max(0, Number(user.loseStreak) || 0);
  const streakShield = Math.min(LOSER_STREAK_SHIELD_MAX, loseStreak * LOSER_STREAK_SHIELD_PER_LOSS);
  const downgradeChance = clampNumber((0.16 + (powerDelta * 0.2)) - streakShield, 0.04, 0.7);
  const downgradeRoll = drawRandom(rngTrace, "loser.downgrade.roll");
  if (downgradeRoll > downgradeChance) {
    return {
      item: null,
      meta: {
        reason: "chance_failed",
        downgradeChance: Number(downgradeChance.toFixed(4)),
        downgradeRoll: Number(downgradeRoll.toFixed(6)),
        streakShield: Number(streakShield.toFixed(4)),
        selection: {
          context: "loser_downgrade",
          slot: null,
          currentComponentId: null,
          candidatePoolSize: 0,
          candidateId: null,
          gain: null,
          drop: null,
          componentWeight: null,
          finalWeight: null,
          antiJumpWeight: null,
          roll: Number(downgradeRoll.toFixed(6)),
          totalWeight: null,
          selectionMode: "chance_failed",
        },
      },
    };
  }

  const slotIdx = Math.floor(drawRandom(rngTrace, "loser.downgrade.slot_roll") * slotsWithDowngrades.length);
  const slotEntry = slotsWithDowngrades[slotIdx];
  const currentComponentId = preset[slotEntry.slot];
  const currentScore = getComponentScore(currentComponentId);
  const downgradeCandidates = slotEntry.downgrades.map((candidateId) => {
    const drop = Math.max(1, currentScore - getComponentScore(candidateId));
    const antiJumpWeight = 1 / (drop * drop * drop);
    const componentWeight = getComponentWeight(candidateId);
    const finalWeight = antiJumpWeight * componentWeight;
    return {
      componentId: candidateId,
      drop,
      antiJumpWeight: Number(antiJumpWeight.toFixed(6)),
      componentWeight: Number(componentWeight.toFixed(6)),
      finalWeight: Number(finalWeight.toFixed(6)),
    };
  });
  const pickedDowngradeResult = pickWeightedCandidate(
    downgradeCandidates,
    (candidate) => candidate.finalWeight,
    rngTrace,
    "loser.downgrade.component_roll",
  );
  const pickedDowngrade = pickedDowngradeResult.item;
  if (!pickedDowngrade?.componentId) {
    return { item: null, meta: { reason: "no_component_selected" } };
  }

  const nextPreset = { ...preset, [slotEntry.slot]: pickedDowngrade.componentId };
  try {
    validatePresetOrThrow(nextPreset);
  } catch {
    return { item: null, meta: { reason: "validation_failed" } };
  }

  user.preset = nextPreset;
  user.classId = detectPresetDominantBaseClass(nextPreset);
  return {
    item: { slot: slotEntry.slot, componentId: pickedDowngrade.componentId },
    meta: {
      reason: "applied",
      downgradeChance: Number(downgradeChance.toFixed(4)),
      downgradeRoll: Number(downgradeRoll.toFixed(6)),
      slotPoolSize: slotsWithDowngrades.length,
      streakShield: Number(streakShield.toFixed(4)),
      selection: {
        context: "loser_downgrade",
        slot: slotEntry.slot,
        currentComponentId,
        candidatePoolSize: downgradeCandidates.length,
        candidateId: pickedDowngrade.componentId,
        gain: null,
        drop: pickedDowngrade.drop,
        componentWeight: pickedDowngrade.componentWeight,
        finalWeight: pickedDowngrade.finalWeight,
        antiJumpWeight: pickedDowngrade.antiJumpWeight,
        roll: pickedDowngradeResult.meta.roll,
        totalWeight: pickedDowngradeResult.meta.totalWeight,
        selectionMode: pickedDowngradeResult.meta.mode,
      },
    },
  };
}

function computeWinnerLevelGain(winnerWinProbability) {
  if (winnerWinProbability <= LEVEL_GAIN_UPSET_THRESHOLD) {
    return 2;
  }
  if (winnerWinProbability <= LEVEL_GAIN_BALANCED_THRESHOLD) {
    return 1;
  }
  return 0;
}

function updateUserAfterBattleVictory(winner, powerDelta, winnerWinProbability, rngTrace = null) {
  const levelGain = computeWinnerLevelGain(winnerWinProbability);
  winner.level = Math.max(1, Number(winner.level) || 1) + levelGain;
  winner.winStreak = (Number(winner.winStreak) || 0) + 1;
  winner.loseStreak = 0;
  const dropResult = tryApplyWinnerDrop(winner, powerDelta, rngTrace);
  const item = dropResult.item;
  let colorChanged = false;
  let colorMeta = { reason: "not_random_template" };
  if (winner.templateKey === "random") {
    const upChance = clampNumber(0.18 + (powerDelta * 0.12), 0.08, 0.55);
    const upRoll = drawRandom(rngTrace, "winner.color.roll");
    if (upRoll < upChance) {
      const nextTier = stepColorTier(winner.colorTier || DEFAULT_RANDOM_TIER, 1);
      if (nextTier !== winner.colorTier) {
        winner.colorTier = nextTier;
        winner.adjective = buildAdjectiveFromTier(nextTier);
        colorChanged = true;
        colorMeta = {
          reason: "applied",
          upChance: Number(upChance.toFixed(4)),
          upRoll: Number(upRoll.toFixed(6)),
          nextTier,
        };
      } else {
        colorMeta = {
          reason: "at_cap",
          upChance: Number(upChance.toFixed(4)),
          upRoll: Number(upRoll.toFixed(6)),
        };
      }
    } else {
      colorMeta = {
        reason: "chance_failed",
        upChance: Number(upChance.toFixed(4)),
        upRoll: Number(upRoll.toFixed(6)),
      };
    }
  }
  return {
    item,
    colorChanged,
    levelGain,
    winnerWinProbability: Number(winnerWinProbability.toFixed(4)),
    dropMeta: dropResult.meta,
    colorMeta,
  };
}

function updateUserAfterBattleDefeat(loser, powerDelta, loserWinProbability, rngTrace = null) {
  loser.winStreak = 0;
  loser.loseStreak = (Number(loser.loseStreak) || 0) + 1;
  const downgradeResult = tryApplyLoserDowngrade(loser, powerDelta, rngTrace);
  const item = downgradeResult.item;
  let colorChanged = false;
  let colorMeta = { reason: "not_random_template" };
  if (loser.templateKey === "random") {
    const streakShield = Math.min(LOSER_STREAK_SHIELD_MAX, (Number(loser.loseStreak) || 0) * LOSER_STREAK_SHIELD_PER_LOSS);
    const downChance = clampNumber((0.14 + (powerDelta * 0.1)) - streakShield, 0.02, 0.45);
    const downRoll = drawRandom(rngTrace, "loser.color.roll");
    if (downRoll < downChance) {
      const nextTier = stepColorTier(loser.colorTier || DEFAULT_RANDOM_TIER, -1);
      if (nextTier !== loser.colorTier) {
        loser.colorTier = nextTier;
        loser.adjective = buildAdjectiveFromTier(nextTier);
        colorChanged = true;
        colorMeta = {
          reason: "applied",
          downChance: Number(downChance.toFixed(4)),
          downRoll: Number(downRoll.toFixed(6)),
          nextTier,
          streakShield: Number(streakShield.toFixed(4)),
        };
      } else {
        colorMeta = {
          reason: "at_floor",
          downChance: Number(downChance.toFixed(4)),
          downRoll: Number(downRoll.toFixed(6)),
          streakShield: Number(streakShield.toFixed(4)),
        };
      }
    } else {
      colorMeta = {
        reason: "chance_failed",
        downChance: Number(downChance.toFixed(4)),
        downRoll: Number(downRoll.toFixed(6)),
        streakShield: Number(streakShield.toFixed(4)),
      };
    }
  }
  return {
    item,
    colorChanged,
    levelGain: 0,
    loserWinProbability: Number(loserWinProbability.toFixed(4)),
    downgradeMeta: downgradeResult.meta,
    colorMeta,
  };
}

function runBattleForPair(firstEntry, secondEntry, pairingMeta = null) {
  const rngTrace = [];
  const firstUser = firstEntry.user;
  const secondUser = secondEntry.user;
  const first = buildUserCombatSnapshot(firstUser);
  const second = buildUserCombatSnapshot(secondUser);
  const firstBefore = snapshotUserForBattle(firstUser);
  const secondBefore = snapshotUserForBattle(secondUser);
  const pFirst = 1 / (1 + Math.exp(second.power - first.power));
  const pSecond = 1 - pFirst;
  const outcomeRoll = drawRandom(rngTrace, "battle.outcome.roll");
  const firstWins = outcomeRoll < pFirst;
  const winner = firstWins ? first : second;
  const loser = firstWins ? second : first;
  const powerDelta = Math.abs(first.power - second.power);
  const winnerBefore = firstWins ? firstBefore : secondBefore;
  const loserBefore = firstWins ? secondBefore : firstBefore;
  const winnerWinProbability = firstWins ? pFirst : pSecond;
  const loserWinProbability = firstWins ? pSecond : pFirst;

  const winnerUpdates = updateUserAfterBattleVictory(winner.user, powerDelta, winnerWinProbability, rngTrace);
  const loserUpdates = updateUserAfterBattleDefeat(loser.user, powerDelta, loserWinProbability, rngTrace);
  return {
    pair: {
      leftUserId: firstUser.id,
      rightUserId: secondUser.id,
      leftMmScore: Number(firstEntry.mmScore.toFixed(4)),
      rightMmScore: Number(secondEntry.mmScore.toFixed(4)),
      leftWinProbability: Number(pFirst.toFixed(4)),
      rightWinProbability: Number(pSecond.toFixed(4)),
      matchKind: pairingMeta?.matchKind || "strict",
      deltaLimitUsed: Number((pairingMeta?.deltaLimitUsed ?? 0).toFixed(4)),
      leftWasPriority: Boolean(pairingMeta?.leftWasPriority),
      rightWasPriority: Boolean(pairingMeta?.rightWasPriority),
    },
    winner: winner.user,
    loser: loser.user,
    powerDelta,
    winnerUpdates,
    loserUpdates,
    winnerBefore,
    loserBefore,
    winnerAfter: snapshotUserForBattle(winner.user),
    loserAfter: snapshotUserForBattle(loser.user),
    rngTrace,
  };
}

function shuffleUsers(users, rngTrace = null) {
  const next = [...users];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(drawRandom(rngTrace, `mm.shuffle.i${i}`) * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function appendLogToUser(user, logItem) {
  const nextLogs = [...(user.logs || []), logItem];
  if (typeof user.withLogs === "function") {
    user.withLogs(nextLogs);
  } else {
    user.logs = nextLogs.slice(-MAX_STORED_LOGS_PER_USER);
  }
}

function buildComponentDetails(preset) {
  return COMPONENT_SLOTS.map((slot) => {
    const id = preset?.[slot] || null;
    const component = id ? componentById[id] : null;
    return {
      slot,
      id,
      baseClass: component?.baseClass || "shared",
      stats: {
        hp: Number(component?.stats?.hp) || 0,
        attack: Number(component?.stats?.attack) || 0,
      },
    };
  });
}

function drawRandom(rngTrace, label) {
  const value = Math.random();
  if (Array.isArray(rngTrace)) {
    rngTrace.push({
      label,
      value: Number(value.toFixed(6)),
    });
  }
  return value;
}

function computeStateDiff(before, after) {
  if (!before || !after) {
    return {};
  }
  const diff = {
    changed: false,
    fields: {},
    componentChanges: [],
  };

  const fieldPairs = [
    ["level", before.level, after.level],
    ["rating", before.rating, after.rating],
    ["winStreak", before.winStreak, after.winStreak],
    ["loseStreak", before.loseStreak, after.loseStreak],
    ["classId", before.classId, after.classId],
    ["colorTier", before.colorTier, after.colorTier],
    ["adjective", before.adjective, after.adjective],
    ["stats.hp", before.stats?.hp, after.stats?.hp],
    ["stats.attack", before.stats?.attack, after.stats?.attack],
    ["stats.power", before.stats?.power, after.stats?.power],
  ];

  for (const [key, b, a] of fieldPairs) {
    if (b !== a) {
      diff.changed = true;
      diff.fields[key] = { before: b, after: a };
    }
  }

  const beforeBySlot = new Map((before.components || []).map((item) => [item.slot, item.id]));
  const afterBySlot = new Map((after.components || []).map((item) => [item.slot, item.id]));
  for (const slot of COMPONENT_SLOTS) {
    const prev = beforeBySlot.get(slot) || null;
    const next = afterBySlot.get(slot) || null;
    if (prev !== next) {
      diff.changed = true;
      diff.componentChanges.push({ slot, before: prev, after: next });
    }
  }

  return diff;
}

function buildMatchmakingPoolSnapshot(queue, maxDelta) {
  return queue.map((entry) => {
    const candidates = queue
      .filter((other) => other.user.id !== entry.user.id)
      .map((other) => {
        const delta = Math.abs(entry.mmScore - other.mmScore);
        return {
          userId: other.user.id,
          name: other.user.name,
          mmScore: Number(other.mmScore.toFixed(4)),
          delta: Number(delta.toFixed(4)),
          withinDelta: delta <= maxDelta,
        };
      })
      .sort((a, b) => a.delta - b.delta || a.userId - b.userId);
    return {
      userId: entry.user.id,
      name: entry.user.name,
      mmScore: Number(entry.mmScore.toFixed(4)),
      battlesTotal: Number(entry.user.battlesTotal) || 0,
      candidates,
    };
  });
}

function buildBattlePairs(queue, maxDelta, currentTick) {
  const pairDecisions = [];
  const pairs = [];
  const unmatchedIds = new Set(queue.map((entry) => entry.user.id));
  const queueById = new Map(queue.map((entry) => [entry.user.id, entry]));
  const sortedBattleTotals = queue.map((entry) => Number(entry.user.battlesTotal) || 0).sort((a, b) => a - b);
  const quantileIndex = Math.max(0, Math.floor((sortedBattleTotals.length - 1) * MATCHMAKING_PRIORITY_QUANTILE));
  const lowBattleThreshold = sortedBattleTotals[quantileIndex] ?? 0;
  const isPriorityUser = (entry) => {
    const battles = Number(entry.user.battlesTotal) || 0;
    const staleTicks = Math.max(0, Number(currentTick) - (Number(entry.user.lastBattleTick) || 0));
    return battles <= lowBattleThreshold || staleTicks >= MATCHMAKING_STALE_TICKS;
  };
  const relaxedDeltaLevels = MATCHMAKING_RELAX_OFFSETS.map((offset) => Number((maxDelta + offset).toFixed(4)));
  let effectiveMaxDelta = maxDelta;
  let forcedPairsCount = 0;
  const passStats = [];
  const priorityQueue = [...queue].sort((a, b) => {
    const battlesA = Number(a.user.battlesTotal) || 0;
    const battlesB = Number(b.user.battlesTotal) || 0;
    if (battlesA !== battlesB) {
      return battlesA - battlesB;
    }
    const lastTickA = Number(a.user.lastBattleTick) || 0;
    const lastTickB = Number(b.user.lastBattleTick) || 0;
    if (lastTickA !== lastTickB) {
      return lastTickA - lastTickB;
    }
    if (a.mmScore !== b.mmScore) {
      return a.mmScore - b.mmScore;
    }
    return a.user.id - b.user.id;
  });

  for (let passIndex = 0; passIndex < relaxedDeltaLevels.length; passIndex += 1) {
    const currentMaxDelta = relaxedDeltaLevels[passIndex];
    const onlyPrioritySet = passIndex > 0;
    let acceptedThisPass = 0;
    for (const left of priorityQueue) {
      if (!unmatchedIds.has(left.user.id)) {
        continue;
      }
      const leftPriority = isPriorityUser(left);
      if (onlyPrioritySet && !leftPriority) {
        continue;
      }
      let best = null;
      for (const rightUserId of unmatchedIds) {
        if (rightUserId === left.user.id) {
          continue;
        }
        const right = queueById.get(rightUserId);
        const rightPriority = isPriorityUser(right);
        if (onlyPrioritySet && !(leftPriority || rightPriority)) {
          continue;
        }
        const delta = Math.abs(left.mmScore - right.mmScore);
        if (delta > currentMaxDelta) {
          continue;
        }
        if (!best || delta < best.delta) {
          best = { entry: right, delta, rightPriority };
          continue;
        }
        if (best && delta === best.delta) {
          const bestBattles = Number(best.entry.user.battlesTotal) || 0;
          const nextBattles = Number(right.user.battlesTotal) || 0;
          if (nextBattles < bestBattles) {
            best = { entry: right, delta };
            continue;
          }
          if (nextBattles === bestBattles && right.user.id < best.entry.user.id) {
            best = { entry: right, delta, rightPriority };
          }
        }
      }
      if (!best) {
        continue;
      }

      unmatchedIds.delete(left.user.id);
      unmatchedIds.delete(best.entry.user.id);
      pairDecisions.push({
        leftUserId: left.user.id,
        rightUserId: best.entry.user.id,
        leftMmScore: Number(left.mmScore.toFixed(4)),
        rightMmScore: Number(best.entry.mmScore.toFixed(4)),
        delta: Number(best.delta.toFixed(4)),
        decision: "accepted",
        matchKind: passIndex === 0 ? "strict" : "relaxed",
        deltaLimitUsed: Number(currentMaxDelta.toFixed(4)),
        leftWasPriority: leftPriority,
        rightWasPriority: best.rightPriority,
      });
      pairs.push({
        left,
        right: best.entry,
        meta: {
          matchKind: passIndex === 0 ? "strict" : "relaxed",
          deltaLimitUsed: currentMaxDelta,
          leftWasPriority: leftPriority,
          rightWasPriority: best.rightPriority,
        },
      });
      acceptedThisPass += 1;
    }
    passStats.push({
      passIndex: passIndex + 1,
      deltaLimit: Number(currentMaxDelta.toFixed(4)),
      onlyPrioritySet,
      pairsAccepted: acceptedThisPass,
    });
    if (acceptedThisPass > 0) {
      effectiveMaxDelta = currentMaxDelta;
    }
    if (unmatchedIds.size < 2) {
      break;
    }
  }

  if (unmatchedIds.size >= 2) {
    const unmatchedQueue = [...unmatchedIds]
      .map((id) => queueById.get(id))
      .filter(Boolean);
    const forcedCandidates = unmatchedQueue.filter((entry) => isPriorityUser(entry));
    for (const left of forcedCandidates) {
      if (forcedPairsCount >= MATCHMAKING_FORCED_PAIR_CAP) {
        break;
      }
      if (!unmatchedIds.has(left.user.id)) {
        continue;
      }
      let best = null;
      for (const rightUserId of unmatchedIds) {
        if (rightUserId === left.user.id) {
          continue;
        }
        const right = queueById.get(rightUserId);
        const delta = Math.abs(left.mmScore - right.mmScore);
        if (!best || delta < best.delta) {
          best = { entry: right, delta };
        }
      }
      if (!best) {
        continue;
      }
      unmatchedIds.delete(left.user.id);
      unmatchedIds.delete(best.entry.user.id);
      pairDecisions.push({
        leftUserId: left.user.id,
        rightUserId: best.entry.user.id,
        leftMmScore: Number(left.mmScore.toFixed(4)),
        rightMmScore: Number(best.entry.mmScore.toFixed(4)),
        delta: Number(best.delta.toFixed(4)),
        decision: "accepted",
        matchKind: "forced",
        deltaLimitUsed: Number(best.delta.toFixed(4)),
        leftWasPriority: true,
        rightWasPriority: isPriorityUser(best.entry),
      });
      pairs.push({
        left,
        right: best.entry,
        meta: {
          matchKind: "forced",
          deltaLimitUsed: best.delta,
          leftWasPriority: true,
          rightWasPriority: isPriorityUser(best.entry),
        },
      });
      forcedPairsCount += 1;
      effectiveMaxDelta = Math.max(effectiveMaxDelta, best.delta);
    }

    const unmatchedAfterForced = [...unmatchedIds]
      .map((id) => queueById.get(id))
      .filter(Boolean);
    for (const left of unmatchedAfterForced) {
      let nearest = null;
      for (const right of unmatchedAfterForced) {
        if (left.user.id === right.user.id) {
          continue;
        }
        const delta = Math.abs(left.mmScore - right.mmScore);
        if (!nearest || delta < nearest.delta) {
          nearest = { entry: right, delta };
        }
      }
      if (!nearest) {
        continue;
      }
      pairDecisions.push({
        leftUserId: left.user.id,
        rightUserId: nearest.entry.user.id,
        leftMmScore: Number(left.mmScore.toFixed(4)),
        rightMmScore: Number(nearest.entry.mmScore.toFixed(4)),
        delta: Number(nearest.delta.toFixed(4)),
        decision: "rejected",
        reason: forcedPairsCount >= MATCHMAKING_FORCED_PAIR_CAP ? "forced_cap_reached" : "delta_exceeded",
      });
    }
  }

  const unmatchedDetails = [...unmatchedIds]
    .map((id) => queueById.get(id))
    .filter(Boolean)
    .map((entry) => ({
      userId: entry.user.id,
      name: entry.user.name,
      isPriority: isPriorityUser(entry),
      unmatchedReason: forcedPairsCount >= MATCHMAKING_FORCED_PAIR_CAP ? "forced_cap_reached" : "no_candidate_within_relaxed",
    }));

  return {
    pairs,
    pairDecisions,
    unmatchedUserIds: [...unmatchedIds].sort((a, b) => a - b),
    effectiveMaxDelta,
    passStats,
    unmatchedDetails,
    priorityLowBattleThreshold: lowBattleThreshold,
    forcedPairsCount,
  };
}

function snapshotUserForBattle(user) {
  const preset = buildProfilePreset(user);
  const stats = getPresetCombatStats(preset);
  const hp = Math.max(1, Number(stats.hp) || 1);
  const attack = Math.max(1, Number(stats.attack) || 1);
  return {
    userId: user.id,
    name: user.name,
    templateKey: user.templateKey,
    classId: user.classId,
    level: Number(user.level) || 1,
    rating: Number(user.rating) || 0,
    battlesTotal: Number(user.battlesTotal) || 0,
    lastBattleTick: Number(user.lastBattleTick) || 0,
    winStreak: Number(user.winStreak) || 0,
    loseStreak: Number(user.loseStreak) || 0,
    colorTier: user.colorTier || null,
    adjective: user.adjective || "",
    stats: {
      hp,
      attack,
      power: computeBattlePower(user.level, hp, attack),
    },
    preset,
    components: buildComponentDetails(preset),
  };
}

function postBattleTelemetry(event) {
  const runId = Math.max(0, Number(runtimeStore.gameState.telemetryRunId) || 0);
  const tickId = Number.isFinite(event?.tickId)
    ? Number(event.tickId)
    : (Math.max(0, Number(runtimeStore.gameState.telemetryTickId) || 0));
  const telemetryEvent = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    eventVersion: TELEMETRY_EVENT_VERSION,
    sessionId: telemetrySessionId,
    pageSessionId: telemetryPageSessionId,
    runId,
    tickId,
    templateKey: state.templateKey || "club",
    ...event,
  };
  const payload = JSON.stringify(telemetryEvent);
  const shouldUseKeepalive =
    telemetryEvent.type === "game_finished" && payload.length <= 60 * 1024;
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  };
  if (shouldUseKeepalive) {
    requestOptions.keepalive = true;
  }
  fetch(BATTLE_TELEMETRY_ENDPOINT, requestOptions).catch(() => {
    // Logging transport is best-effort and must not affect gameplay.
  });
}

function buildProfilePreset(user) {
  if (!user) {
    return characterPresetByClassId.warrior;
  }
  if (user.preset && typeof user.preset === "object") {
    return sanitizePreset(user.preset, user.templateKey, user.classId);
  }
  if (user.templateKey === "random") {
    return buildRandomPreset();
  }
  return sanitizePreset(null, user.templateKey, user.classId);
}

function buildLeaderboardEntries(users) {
  const entries = users.map((user) => {
    const preset = buildProfilePreset(user);
    const combatStats = getPresetCombatStats(preset);
    const hp = Math.max(1, Number(combatStats.hp) || 1);
    const attack = Math.max(1, Number(combatStats.attack) || 1);
    const level = Number(user.level) || 1;
    const power = computeBattlePower(level, hp, attack);
    return {
      userId: user.id,
      classId: user.classId,
      name: user.name,
      level,
      hp,
      attack,
      power,
    };
  });

  entries.sort((a, b) => b.power - a.power || b.level - a.level || b.attack - a.attack || a.userId - b.userId);
  return entries.map((entry, index) => ({
    ...entry,
    rating: index + 1,
  }));
}

function applyRatingsFromLeaderboard(users, leaderboardEntries) {
  const ratingByUserId = new Map(leaderboardEntries.map((entry) => [entry.userId, entry.rating]));
  for (const user of users) {
    user.rating = ratingByUserId.get(user.id) || user.rating || 0;
  }
}

function migrateLegacyProfilesToUsers(legacyProfiles) {
  const users = [];
  let nextId = 1;
  for (const [legacyKey, legacyProfile] of Object.entries(legacyProfiles || {})) {
    if (!legacyProfile || typeof legacyProfile !== "object") {
      continue;
    }
    const templateKey = profileTemplateByParam[legacyKey] ? legacyKey : "club";
    users.push(new User({
      id: nextId,
      templateKey,
      classId: legacyProfile.classId || profileTemplateByParam[templateKey].classId,
      name: legacyProfile.name || `${profileTemplateByParam[templateKey].name} #${nextId}`,
      level: Math.max(1, Number(legacyProfile.level) || 1),
      rating: 0,
      rarity: legacyProfile.rarity || profileTemplateByParam[templateKey].rarity || "rare",
      logs: [...(legacyProfile.logs || [])],
      createdByAdmin: true,
    }));
    nextId += 1;
  }
  return users;
}

function pickActiveUser(runtimeStore, requestedUserId, requestedTemplateKey) {
  const byId = runtimeStore.users.find((user) => user.id === requestedUserId);
  if (byId) {
    return byId;
  }
  if (profileTemplateByParam[requestedTemplateKey]) {
    const byTemplate = runtimeStore.users.find((user) => user.templateKey === requestedTemplateKey);
    if (byTemplate) {
      return byTemplate;
    }
  }
  return runtimeStore.users[0];
}

function findUserById(users, userId) {
  return users.find((user) => user.id === userId) || null;
}

function loadRuntimeStore(initialTemplateKey = "club") {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJson(rawValue);
  const gameState = {
    finished: false,
    battlesStarted: false,
    winnerUserId: null,
    frozenLeaderboard: null,
    telemetryRunId: 0,
    telemetryTickId: 0,
  };
  let users = [];
  let nextUserId = 1;

  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.users)) {
      users = parsed.users
        .filter((item) => item && typeof item === "object")
        .map((item, index) => User.fromStored(item, index))
        .filter((user) => user.createdByAdmin === true);
      nextUserId = Math.max(1, Number(parsed.nextUserId) || (users.length + 1));
    }

    const savedGame = parsed.game;
    if (savedGame && typeof savedGame === "object") {
      gameState.finished = Boolean(savedGame.finished);
      gameState.battlesStarted = Boolean(savedGame.battlesStarted);
      gameState.winnerUserId = Number.isFinite(savedGame.winnerUserId)
        ? Number(savedGame.winnerUserId)
        : null;
      if (Array.isArray(savedGame.frozenLeaderboard)) {
        gameState.frozenLeaderboard = savedGame.frozenLeaderboard;
      }
      gameState.telemetryRunId = Math.max(0, Number(savedGame.telemetryRunId) || 0);
      gameState.telemetryTickId = Math.max(0, Number(savedGame.telemetryTickId) || 0);
      if (!gameState.winnerUserId && Number.isFinite(savedGame.winnerKey)) {
        gameState.winnerUserId = Number(savedGame.winnerKey);
      }
    }
  }

  if (!users.length) {
    users = buildDefaultUsers(initialTemplateKey);
    nextUserId = users.length + 1;
  }

  const hasModernFrozenLeaderboard =
    users.length > 0 &&
    Array.isArray(gameState.frozenLeaderboard) &&
    gameState.frozenLeaderboard.every((entry) => Number.isFinite(entry?.userId)) &&
    gameState.frozenLeaderboard.every((entry) => findUserById(users, entry.userId));
  const leaderboard = hasModernFrozenLeaderboard
    ? gameState.frozenLeaderboard
    : buildLeaderboardEntries(users);
  if (!hasModernFrozenLeaderboard) {
    gameState.frozenLeaderboard = null;
    if (!findUserById(users, gameState.winnerUserId)) {
      gameState.winnerUserId = null;
    }
  }
  applyRatingsFromLeaderboard(users, leaderboard);

  return {
    users,
    nextUserId,
    gameState,
  };
}

function persistRuntimeStore(runtimeStore) {
  const payload = {
    users: runtimeStore.users.map((user) => user.toRecord()),
    nextUserId: runtimeStore.nextUserId,
    game: {
      finished: Boolean(runtimeStore.gameState.finished),
      battlesStarted: Boolean(runtimeStore.gameState.battlesStarted),
      winnerUserId: runtimeStore.gameState.winnerUserId || null,
      frozenLeaderboard: runtimeStore.gameState.frozenLeaderboard || null,
      telemetryRunId: Math.max(0, Number(runtimeStore.gameState.telemetryRunId) || 0),
      telemetryTickId: Math.max(0, Number(runtimeStore.gameState.telemetryTickId) || 0),
    },
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function createRandomUser(runtimeStore) {
  const templateKey = "random";
  const spawnSelectionTelemetry = [];
  const user = createUserFromTemplate(templateKey, runtimeStore.nextUserId, true, spawnSelectionTelemetry);
  runtimeStore.nextUserId += 1;
  runtimeStore.users.push(user);
  if (!runtimeStore.gameState.finished) {
    const leaderboard = buildLeaderboardEntries(runtimeStore.users);
    applyRatingsFromLeaderboard(runtimeStore.users, leaderboard);
  }
  persistRuntimeStore(runtimeStore);
  postBattleTelemetry({
    type: "component_roll",
    ts: new Date().toISOString(),
    context: "spawn",
    userId: user.id,
    userName: user.name,
    templateKey: user.templateKey,
    classId: user.classId,
    selections: spawnSelectionTelemetry,
  });
  return user;
}

function clearAllUsers(runtimeStore) {
  runtimeStore.users = [];
  runtimeStore.nextUserId = 1;
  runtimeStore.gameState.finished = false;
  runtimeStore.gameState.battlesStarted = false;
  runtimeStore.gameState.winnerUserId = null;
  runtimeStore.gameState.frozenLeaderboard = null;
  runtimeStore.gameState.telemetryTickId = 0;
  battleTelemetryTickId = 0;
  persistRuntimeStore(runtimeStore);
}

function buildCombatLogText(forcedResult = null) {
  const combatResult = forcedResult === "victory" || forcedResult === "defeat"
    ? forcedResult
    : (Math.random() >= 0.5 ? "victory" : "defeat");
  const isVictory = combatResult === "victory";
  const outcomeLabel = isVictory ? "победа" : "поражение";
  const phrase = isVictory
    ? pickRandomFrom(combatOutcomePhrases.victory, "удар прошел")
    : pickRandomFrom(combatOutcomePhrases.defeat, "удар смазан");
  return {
    combatResult,
    text: `${outcomeLabel}: ${phrase}`,
  };
}

function buildAdjectiveMeta(text, colorTier) {
  if (colorTier === "palmerin" || text === "Палмерин") {
    return {
      text: "Палмерин",
      color: "#fe0f0e",
      isReggae: false,
      placeAfterClass: false,
      colorTier: "palmerin",
    };
  }
  if (colorTier === "reggae" || text === "Регги") {
    return {
      text: "Регги",
      color: null,
      isReggae: true,
      placeAfterClass: false,
      colorTier: "reggae",
    };
  }
  return {
    text: text || pickRandomRegularAdjectiveWord(),
    color: RANDOM_COLOR_HEX_BY_TIER[colorTier] || "#2f78ff",
    isReggae: false,
    placeAfterClass: false,
    colorTier: colorTier || DEFAULT_RANDOM_TIER,
  };
}

const characterNameEl = document.getElementById("characterName");
const characterMetaEl = document.getElementById("characterMeta");
const hatSlotEl = document.getElementById("hatSlot");
const armsSlotEl = document.getElementById("armsSlot");
const torsoSlotEl = document.getElementById("torsoSlot");
const legsSlotEl = document.getElementById("legsSlot");
const statsRowEl = document.getElementById("statsRow");
const logContainerEl = document.getElementById("logContainer");
const logListEl = document.getElementById("logList");
const spriteEl = document.querySelector(".sprite");
const fighterQuoteEl = document.getElementById("fighterQuote");
const heroSectionEl = document.getElementById("heroSection");
const fighterStageEl = document.querySelector(".fighter-stage");
const logoWrapEl = document.querySelector(".game-logo-wrap");
const logoEl = document.querySelector(".game-logo");
const closeAsciiBtnEl = document.getElementById("closeAsciiBtn");
const adminAsciiBtnEl = document.getElementById("adminAsciiBtn");
let character = null;
let replyTypewriter = null;
let adminLayoutResizeBound = false;
let adminLayoutResizeTimer = null;

const componentNameRuById = {
  hat_warrior: "Шлем",
  hat_mage: "Шляпа волшебника",
  hat_cowboy: "Ковбойская шляпа",
  hat_warrior_crown: "Корона",
  hat_mage_halo: "Нимб",
  hat_cowboy_emu_kak_raz: "А она ему как раз",
  face_plain: "Обычное лицо",
  face_bandana: "Лицо в бандане",
  face_blessed_eyes: "Благословенные глаза",
  arms_warrior: "Щит и меч",
  arms_mage: "Рубаха",
  arms_mage_mantle_top: "Магическое ожерелье",
  arms_cowboy: "Револьверы",
  torso_warrior: "Кираса",
  torso_mage: "Мантия",
  torso_mage_mantle_bottom: "Мантия колдуна",
  torso_cowboy: "Ремень охотника",
  legs_boots: "Ботинки",
  legs_cowboy_boots: "Ковбойские сапоги",
  legs_brass_kneepads: "Латунные наколенники",
};

const baseClassLabelRuById = {
  mage: "Волшебник",
  cowboy: "Ковбой",
  warrior: "Воин",
};

function openProfileSelectorPage() {
  if (!isCurrentSessionAdmin) {
    return;
  }
  detachAdminLayoutResizeSync();
  window.sessionStorage.setItem(DEBUG_PROFILE_TEMPLATE_STORAGE_KEY, state.templateKey || "club");
  window.location.href = "./profiles.html";
}

function openAdminPage() {
  if (!isCurrentSessionAdmin) {
    return;
  }
  window.sessionStorage.setItem(DEBUG_PROFILE_TEMPLATE_STORAGE_KEY, state.templateKey || "club");
  window.location.href = "./admin.html";
}

function openProfilePage(profileParam) {
  detachAdminLayoutResizeSync();
  const nextParam = profileTemplateByParam[profileParam] ? profileParam : "club";
  window.sessionStorage.setItem(DEBUG_PROFILE_TEMPLATE_STORAGE_KEY, nextParam);
  window.sessionStorage.removeItem(ADMIN_TARGET_USER_STORAGE_KEY);
  window.location.href = "./index.html";
}

function openHomePage() {
  detachAdminLayoutResizeSync();
  window.location.href = "./index.html";
}

function openUserSession(userId) {
  if (!isCurrentSessionAdmin) {
    return;
  }
  detachAdminLayoutResizeSync();
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return;
  }
  window.sessionStorage.setItem(ADMIN_TARGET_USER_STORAGE_KEY, String(Math.floor(numericUserId)));
  window.location.href = "./index.html";
}

async function renderProfileSelectorPage() {
  clearLiveLeaderboardPolling();
  clearAdminPagePolling();
  document.body.classList.remove("live-leaderboard-mode");
  detachAdminLayoutResizeSync();
  if (!isCurrentSessionAdmin) {
    openHomePage();
    return;
  }
  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }

  let usersPayload;
  try {
    usersPayload = await loadUsersForSelector(apiClient);
  } catch (error) {
    document.body.classList.add("profile-selector-mode");
    appRootEl.innerHTML = `
      <section class="profile-selector-screen" aria-label="Profile Selector">
        <pre class="profile-selector-title">$ profiles/</pre>
        <pre class="profile-selector-item">connection error: backend is required</pre>
        <div class="profile-selector-actions">
          <button class="profile-selector-btn" id="profileSelectorRetryBtn" type="button">[retry]</button>
          <button class="profile-selector-btn" id="profileSelectorBackBtn" type="button">[back]</button>
        </div>
      </section>
    `;
    const retryBtn = document.getElementById("profileSelectorRetryBtn");
    retryBtn?.addEventListener("click", () => {
      void renderProfileSelectorPage();
    });
    const backBtn = document.getElementById("profileSelectorBackBtn");
    backBtn?.addEventListener("click", () => openProfilePage(selectedTemplateKey || "club"));
    return;
  }

  const backendUsers = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
  const backendGameState = usersPayload?.gameState && typeof usersPayload.gameState === "object"
    ? usersPayload.gameState
    : { finished: false };

  document.body.classList.add("profile-selector-mode");

  appRootEl.innerHTML = `
    <section class="profile-selector-screen" aria-label="Profile Selector">
      <pre class="profile-selector-title">$ profiles/</pre>
      <div class="profile-selector-list" id="profileSelectorList"></div>
      <pre class="profile-selector-separator">--------------------------------</pre>
      <pre class="profile-selector-title">$ users/</pre>
      <div class="profile-selector-list" id="userSelectorList"></div>
      <div class="profile-selector-actions">
        <button class="profile-selector-btn" id="profileSelectorNewUserBtn" type="button">[new user]</button>
      </div>
    </section>
  `;

  const profileListEl = document.getElementById("profileSelectorList");
  const userListEl = document.getElementById("userSelectorList");
  if (!profileListEl || !userListEl) {
    return;
  }

  for (const [profileKey, profile] of Object.entries(profileTemplateByParam)) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "profile-selector-item";
    if (!hasActiveRuntimeUser && selectedTemplateKey === profileKey) {
      row.classList.add("profile-selector-item-active");
    }
    row.textContent = `----------  ${profile.classId.padEnd(7, " ")}  ${profileKey}`;
    row.setAttribute("aria-label", `Open profile ${profileKey}`);
    row.addEventListener("click", () => openProfilePage(profileKey));
    profileListEl.appendChild(row);
  }

  const users = [...backendUsers].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  if (!users.length) {
    const emptyRow = document.createElement("pre");
    emptyRow.className = "profile-selector-item";
    emptyRow.textContent = "----------  no users (use [new user])";
    userListEl.appendChild(emptyRow);
  } else {
    for (const user of users) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "profile-selector-item";
      if (Number(user.id) === Number(activeUserId)) {
        row.classList.add("profile-selector-item-active");
      }
      const idLabel = `u${String(user.id).padStart(3, "0")}`;
      const classLabel = String(user.classId || "random");
      const nameLabel = String(user.name || `USER #${user.id}`);
      row.textContent = `----------  ${classLabel.padEnd(7, " ")}  ${idLabel}  ${nameLabel}`;
      row.setAttribute("aria-label", `Open user ${user.id}`);
      row.addEventListener("click", () => openUserSession(user.id));
      userListEl.appendChild(row);
    }
  }

  const newUserBtn = document.getElementById("profileSelectorNewUserBtn");
  newUserBtn?.addEventListener("click", async () => {
    if (backendGameState.finished) {
      return;
    }
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      const response = await callAdminAction(apiClient, "adminNewUser", telegramUserId);
      const createdId = Number(response?.createdUser?.id);
      if (Number.isFinite(createdId) && createdId > 0) {
        openUserSession(createdId);
        return;
      }
      void renderProfileSelectorPage();
    } catch (error) {
      const failedRow = document.createElement("pre");
      failedRow.className = "profile-selector-item";
      failedRow.textContent = "connection error: failed to create user";
      userListEl.appendChild(failedRow);
    }
  });
}

async function fetchBackendAdminState(options = {}) {
  let payload;
  let readyPayload = null;
  if (options.publicAccess) {
    payload = await apiClient.liveLeaderboard();
  } else {
    [payload, readyPayload] = await Promise.all([
      apiClient.leaderboard(),
      apiClient.readyz().catch(() => null),
    ]);
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid backend payload");
  }
  const payloadConfig = payload.config && typeof payload.config === "object"
    ? payload.config
    : {};
  const readyConfig = readyPayload?.config && typeof readyPayload.config === "object"
    ? readyPayload.config
    : {};
  return {
    leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
    gameState: payload.gameState && typeof payload.gameState === "object"
      ? payload.gameState
      : {
        finished: false,
        battlesStarted: false,
        winnerUserId: null,
        usersCount: 0,
        leaderboardDisplay: { hiddenValues: false, revealTopFive: false },
      },
    users: Array.isArray(payload.users) ? payload.users : [],
    config: {
      ...payloadConfig,
      ...readyConfig,
    },
  };
}

function formatIntervalMinutesFromMs(intervalMs) {
  const value = Number(intervalMs);
  if (!Number.isFinite(value) || value <= 0) {
    return "n/a";
  }
  const minutes = value / 60000;
  const roundedMinutes = Math.round(minutes * 100) / 100;
  const label = Number.isInteger(roundedMinutes) ? String(roundedMinutes) : String(roundedMinutes);
  return `${label}m`;
}

function formatLeaderboardName(entry, userMetaById) {
  const userMeta = userMetaById.get(Number(entry.userId)) || {};
  const classLabel = baseClassLabelRuById[String(entry.classId || userMeta.classId || "")]
    || String(entry.classId || "").toUpperCase()
    || "USER";
  const adjective = String(userMeta.adjective || "").trim();
  if (adjective) {
    return `${adjective} ${classLabel}`;
  }
  return String(entry.name || classLabel || `USER #${entry.userId}`);
}

function formatTelegramByUserId(userMetaById, userId) {
  const userMeta = userMetaById.get(Number(userId)) || {};
  const username = String(userMeta.telegramUsername || "").trim().replace(/^@+/, "");
  if (username) {
    return `@${username}`;
  }
  const telegramUserId = Number(userMeta.telegramUserId);
  if (Number.isFinite(telegramUserId) && telegramUserId > 0) {
    return `tg:${telegramUserId}`;
  }
  return "-";
}

function buildLeaderboardRows(leaderboard, userMetaById) {
  return leaderboard.map((entry) => ({
    rating: String(Number(entry.rating) || 0),
    level: String(Number(entry.level) || 0),
    name: formatLeaderboardName(entry, userMetaById),
    telegram: formatTelegramByUserId(userMetaById, entry.userId),
  }));
}

function wrapTextByWord(text, width) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return [""];
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }
  const lines = [];
  let line = "";
  for (const word of words) {
    if (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word);
      continue;
    }
    if (!line) {
      line = word;
      continue;
    }
    if ((line.length + 1 + word.length) <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

function wrapTelegramText(text, width) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return [""];
  }
  const lines = [];
  for (let offset = 0; offset < normalized.length; offset += width) {
    lines.push(normalized.slice(offset, offset + width));
  }
  return lines.length ? lines : [""];
}

function buildLeaderboardAsciiTable(rows, options = {}) {
  const hideValues = options.hideValues === true;
  const longestNameWord = Math.max(
    "name".length,
    ...rows.flatMap((row) => String(row.name || "").split(/\s+/).filter(Boolean).map((word) => word.length)),
  );
  const nameWidth = Math.max(
    12,
    Math.min(48, ...rows.map((row) => row.name.length), "name".length),
    longestNameWord,
  );
  const colWidths = {
    rating: Math.max(4, ...rows.map((row) => row.rating.length), "rate".length),
    level: Math.max(3, ...rows.map((row) => row.level.length), "lvl".length),
    name: nameWidth,
    telegram: Math.max(8, Math.min(24, ...rows.map((row) => row.telegram.length), "telegram".length)),
  };

  const pad = (value, width) => String(value).slice(0, width).padEnd(width, " ");
  const padName = (value, width) => String(value).padEnd(width, " ");
  const padTelegram = (value, width) => String(value).padEnd(width, " ");
  const divider = `+-${"-".repeat(colWidths.rating)}-+-${"-".repeat(colWidths.level)}-+-${"-".repeat(colWidths.name)}-+-${"-".repeat(colWidths.telegram)}-+`;
  const header = `| ${pad("rate", colWidths.rating)} | ${pad("lvl", colWidths.level)} | ${pad("name", colWidths.name)} | ${pad("telegram", colWidths.telegram)} |`;
  const bodyRows = rows.length
    ? rows.map((row) => {
      const ratingValue = hideValues ? "?" : row.rating;
      const levelValue = hideValues ? "?" : row.level;
      const nameValue = hideValues ? "hidden" : row.name;
      const telegramValue = hideValues ? "hidden" : row.telegram;

      const wrappedNameLines = wrapTextByWord(nameValue, colWidths.name);
      const wrappedTelegramLines = wrapTelegramText(telegramValue, colWidths.telegram);
      const linesCount = Math.max(wrappedNameLines.length, wrappedTelegramLines.length);
      return Array.from({ length: linesCount }, (_, index) => `| ${
        pad(index === 0 ? ratingValue : "", colWidths.rating)
      } | ${
        pad(index === 0 ? levelValue : "", colWidths.level)
      } | ${
        padName(wrappedNameLines[index] || "", colWidths.name)
      } | ${
        padTelegram(wrappedTelegramLines[index] || "", colWidths.telegram)
      } |`);
    })
    : [[`| ${pad("-", colWidths.rating)} | ${pad("-", colWidths.level)} | ${pad("no users", colWidths.name)} | ${pad("-", colWidths.telegram)} |`]];

  const lines = [divider, header, divider];
  const rowLineIndexes = [];
  for (const rowLines of bodyRows) {
    const indexes = [];
    for (const rowLine of rowLines) {
      indexes.push(lines.length);
      lines.push(rowLine);
    }
    rowLineIndexes.push(indexes);
    lines.push(divider);
  }
  return { lines, rowLineIndexes };
}

function renderLeaderboardTable(preEl, tableModel, options = {}) {
  if (!preEl) {
    return;
  }
  const highlightTopFive = options.highlightTopFive === true;
  if (!highlightTopFive) {
    preEl.textContent = tableModel.lines.join("\n");
    return;
  }
  const highlightLineIndexes = new Set(
    tableModel.rowLineIndexes
      .slice(0, 5)
      .flatMap((indexes) => indexes),
  );
  preEl.innerHTML = tableModel.lines
    .map((line, index) => {
      const escapedLine = escapeHtml(line);
      if (highlightLineIndexes.has(index)) {
        return `<span class="admin-table-top5">${escapedLine}</span>`;
      }
      return escapedLine;
    })
    .join("\n");
}

function clearLiveLeaderboardPolling() {
  if (liveLeaderboardPollTimer) {
    window.clearInterval(liveLeaderboardPollTimer);
    liveLeaderboardPollTimer = null;
  }
}

function clearAdminPagePolling() {
  if (adminPagePollTimer) {
    window.clearInterval(adminPagePollTimer);
    adminPagePollTimer = null;
  }
}

function ensureAdminPagePolling() {
  clearAdminPagePolling();
  adminPagePollTimer = window.setInterval(() => {
    if (!isAdminMode() || !isCurrentSessionAdmin || document.visibilityState !== "visible") {
      return;
    }
    void renderAdminPage();
  }, ADMIN_PAGE_POLL_INTERVAL_MS);
}

async function hydrateStateFromBackendSessionIfNeeded() {
  if (!Number.isFinite(requestedUserId)) {
    return;
  }

  const telegramUserId = getRequiredTelegramUserIdForApi();
  const payload = await initSessionAndLoadProfile(apiClient, telegramUserId, requestedUserId);

  const profile = payload.profile;
  const backendUser = payload.user || {};
  const classId = String(profile.classId || "random");
  const templateKeyRaw = String(backendUser.templateKey || profile.templateKey || "");
  const templateKey =
    templateKeyRaw === "random"
      ? "random"
      : (profileTemplateByParam[templateKeyRaw] ? templateKeyRaw : templateKeyFromClassId(classId));
  const preset = profile?.components && typeof profile.components === "object"
    ? profile.components
    : (classId === "random"
      ? buildRandomPreset()
      : (characterPresetByClassId[classId] || characterPresetByClassId.warrior));

  state.userId = Number(profile.userId || profile.id || requestedUserId);
  activeUserId = state.userId;
  hasActiveRuntimeUser = Number.isFinite(activeUserId);
  state.templateKey = templateKey;
  state.classId = classId;
  state.preset = sanitizePreset(preset, templateKey, classId);
  state.colorTier = String(profile.colorTier || state.colorTier || DEFAULT_RANDOM_TIER);
  state.adjective = String(profile.adjective || state.adjective || "");
  state.level = Math.max(1, Number(profile.level) || 1);
  state.rating = Math.max(0, Number(profile.rating) || 0);
  state.name = String(backendUser.name || `${classId.toUpperCase()} USER #${state.userId}`);
  state.logs = [];
  state.backendStatsOverride = {
    hp: Math.max(1, Number(profile.hp) || 1),
    attack: Math.max(1, Number(profile.attack) || 1),
  };
  stateBackendControlled = true;
}

let backendSessionSyncInFlight = false;
async function syncActiveSessionFromBackend() {
  if (!stateBackendControlled || !Number.isFinite(activeUserId) || backendSessionSyncInFlight) {
    return;
  }
  backendSessionSyncInFlight = true;
  try {
    const payload = await loadProfile(apiClient, activeUserId);
    const profile = payload.profile;
    const backendUser = payload.user || {};
    const previousLastLogText = state.logs[state.logs.length - 1]?.text || "";

    state.level = Math.max(1, Number(profile.level) || state.level || 1);
    state.rating = Math.max(0, Number(profile.rating) || state.rating || 0);
    state.name = String(backendUser.name || state.name || `USER #${activeUserId}`);
    state.classId = String(profile.classId || state.classId || "random");
    const templateKeyRaw = String(backendUser.templateKey || profile.templateKey || "");
    state.templateKey =
      templateKeyRaw === "random"
        ? "random"
        : (profileTemplateByParam[templateKeyRaw] ? templateKeyRaw : templateKeyFromClassId(state.classId));
    state.preset = sanitizePreset(
      profile?.components && typeof profile.components === "object" ? profile.components : state.preset,
      state.templateKey,
      state.classId,
    );
    state.colorTier = String(profile.colorTier || state.colorTier || DEFAULT_RANDOM_TIER);
    state.adjective = String(profile.adjective || state.adjective || "");
    state.backendStatsOverride = {
      hp: Math.max(1, Number(profile.hp) || 1),
      attack: Math.max(1, Number(profile.attack) || 1),
    };
    state.logs = Array.isArray(profile.logs) ? [...profile.logs].slice(-MAX_UI_LOGS) : [];

    renderHeader();
    renderStats();
    renderLogs();
    renderSpriteDebugPanel();

    const latestLog = state.logs[state.logs.length - 1];
    if (latestLog && latestLog.text !== previousLastLogText && character && replyTypewriter) {
      const reply = character.getReplyForLog(latestLog);
      replyTypewriter.render(reply);
      centerFighterToViewport();
    }
  } catch (error) {
    console.warn("[api] session sync failed", error instanceof Error ? error.message : error);
  } finally {
    backendSessionSyncInFlight = false;
  }
}

async function renderAdminPage() {
  clearLiveLeaderboardPolling();
  document.body.classList.remove("live-leaderboard-mode");
  if (!isCurrentSessionAdmin) {
    clearAdminPagePolling();
    openHomePage();
    return;
  }
  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }
  ensureAdminPagePolling();

  let backendState;
  try {
    backendState = await fetchBackendAdminState();
  } catch (error) {
    console.error("[api] admin page unavailable: backend connection failed", error);
    document.body.classList.add("profile-selector-mode");
    appRootEl.innerHTML = `
      <section class="admin-screen" aria-label="Admin panel">
        <pre class="admin-title">$ admin/leaderboard</pre>
        <div class="admin-table-wrap">
          <pre class="admin-table">connection error: backend is required</pre>
        </div>
        <div class="admin-bottom">
          <p class="admin-summary">backend mode: unavailable</p>
          <div class="admin-actions">
            <button class="admin-btn" id="adminRetryBtn" type="button">[retry]</button>
            <button class="admin-btn" id="adminBackBtn" type="button">[profiles]</button>
          </div>
        </div>
      </section>
    `;
    const retryBtn = document.getElementById("adminRetryBtn");
    retryBtn?.addEventListener("click", () => {
      void renderAdminPage();
    });
    const backBtn = document.getElementById("adminBackBtn");
    backBtn?.addEventListener("click", openProfileSelectorPage);
    return;
  }

  const leaderboard = backendState.leaderboard;
  const userMetaById = new Map(
    (Array.isArray(backendState.users) ? backendState.users : []).map((user) => [Number(user.id), user]),
  );
  const effectiveGameState = {
      finished: Boolean(backendState.gameState?.finished),
      battlesStarted: Boolean(backendState.gameState?.battlesStarted),
      winnerUserId: backendState.gameState?.winnerUserId ?? null,
      usersCount: Number(backendState.gameState?.usersCount) || 0,
    };
  const effectiveDisplayState = {
    hiddenValues: Boolean(backendState.gameState?.leaderboardDisplay?.hiddenValues),
    revealTopFive: Boolean(backendState.gameState?.leaderboardDisplay?.revealTopFive),
  };
  const winnerUserId = effectiveGameState.winnerUserId || leaderboard[0]?.userId || null;
  const battlesToggleLabel = effectiveGameState.battlesStarted ? "[pause battles]" : "[start battles]";
  const battleIntervalLabel = formatIntervalMinutesFromMs(backendState.config?.battleTickIntervalMs);

  document.body.classList.add("profile-selector-mode");
  appRootEl.innerHTML = `
    <section class="admin-screen" aria-label="Admin panel">
      <pre class="admin-title">$ admin/leaderboard</pre>
      <div class="admin-table-wrap" id="adminTableWrap">
        <pre class="admin-table" id="adminTable"></pre>
      </div>
      <div class="admin-bottom">
        <p class="admin-summary">backend mode: ${effectiveGameState.finished ? "frozen" : "live"} • battles: ${effectiveGameState.battlesStarted ? "on" : "off"} • interval: ${battleIntervalLabel} • source: backend</p>
        <p class="admin-note" id="adminNote"></p>
        <div class="admin-actions">
          <button class="admin-btn" id="adminToggleBattlesBtn" type="button"${effectiveGameState.finished || !effectiveGameState.usersCount ? " disabled" : ""}>${battlesToggleLabel}</button>
          <button class="admin-btn" id="adminNewUserBtn" type="button"${effectiveGameState.finished ? " disabled" : ""}>[new user]</button>
          <button class="admin-btn" id="adminClearUsersBtn" type="button"${!effectiveGameState.usersCount ? " disabled" : ""}>[clear users]</button>
          <button class="admin-btn" id="adminResetGameBtn" type="button"${!effectiveGameState.usersCount ? " disabled" : ""}>[reset game]</button>
          <button class="admin-btn" id="adminHideTableBtn" type="button"${!effectiveGameState.usersCount ? " disabled" : ""}>[hide table]</button>
          <button class="admin-btn" id="adminRevealTableBtn" type="button"${!effectiveGameState.usersCount ? " disabled" : ""}>[reveal]</button>
          <button class="admin-btn" id="adminWinCleanBtn" type="button"${!effectiveGameState.usersCount ? " disabled" : ""}>[win-clean]</button>
          <button class="admin-btn" id="adminBackBtn" type="button">[profiles]</button>
          <button class="admin-btn" id="finishGameBtn" type="button"${effectiveGameState.finished ? " disabled" : ""}>[finish game]</button>
          <button class="admin-close-btn" id="adminCloseBtn" type="button" aria-label="Back to admin profile">[x]</button>
        </div>
      </div>
    </section>
  `;

  const rows = buildLeaderboardRows(leaderboard, userMetaById);
  const tableModel = buildLeaderboardAsciiTable(rows, {
    hideValues: effectiveDisplayState.hiddenValues,
  });
  const adminTableEl = document.getElementById("adminTable");
  if (adminTableEl) {
    renderLeaderboardTable(adminTableEl, tableModel, {
      highlightTopFive: effectiveDisplayState.revealTopFive && !effectiveDisplayState.hiddenValues,
    });
    fitAdminTableToViewport();
  }

  const noteEl = document.getElementById("adminNote");
  const winnerEntry = leaderboard.find((entry) => Number(entry.userId) === Number(winnerUserId));
  const winnerName = winnerEntry ? formatLeaderboardName(winnerEntry, userMetaById) : "неизвестный";
  const winnerTelegram = winnerEntry ? formatTelegramByUserId(userMetaById, winnerEntry.userId) : "-";
  noteEl.textContent = effectiveGameState.finished
    ? `winner: ${winnerName} (${winnerTelegram})`
    : (!rows.length ? "leaderboard is empty until [new user]" : `users in leaderboard: ${rows.length}`);

  const toggleBattlesBtn = document.getElementById("adminToggleBattlesBtn");
  toggleBattlesBtn?.addEventListener("click", async () => {
    if (effectiveGameState.finished) {
      return;
    }
    const actionName = effectiveGameState.battlesStarted ? "adminStopBattles" : "adminStartBattles";
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await callAdminAction(apiClient, actionName, telegramUserId);
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = effectiveGameState.battlesStarted
          ? "connection error: failed to pause battles (or no admin access)"
          : "connection error: failed to start battles (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const newUserBtn = document.getElementById("adminNewUserBtn");
  newUserBtn?.addEventListener("click", async () => {
    if (effectiveGameState.finished) {
      return;
    }
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await callAdminAction(apiClient, "adminNewUser", telegramUserId);
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to create user (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const clearUsersBtn = document.getElementById("adminClearUsersBtn");
  clearUsersBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await callAdminAction(apiClient, "adminClearUsers", telegramUserId);
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to clear users (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const resetGameBtn = document.getElementById("adminResetGameBtn");
  resetGameBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await callAdminAction(apiClient, "adminResetGame", telegramUserId);
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to reset game (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const hideTableBtn = document.getElementById("adminHideTableBtn");
  hideTableBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await apiClient.adminLeaderboardDisplay({ telegramUserId, mode: "hide" });
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to hide table values (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const revealTableBtn = document.getElementById("adminRevealTableBtn");
  revealTableBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await apiClient.adminLeaderboardDisplay({ telegramUserId, mode: "reveal" });
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to reveal table values (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const winCleanBtn = document.getElementById("adminWinCleanBtn");
  winCleanBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await apiClient.adminLeaderboardDisplay({ telegramUserId, mode: "clean" });
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to reset table display (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const backBtn = document.getElementById("adminBackBtn");
  backBtn?.addEventListener("click", openProfileSelectorPage);

  const finishBtn = document.getElementById("finishGameBtn");
  finishBtn?.addEventListener("click", async () => {
    try {
      const telegramUserId = getRequiredTelegramUserIdForApi();
      await callAdminAction(apiClient, "adminFinishGame", telegramUserId);
    } catch (error) {
      const noteElInner = document.getElementById("adminNote");
      if (noteElInner) {
        noteElInner.textContent = "connection error: failed to finish game (or no admin access)";
      }
      return;
    }
    void renderAdminPage();
  });

  const adminCloseBtn = document.getElementById("adminCloseBtn");
  adminCloseBtn?.addEventListener("click", () => {
    const adminUserId = Number(currentSessionUser?.id);
    if (Number.isFinite(adminUserId) && adminUserId > 0) {
      openUserSession(adminUserId);
      return;
    }
    openHomePage();
  });

  attachAdminLayoutResizeSync();
}

async function renderLiveLeaderboardPage() {
  clearLiveLeaderboardPolling();
  clearAdminPagePolling();
  detachAdminLayoutResizeSync();
  document.body.classList.add("profile-selector-mode");
  document.body.classList.add("live-leaderboard-mode");

  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }

  appRootEl.innerHTML = `
    <section class="live-leaderboard-screen" aria-label="Live leaderboard panel">
      <pre class="admin-title">$ live/leaderboard</pre>
      <div class="admin-table-wrap live-admin-table-wrap" id="adminTableWrap">
        <pre class="admin-table live-admin-table" id="adminTable"></pre>
      </div>
      <div class="live-footer">
        <p class="admin-summary" id="liveLeaderboardSummary">source: backend</p>
      </div>
    </section>
  `;

  const renderSnapshot = async () => {
    let backendState;
    try {
      backendState = await fetchBackendAdminState({ publicAccess: true });
    } catch (error) {
      const tableEl = document.getElementById("adminTable");
      if (tableEl) {
        tableEl.textContent = "connection error: backend is required";
      }
      const summaryEl = document.getElementById("liveLeaderboardSummary");
      if (summaryEl) {
        summaryEl.textContent = "backend mode: unavailable";
      }
      return;
    }

    const userMetaById = new Map(
      (Array.isArray(backendState.users) ? backendState.users : []).map((user) => [Number(user.id), user]),
    );
    const rows = buildLeaderboardRows(backendState.leaderboard, userMetaById);
    const displayState = {
      hiddenValues: Boolean(backendState.gameState?.leaderboardDisplay?.hiddenValues),
      revealTopFive: Boolean(backendState.gameState?.leaderboardDisplay?.revealTopFive),
    };
    const tableModel = buildLeaderboardAsciiTable(rows, {
      hideValues: displayState.hiddenValues,
    });
    const tableEl = document.getElementById("adminTable");
    if (tableEl) {
      renderLeaderboardTable(tableEl, tableModel, {
        highlightTopFive: displayState.revealTopFive && !displayState.hiddenValues,
      });
      fitAdminTableToViewport();
    }
    const summaryEl = document.getElementById("liveLeaderboardSummary");
    if (summaryEl) {
      const gameState = backendState.gameState || {};
      const modeLabel = gameState.finished ? "frozen" : "live";
      const battlesLabel = gameState.battlesStarted ? "on" : "off";
      summaryEl.textContent = `backend mode: ${modeLabel} • battles: ${battlesLabel} • users: ${rows.length} • source: backend`;
    }
  };

  await renderSnapshot();
  liveLeaderboardPollTimer = window.setInterval(() => {
    void renderSnapshot();
  }, 2000);
}

class CharacterEntity {
  constructor({ id, classId, quotePoolByType }) {
    this.id = id;
    this.classId = classId;
    this.quotePoolByType = quotePoolByType || {};
  }

  getReplyForLog(logItem) {
    const type = logItem?.type || "system";
    let quoteType = type;

    if (type === "combat") {
      quoteType = logItem?.combatResult === "defeat" ? "defeat" : "victory";
    }

    const pool = this.quotePoolByType[quoteType] || this.quotePoolByType.system || [];
    return pickRandomFrom(pool, "");
  }
}

class ReplyTypewriter {
  constructor({
    targetEl,
    minDelayMs = 10,
    maxDelayMs = 48,
    minPauseCount = 1,
    maxPauseCount = 3,
    minPauseMs = 120,
    maxPauseMs = 280,
    zeroHoldMs = 1000,
    onUpdate = null,
  }) {
    this.targetEl = targetEl;
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.minPauseCount = minPauseCount;
    this.maxPauseCount = maxPauseCount;
    this.minPauseMs = minPauseMs;
    this.maxPauseMs = maxPauseMs;
    this.zeroHoldMs = zeroHoldMs;
    this.onUpdate = onUpdate;
    this.timer = null;
    this.currentText = "";
    this.currentIndex = 0;
    this.textEl = null;
    this.nextText = "";
    this.mode = "idle";
    this.stepIndex = 0;
    this.pauseIndices = [];
    this.pauseSet = new Set();
    this.segmentProfiles = [];
    this.step = this.step.bind(this);
  }

  randomInt(min, max) {
    if (max <= min) {
      return min;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  randomPauseDelay() {
    return this.randomInt(this.minPauseMs, this.maxPauseMs);
  }

  normalizeForWordWrap(text) {
    const safeText = String(text || "");
    // Keep one-letter words with the next word so a single symbol does not hang on line end.
    return safeText.replace(/\b([A-Za-zА-Яа-яЁё])\s+(?=\S)/g, "$1\u00A0");
  }

  buildPausePlan(textLength) {
    const maxByLength = Math.max(0, Math.floor(textLength / 8));
    const allowedMax = Math.min(this.maxPauseCount, maxByLength);
    const allowedMin = Math.min(this.minPauseCount, allowedMax);
    const pauseCount = this.randomInt(allowedMin, allowedMax);

    if (pauseCount <= 0 || textLength < 6) {
      this.pauseIndices = [];
      this.pauseSet = new Set();
      this.segmentProfiles = [this.buildSegmentProfile()];
      return;
    }

    const startIndex = Math.max(1, Math.floor(textLength * 0.18));
    const endIndex = Math.max(startIndex, Math.floor(textLength * 0.85));
    const indices = [];
    const used = new Set();

    while (indices.length < pauseCount) {
      const idx = this.randomInt(startIndex, endIndex);
      if (used.has(idx)) {
        continue;
      }
      used.add(idx);
      indices.push(idx);
    }

    indices.sort((a, b) => a - b);
    this.pauseIndices = indices;
    this.pauseSet = new Set(indices);
    this.segmentProfiles = Array.from(
      { length: this.pauseIndices.length + 1 },
      () => this.buildSegmentProfile(),
    );
  }

  buildSegmentProfile() {
    const base = this.randomInt(this.minDelayMs, this.maxDelayMs);
    const jitter = Math.max(2, Math.floor((this.maxDelayMs - this.minDelayMs) * 0.2));
    return { base, jitter };
  }

  currentSegmentIndex(stepIndex) {
    let segment = 0;
    while (
      segment < this.pauseIndices.length &&
      stepIndex >= this.pauseIndices[segment]
    ) {
      segment += 1;
    }
    return segment;
  }

  randomTypingDelay(stepIndex) {
    const segmentIndex = this.currentSegmentIndex(stepIndex);
    const profile =
      this.segmentProfiles[segmentIndex] ||
      this.segmentProfiles[this.segmentProfiles.length - 1] ||
      this.buildSegmentProfile();
    const jitterOffset = this.randomInt(-profile.jitter, profile.jitter);
    return this.clamp(
      profile.base + jitterOffset,
      this.minDelayMs,
      this.maxDelayMs,
    );
  }

  ensureQuoteNodes() {
    if (!this.targetEl) {
      return false;
    }
    if (!this.textEl) {
      this.targetEl.innerHTML =
        '<span class="fighter-quote-text"></span><span class="fighter-quote-cursor" aria-hidden="true">|</span>';
      this.textEl = this.targetEl.querySelector(".fighter-quote-text");
    }
    return Boolean(this.textEl);
  }

  clearTimer() {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleNextStep(stepIndex) {
    const delay = this.pauseSet.has(stepIndex)
      ? this.randomPauseDelay()
      : this.randomTypingDelay(stepIndex);
    this.timer = window.setTimeout(this.step, delay);
  }

  escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  formatQuoteHtml(text) {
    const source = String(text || "");
    const quoteRegex = /"([^"]+)"/g;
    let html = "";
    let lastIndex = 0;

    for (const match of source.matchAll(quoteRegex)) {
      const fullMatch = match[0];
      const quotedText = match[1];
      const index = match.index || 0;

      html += this.escapeHtml(source.slice(lastIndex, index));
      html += `&quot;<span class="fighter-quote-em">${this.escapeHtml(quotedText)}</span>&quot;`;
      lastIndex = index + fullMatch.length;
    }

    html += this.escapeHtml(source.slice(lastIndex));
    return html;
  }

  setQuoteText(text) {
    if (!this.textEl) {
      return;
    }
    this.textEl.innerHTML = this.formatQuoteHtml(text);
  }

  startTyping(text) {
    if (!this.ensureQuoteNodes()) {
      return;
    }

    this.clearTimer();
    this.mode = "typing";
    this.currentText = this.normalizeForWordWrap(text);
    this.currentIndex = 0;
    this.stepIndex = 0;
    this.buildPausePlan(this.currentText.length);
    this.setQuoteText("");
    this.step();
  }

  eraseAndType(nextText) {
    if (!this.ensureQuoteNodes()) {
      return;
    }

    this.clearTimer();
    const visibleText = this.textEl.textContent || "";

    if (!visibleText.length) {
      this.startTyping(nextText);
      return;
    }

    this.mode = "erasing";
    this.currentText = visibleText;
    this.currentIndex = visibleText.length;
    this.stepIndex = 0;
    this.nextText = this.normalizeForWordWrap(nextText);
    this.buildPausePlan(this.currentText.length);
    this.step();
  }

  step() {
    if (!this.targetEl || !this.textEl) {
      return;
    }

    if (this.mode === "typing") {
      if (this.currentIndex >= this.currentText.length) {
        this.mode = "idle";
        return;
      }

      this.currentIndex += 1;
      this.setQuoteText(this.currentText.slice(0, this.currentIndex));
      if (typeof this.onUpdate === "function") {
        this.onUpdate();
      }
      const stepIndex = this.stepIndex;
      this.stepIndex += 1;
      this.scheduleNextStep(stepIndex);
      return;
    }

    if (this.mode === "erasing") {
      if (this.currentIndex <= 0) {
        this.timer = window.setTimeout(() => {
          this.startTyping(this.nextText);
        }, this.zeroHoldMs);
        return;
      }

      this.currentIndex -= 1;
      this.setQuoteText(this.currentText.slice(0, this.currentIndex));
      if (typeof this.onUpdate === "function") {
        this.onUpdate();
      }
      const stepIndex = this.stepIndex;
      this.stepIndex += 1;
      this.scheduleNextStep(stepIndex);
    }
  }

  render(text) {
    this.textEl = null;
    this.startTyping(text);
  }
}

function renderHeader() {
  const isRandomSession = state.templateKey === "random" || state.classId === "random";
  const preset = sanitizePreset(
    state.preset,
    isRandomSession ? "random" : state.templateKey,
    state.classId,
  );
  state.preset = preset;
  const getLabel = (componentId) => componentNameRuById[componentId] || "Неизвестно";
  const dominantBaseClass = detectPresetDominantBaseClass(preset);
  const dominantBaseClassLabel = baseClassLabelRuById[dominantBaseClass] || "Воин";
  currentCombatStats = getPresetCombatStats(preset);
  if (state.backendStatsOverride && Number.isFinite(state.backendStatsOverride.hp) && Number.isFinite(state.backendStatsOverride.attack)) {
    currentCombatStats = {
      hp: Math.max(1, Number(state.backendStatsOverride.hp) || 1),
      attack: Math.max(1, Number(state.backendStatsOverride.attack) || 1),
    };
  }
  let randomAdjectiveMeta = null;

  if (isRandomSession) {
    const hasStoredIdentity = Boolean(state.adjective) && Boolean(state.colorTier);
    if (!hasStoredIdentity) {
      const generated = createRandomIdentityFromPreset(preset);
      state.adjective = generated.adjective;
      state.colorTier = generated.colorTier;
      if (hasActiveRuntimeUser) {
        const activeUser = findUserById(runtimeStore.users, activeUserId);
        if (activeUser) {
          activeUser.adjective = state.adjective;
          activeUser.colorTier = state.colorTier;
          persistRuntimeStore(runtimeStore);
        }
      }
    }
    randomAdjectiveMeta = buildAdjectiveMeta(state.adjective, state.colorTier);
    const adjectiveClass = randomAdjectiveMeta.isReggae
      ? "character-name-adjective character-name-adjective-reggae"
      : "character-name-adjective";
    const adjectiveStyle = randomAdjectiveMeta.color
      ? ` style="--random-adjective-color: ${randomAdjectiveMeta.color};"`
      : "";
    const adjectiveHtml = `<span class="${adjectiveClass}"${adjectiveStyle}>${escapeHtml(randomAdjectiveMeta.text)}</span>`;
    const classHtml = `<span class="character-name-base">${escapeHtml(dominantBaseClassLabel)}</span>`;

    characterNameEl.innerHTML = randomAdjectiveMeta.placeAfterClass
      ? `${classHtml} ${adjectiveHtml}`
      : `${adjectiveHtml} ${classHtml}`;
  } else {
    characterNameEl.textContent = state.name;
  }
  characterMetaEl.textContent = `Lv ${state.level} • Rating ${state.rating}`;
  hatSlotEl.textContent = `[${getLabel(preset.hat)}]`;
  armsSlotEl.textContent = `[${getLabel(preset.arms)}]`;
  torsoSlotEl.textContent = `[${getLabel(preset.torso)}]`;
  legsSlotEl.textContent = `[${getLabel(preset.legs)}]`;

  if (isRandomSession && randomAdjectiveMeta) {
    // For reggae gradient text, use the central stripe color for sprite tint.
    spriteEl.style.color = randomAdjectiveMeta.isReggae
      ? "#fff500"
      : (randomAdjectiveMeta.color || "#2f78ff");
  } else {
    spriteEl.style.color = rarityToCssVar[state.rarity] || "var(--rare)";
  }
  try {
    const rendered = renderPresetToSprite(preset, dominantBaseClass);
    latestRenderedSpriteMeta = rendered;
    if (isRandomSession && randomAdjectiveMeta?.isReggae) {
      spriteEl.classList.add("sprite-reggae");
      spriteEl.innerHTML = '<span class="sprite-grid-content sprite-grid-content-plain sprite-reggae-text"></span>';
      const textLayerEl = spriteEl.querySelector(".sprite-grid-content-plain");
      if (textLayerEl) {
        textLayerEl.textContent = rendered.plainText;
      }
    } else {
      spriteEl.classList.remove("sprite-reggae");
      spriteEl.innerHTML = `<span class="sprite-grid-content">${rendered.html}</span>`;
    }
  } catch (error) {
    console.error("Sprite preset validation failed:", error);
    currentCombatStats = getPresetCombatStats(characterPresetByClassId.warrior);
    const rendered = renderPresetToSprite(characterPresetByClassId.warrior, "warrior");
    latestRenderedSpriteMeta = rendered;
    spriteEl.classList.remove("sprite-reggae");
    spriteEl.innerHTML = `<span class="sprite-grid-content">${rendered.html}</span>`;
  }
}

function renderSpriteDebugPanel() {
  if (!spriteDebugMode || !spriteEl || !fighterStageEl) {
    return;
  }

  document.body.classList.add("sprite-debug-mode");

  const existingPanel = document.querySelector(".sprite-debug-panel");
  existingPanel?.remove();

  const lines =
    latestRenderedSpriteMeta?.lines?.map((line) => line.padEnd(latestRenderedSpriteMeta.width, " ")) ||
    [];
  const maxLength = latestRenderedSpriteMeta?.width || SPRITE_GRID_WIDTH;
  const gridHeight = latestRenderedSpriteMeta?.height || Math.max(lines.length, SPRITE_MIN_GRID_HEIGHT);
  const axisIndex = Math.floor((maxLength - 1) / 2);
  const marker = `${" ".repeat(axisIndex)}|${" ".repeat(Math.max(0, maxLength - axisIndex - 1))}`;
  const spriteRect = spriteEl.getBoundingClientRect();
  const stageRect = fighterStageEl.getBoundingClientRect();
  const spriteStyle = getComputedStyle(spriteEl);
  const htmlStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);

  const measureText = document.createElement("span");
  measureText.className = "sprite-debug-measure";
  document.body.append(measureText);

  const measureSample = (sample) => {
    measureText.textContent = sample || " ";
    return Number(measureText.getBoundingClientRect().width.toFixed(3));
  };

  const glyphSamples = [" ", "/", "\\", "_", ".", "·", "(", ")", "^", "|", "A", "0"];
  const glyphWidths = glyphSamples.map((sample) => {
    const label = sample === " " ? "space" : sample;
    return `${label}:${measureSample(sample)}`;
  });

  const lineWidths = lines.map((line, index) => {
    const visibleLine = line.replaceAll(" ", "·");
    return `${String(index + 1).padStart(2, "0")}: w=${measureSample(line)} text=${visibleLine}`;
  });

  measureText.remove();

  const panel = document.createElement("section");
  panel.className = "sprite-debug-panel";
  panel.setAttribute("aria-label", "sprite debug panel");

  const title = document.createElement("h2");
  title.textContent = `Sprite Debug: ${state.classId}`;

  const grid = document.createElement("pre");
  grid.className = "sprite-debug-grid";
  grid.textContent = [
    `grid ${maxLength}x${gridHeight}`,
    `axis ${axisIndex}`,
    marker,
    ...lines.map((line, index) => `${String(index + 1).padStart(2, "0")} |${line.padEnd(maxLength)}| len=${line.length}`),
  ].join("\n");

  const env = document.createElement("pre");
  env.className = "sprite-debug-env";
  env.textContent = [
    "runtime",
    `url=${window.location.href}`,
    `ua=${navigator.userAgent}`,
    `dpr=${window.devicePixelRatio}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `screen=${window.screen?.width}x${window.screen?.height}`,
    `visualViewport=${window.visualViewport?.width ?? "n/a"}x${window.visualViewport?.height ?? "n/a"} scale=${window.visualViewport?.scale ?? "n/a"}`,
    "",
    "computed styles",
    `sprite.class=${spriteEl.className}`,
    `sprite.fontFamily=${spriteStyle.fontFamily}`,
    `sprite.fontSize=${spriteStyle.fontSize}`,
    `sprite.lineHeight=${spriteStyle.lineHeight}`,
    `sprite.letterSpacing=${spriteStyle.letterSpacing}`,
    `sprite.textAlign=${spriteStyle.textAlign}`,
    `sprite.whiteSpace=${spriteStyle.whiteSpace}`,
    `sprite.width=${spriteStyle.width}`,
    `sprite.transform=${spriteStyle.transform}`,
    `html.fontFamily=${htmlStyle.fontFamily}`,
    `body.fontFamily=${bodyStyle.fontFamily}`,
    "",
    "rects",
    `spriteRect x=${spriteRect.x.toFixed(2)} y=${spriteRect.y.toFixed(2)} w=${spriteRect.width.toFixed(2)} h=${spriteRect.height.toFixed(2)}`,
    `stageRect x=${stageRect.x.toFixed(2)} y=${stageRect.y.toFixed(2)} w=${stageRect.width.toFixed(2)} h=${stageRect.height.toFixed(2)}`,
    "",
    "glyph widths",
    glyphWidths.join(" "),
    "",
    "line widths",
    ...lineWidths,
  ].join("\n");

  const note = document.createElement("p");
  note.textContent =
    "Send this panel or screenshot when the sprite looks different in your browser.";

  panel.append(title, grid, env, note);
  fighterStageEl.after(panel);
}

function renderStats() {
  statsRowEl.innerHTML = "";

  const stats = [`HP ${currentCombatStats.hp}`, `ATTACK ${currentCombatStats.attack}`];

  for (const value of stats) {
    const statEl = document.createElement("div");
    statEl.className = "stat";
    if (value.startsWith("HP")) {
      statEl.classList.add("stat-hp");
    }
    statEl.textContent = value;
    statsRowEl.appendChild(statEl);
  }
}

function renderLogs() {
  logListEl.innerHTML = "";

  for (const [index, item] of state.logs.entries()) {
    const row = document.createElement("li");
    row.className = "log-item";
    const logType = item.type || "system";
    row.classList.add(`log-${logType}`);
    if (logType === "combat" && item.combatResult) {
      row.classList.add(`log-combat-${item.combatResult}`);
    }
    if (index === state.logs.length - 1) {
      row.classList.add("log-newest");
    }

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = item.time;

    const text = document.createElement("span");
    text.className = "log-text";
    text.textContent = item.text;

    row.append(time, text);
    logListEl.appendChild(row);
  }

  logContainerEl.scrollTop = logContainerEl.scrollHeight;
}

function appendLogAndRefresh(logItem) {
  if (!character || !replyTypewriter) {
    return;
  }
  state.logs.push(logItem);
  state.logs = state.logs.slice(-MAX_UI_LOGS);
  const activeUser = findUserById(runtimeStore.users, activeUserId);
  if (activeUser) {
    activeUser.withLogs(state.logs);
  }
  persistRuntimeStore(runtimeStore);
  renderLogs();

  const lastLog = state.logs[state.logs.length - 1] || { type: "system" };
  const nextReply = character.getReplyForLog(lastLog);
  replyTypewriter.eraseAndType(nextReply);
}

function pushSystemTickLog() {
  if (!character || !replyTypewriter) {
    return;
  }
  if (runtimeStore.gameState.finished) {
    return;
  }

  appendLogAndRefresh({
    time: nowTime(),
    type: "system",
    text: pickRandomFrom(logPoolByType.system, "signal stable"),
  });
}

function pushBattleTickLog() {
  if (!character || !replyTypewriter) {
    return;
  }
  if (runtimeStore.gameState.finished || !runtimeStore.gameState.battlesStarted) {
    return;
  }
  if (runtimeStore.users.length < 2) {
    return;
  }
  battleTelemetryTickId += 1;
  runtimeStore.gameState.telemetryTickId = battleTelemetryTickId;

  const matchmakingRngTrace = [];
  const shuffled = shuffleUsers(runtimeStore.users, matchmakingRngTrace);
  const queue = shuffled
    .map((user) => ({ user, mmScore: computeMatchmakingScore(user, matchmakingRngTrace) }))
    .sort((a, b) => a.mmScore - b.mmScore);

  const battleEvents = [];
  const leaderboardBefore = buildLeaderboardEntries(runtimeStore.users);
  const pairingResult = buildBattlePairs(queue, runtimeConfig.matchmakingMaxDelta, battleTelemetryTickId);
  const pairDecisions = pairingResult.pairDecisions;
  const unmatchedUserIds = pairingResult.unmatchedUserIds;
  const effectiveMaxDelta = Number(pairingResult.effectiveMaxDelta || runtimeConfig.matchmakingMaxDelta);
  const matchmakingPool = buildMatchmakingPoolSnapshot(queue, effectiveMaxDelta);
  for (const pairing of pairingResult.pairs) {
    battleEvents.push(runBattleForPair(pairing.left, pairing.right, pairing.meta));
  }
  if (!battleEvents.length) {
    postBattleTelemetry({
      type: "battle_tick",
      tickId: battleTelemetryTickId,
      ts: new Date().toISOString(),
      config: {
        systemLogIntervalMs: runtimeConfig.systemLogIntervalMs,
        battleTickIntervalMs: runtimeConfig.battleTickIntervalMs,
        matchmakingMaxDelta: runtimeConfig.matchmakingMaxDelta,
        effectiveMaxDelta,
      },
      matchmaking: {
        queue: queue.map((entry) => ({
          userId: entry.user.id,
          name: entry.user.name,
          mmScore: Number(entry.mmScore.toFixed(4)),
          battlesTotal: Number(entry.user.battlesTotal) || 0,
        })),
        pairs: [],
        decisions: pairDecisions,
        unmatchedUserIds,
        unmatchedDetails: pairingResult.unmatchedDetails,
        passStats: pairingResult.passStats,
        priorityLowBattleThreshold: pairingResult.priorityLowBattleThreshold,
        forcedPairsCount: pairingResult.forcedPairsCount,
        pool: matchmakingPool,
        skipped: "no_eligible_pairs",
      },
      rngTrace: {
        matchmaking: matchmakingRngTrace,
      },
      battles: [],
      leaderboardBefore,
      leaderboardAfter: buildLeaderboardEntries(runtimeStore.users),
    });
    persistRuntimeStore(runtimeStore);
    return;
  }

  for (const event of battleEvents) {
    event.winner.battlesTotal = (Number(event.winner.battlesTotal) || 0) + 1;
    event.winner.lastBattleTick = battleTelemetryTickId;
    event.loser.battlesTotal = (Number(event.loser.battlesTotal) || 0) + 1;
    event.loser.lastBattleTick = battleTelemetryTickId;
    const winnerMeta = buildCombatLogText("victory");
    const loserMeta = buildCombatLogText("defeat");

    appendLogToUser(event.winner, {
      time: nowTime(),
      type: "combat",
      combatResult: "victory",
      text: winnerMeta.text,
    });
    if ((Number(event.winnerUpdates.levelGain) || 0) > 0) {
      appendLogToUser(event.winner, {
        time: nowTime(),
        type: "levelup",
        text: `уровень повышен: Lv ${event.winner.level}`,
      });
    }
    if (event.winnerUpdates.item) {
      appendLogToUser(event.winner, {
        time: nowTime(),
        type: "drop",
        text: `дроп: улучшен слот ${event.winnerUpdates.item.slot}`,
      });
    }
    if (event.winnerUpdates.colorChanged) {
      appendLogToUser(event.winner, {
        time: nowTime(),
        type: "levelup",
        text: "аура усилена",
      });
    }

    appendLogToUser(event.loser, {
      time: nowTime(),
      type: "combat",
      combatResult: "defeat",
      text: loserMeta.text,
    });
    if (event.loserUpdates.item) {
      appendLogToUser(event.loser, {
        time: nowTime(),
        type: "drop",
        text: `потеря: ослаблен слот ${event.loserUpdates.item.slot}`,
      });
    }
    if (event.loserUpdates.colorChanged) {
      appendLogToUser(event.loser, {
        time: nowTime(),
        type: "system",
        text: "аура ослабла",
      });
    }
  }

  const activeUser = findUserById(runtimeStore.users, activeUserId);
  if (activeUser) {
    state.logs = [...(activeUser.logs || [])].slice(-MAX_UI_LOGS);
    state.level = activeUser.level;
    state.classId = activeUser.classId;
    state.preset = sanitizePreset(activeUser.preset, activeUser.templateKey, activeUser.classId);
    state.colorTier = activeUser.colorTier || state.colorTier;
    state.adjective = activeUser.adjective || state.adjective;
  }

  if (!runtimeStore.gameState.finished) {
    const leaderboard = buildLeaderboardEntries(runtimeStore.users);
    applyRatingsFromLeaderboard(runtimeStore.users, leaderboard);
    if (activeUser) {
      state.rating = activeUser.rating;
    }
  }

  const leaderboardAfter = buildLeaderboardEntries(runtimeStore.users);
  postBattleTelemetry({
    type: "battle_tick",
    tickId: battleTelemetryTickId,
    ts: new Date().toISOString(),
    config: {
      systemLogIntervalMs: runtimeConfig.systemLogIntervalMs,
      battleTickIntervalMs: runtimeConfig.battleTickIntervalMs,
      matchmakingMaxDelta: runtimeConfig.matchmakingMaxDelta,
      effectiveMaxDelta,
    },
    matchmaking: {
      queue: queue.map((entry) => ({
        userId: entry.user.id,
        name: entry.user.name,
        mmScore: Number(entry.mmScore.toFixed(4)),
        battlesTotal: Number(entry.user.battlesTotal) || 0,
      })),
      decisions: pairDecisions,
      unmatchedUserIds,
      unmatchedDetails: pairingResult.unmatchedDetails,
      passStats: pairingResult.passStats,
      priorityLowBattleThreshold: pairingResult.priorityLowBattleThreshold,
      forcedPairsCount: pairingResult.forcedPairsCount,
      pool: matchmakingPool,
      pairs: battleEvents.map((event) => ({
        leftUserId: event.pair.leftUserId,
        rightUserId: event.pair.rightUserId,
        winnerUserId: event.winner.id,
        loserUserId: event.loser.id,
        leftWinProbability: event.pair.leftWinProbability,
        rightWinProbability: event.pair.rightWinProbability,
        powerDelta: Number(event.powerDelta.toFixed(4)),
        matchKind: event.pair.matchKind,
        deltaLimitUsed: event.pair.deltaLimitUsed,
        leftWasPriority: event.pair.leftWasPriority,
        rightWasPriority: event.pair.rightWasPriority,
      })),
    },
    rngTrace: {
      matchmaking: matchmakingRngTrace,
      battles: battleEvents.map((event) => ({
        pair: [event.pair.leftUserId, event.pair.rightUserId],
        trace: event.rngTrace,
      })),
    },
    battles: battleEvents.map((event) => ({
      pair: event.pair,
      winnerUserId: event.winner.id,
      loserUserId: event.loser.id,
      powerDelta: Number(event.powerDelta.toFixed(4)),
      winnerUpdates: event.winnerUpdates,
      loserUpdates: event.loserUpdates,
      winnerBefore: event.winnerBefore,
      loserBefore: event.loserBefore,
      winnerAfter: event.winnerAfter,
      loserAfter: event.loserAfter,
      winnerDiff: computeStateDiff(event.winnerBefore, event.winnerAfter),
      loserDiff: computeStateDiff(event.loserBefore, event.loserAfter),
    })),
    leaderboardBefore,
    leaderboardAfter,
  });

  persistRuntimeStore(runtimeStore);

  renderHeader();
  renderStats();
  renderLogs();

  const lastLog = state.logs[state.logs.length - 1] || { type: "system" };
  const nextReply = character.getReplyForLog(lastLog);
  replyTypewriter.eraseAndType(nextReply);
}

function centerFighterToViewport() {
  if (!heroSectionEl || !fighterStageEl || !spriteEl) {
    return;
  }

  fighterStageEl.style.marginTop = "0px";

  const viewportCenterY = window.innerHeight / 2;
  const heroBottomY = heroSectionEl.getBoundingClientRect().bottom;
  const stageHeight = fighterStageEl.getBoundingClientRect().height;
  const spriteHeight = spriteEl.getBoundingClientRect().height;
  const spriteBottomOffset = Number.parseFloat(getComputedStyle(spriteEl).bottom) || 0;

  const spriteCenterY = heroBottomY + stageHeight - spriteBottomOffset - spriteHeight / 2;
  const correction = viewportCenterY - spriteCenterY;

  let adjustedCorrection = correction;
  fighterStageEl.style.marginTop = `${Math.round(adjustedCorrection)}px`;

  if (fighterQuoteEl?.textContent?.trim()) {
    const quoteRect = fighterQuoteEl.getBoundingClientRect();
    const spriteRect = spriteEl.getBoundingClientRect();
    const minGap = 8;
    const overlap = quoteRect.bottom + minGap - spriteRect.top;

    if (overlap > 0) {
      adjustedCorrection += overlap;
      fighterStageEl.style.marginTop = `${Math.round(adjustedCorrection)}px`;
    }
  }
}

function fitLogoToViewport() {
  if (!logoWrapEl || !logoEl) {
    return;
  }

  logoEl.style.transform = "none";
  const wrapWidth = logoWrapEl.clientWidth;
  if (!wrapWidth) {
    return;
  }
  const nextSize = Math.min(14, Math.max(7, Math.floor(wrapWidth / LOGO_TEXT_COLUMNS)));
  logoEl.style.fontSize = `${nextSize}px`;
}

function fitAdminTableToViewport() {
  const tableWrapEl = document.getElementById("adminTableWrap");
  const adminTableEl = document.getElementById("adminTable");
  if (!tableWrapEl || !adminTableEl) {
    return;
  }

  adminTableEl.style.transform = "scale(1)";
  const wrapWidth = tableWrapEl.clientWidth;
  const tableWidth = adminTableEl.scrollWidth;
  if (!wrapWidth || !tableWidth) {
    return;
  }

  const targetWidth = Math.max(1, wrapWidth * 0.98);
  const rawScale = targetWidth / tableWidth;
  const scale = Math.max(0.65, Math.min(2, rawScale));
  adminTableEl.style.transform = `scale(${scale})`;
}

async function renderMainPage() {
  clearLiveLeaderboardPolling();
  clearAdminPagePolling();
  document.body.classList.remove("live-leaderboard-mode");
  document.body.classList.remove("profile-selector-mode");
  detachAdminLayoutResizeSync();
  if (Number.isFinite(requestedUserId)) {
    try {
      await hydrateStateFromBackendSessionIfNeeded();
    } catch (error) {
      const appRootEl = document.getElementById("appRoot");
      if (appRootEl) {
        document.body.classList.add("profile-selector-mode");
        appRootEl.innerHTML = `
          <section class="profile-selector-screen" aria-label="Session Error">
            <pre class="profile-selector-title">$ session/</pre>
            <pre class="profile-selector-item">connection error: failed to load user profile</pre>
            <div class="profile-selector-actions">
              <button class="profile-selector-btn" id="sessionRetryBtn" type="button">[retry]</button>
            </div>
          </section>
        `;
        const retryBtn = document.getElementById("sessionRetryBtn");
        retryBtn?.addEventListener("click", () => window.location.reload());
      }
      return;
    }
  }

  renderHeader();
  renderStats();
  renderLogs();
  renderSpriteDebugPanel();

  character = new CharacterEntity({
    id: state.id,
    classId: state.classId || "warrior",
    quotePoolByType: CHARACTER_QUOTES,
  });
  const lastLog = state.logs[state.logs.length - 1] || { type: "system" };
  const initialReply = character.getReplyForLog(lastLog);
  replyTypewriter = new ReplyTypewriter({
    targetEl: fighterQuoteEl,
    onUpdate: centerFighterToViewport,
  });
  replyTypewriter.render(initialReply);

  centerFighterToViewport();
  fitLogoToViewport();

  window.addEventListener("resize", centerFighterToViewport);
  window.addEventListener("orientationchange", centerFighterToViewport);
  window.addEventListener("resize", fitLogoToViewport);
  window.addEventListener("orientationchange", fitLogoToViewport);
  window.setTimeout(centerFighterToViewport, 80);
  window.setTimeout(fitLogoToViewport, 80);

  if (!stateBackendControlled) {
    window.setInterval(pushSystemTickLog, runtimeConfig.systemLogIntervalMs);
    window.setInterval(pushBattleTickLog, runtimeConfig.battleTickIntervalMs);
  } else {
    window.setInterval(() => {
      void syncActiveSessionFromBackend();
    }, 1500);
  }

  applyRoleBasedBottomButtons();
  if (isCurrentSessionAdmin) {
    if (closeAsciiBtnEl) {
      closeAsciiBtnEl.addEventListener("click", openProfileSelectorPage);
    }
    if (adminAsciiBtnEl) {
      adminAsciiBtnEl.addEventListener("click", openAdminPage);
    }
  }
}

async function bootstrapAndRender() {
  const finishBoot = () => {
    document.body.classList.remove("app-booting");
  };
  if (isLiveLeaderboardMode()) {
    await renderLiveLeaderboardPage();
    finishBoot();
    return;
  }

  try {
    currentTelegramUserId = resolveTelegramUserId({
      tg,
      url: new URL(window.location.href),
      localStorageRef: window.localStorage,
    });
    if (Number.isFinite(currentTelegramUserId) && currentTelegramUserId > 0) {
      apiClient.setRequesterTelegramUserId?.(currentTelegramUserId);
    }
    await initializeSessionContext();
  } catch (error) {
    const appRootEl = document.getElementById("appRoot");
    if (appRootEl) {
      document.body.classList.add("profile-selector-mode");
      appRootEl.innerHTML = `
        <section class="profile-selector-screen" aria-label="Session Error">
          <pre class="profile-selector-title">$ session/</pre>
          <pre class="profile-selector-item">telegram user id is required</pre>
        </section>
      `;
    }
    finishBoot();
    return;
  }

  if (isAdminMode()) {
    if (!isCurrentSessionAdmin) {
      finishBoot();
      openHomePage();
      return;
    }
    await renderAdminPage();
    finishBoot();
    return;
  }

  if (isProfileSelectorMode()) {
    if (!isCurrentSessionAdmin) {
      finishBoot();
      openHomePage();
      return;
    }
    await renderProfileSelectorPage();
    finishBoot();
    return;
  }

  await renderMainPage();
  finishBoot();
}

void bootstrapAndRender();
