import {
  SPRITE_GRID_WIDTH,
  SPRITE_MIN_GRID_HEIGHT,
  characterPresetByClassId,
  buildRandomPreset,
  detectPresetDominantBaseClass,
  getPresetColorTierWeights,
  getPresetCombatStats,
  renderPresetToSprite,
} from "./src/sprite-constructor.js";
import { CHARACTER_QUOTES } from "./src/character-quotes.js";

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const baseProfileByParam = {
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

function getStartParam() {
  const url = new URL(window.location.href);
  const urlParam =
    url.searchParams.get("startapp") ||
    url.searchParams.get("start_param") ||
    url.searchParams.get("profile");

  return tg?.initDataUnsafe?.start_param || urlParam || "club";
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
  const url = new URL(window.location.href);
  return url.searchParams.get("view") === "profiles";
}

function isAdminMode() {
  const url = new URL(window.location.href);
  return url.searchParams.get("view") === "admin";
}

const randomPreset = buildRandomPreset();
const runtimeStore = loadRuntimeStore();
const profileByParam = runtimeStore.profiles;
const requestedProfileParam = getStartParam();
const activeProfileParam = profileByParam[requestedProfileParam] ? requestedProfileParam : "club";
const selectedProfile = profileByParam[activeProfileParam];
const spriteDebugMode = isSpriteDebugMode();
const state = {
  ...selectedProfile,
  logs: [...(selectedProfile.logs || [])].slice(-5),
};
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
const specialAdjectiveSet = new Set(["Палмерин", "Регги"]);

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

function cloneProfiles(source) {
  return Object.fromEntries(
    Object.entries(source).map(([key, profile]) => [
      key,
      {
        ...profile,
        logs: [...(profile.logs || [])],
      },
    ]),
  );
}

function safeParseJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function computeBattlePower(level, hp, attack) {
  const safeLevel = Number(level) || 0;
  const safeHp = Math.max(1, Number(hp) || 1);
  const safeAttack = Math.max(1, Number(attack) || 1);
  return (safeAttack / (safeHp + BATTLE_POWER_K)) + (safeHp / (safeAttack + BATTLE_POWER_K)) + (BATTLE_W_LVL * safeLevel);
}

function buildProfilePreset(profile) {
  if (!profile) {
    return characterPresetByClassId.warrior;
  }
  if (profile.classId === "random") {
    return randomPreset;
  }
  return characterPresetByClassId[profile.classId] || characterPresetByClassId.warrior;
}

function buildLeaderboardEntries(profilesByKey) {
  const entries = Object.entries(profilesByKey).map(([key, profile]) => {
    const preset = buildProfilePreset(profile);
    const combatStats = getPresetCombatStats(preset);
    const hp = Math.max(1, Number(combatStats.hp) || 1);
    const attack = Math.max(1, Number(combatStats.attack) || 1);
    const level = Number(profile.level) || 1;
    const power = computeBattlePower(level, hp, attack);
    return {
      key,
      id: profile.id,
      classId: profile.classId,
      name: profile.name,
      level,
      hp,
      attack,
      power,
    };
  });

  entries.sort((a, b) => b.power - a.power || b.level - a.level || b.attack - a.attack || a.id - b.id);
  return entries.map((entry, index) => ({
    ...entry,
    rating: index + 1,
  }));
}

function applyRatingsFromLeaderboard(profilesByKey, leaderboardEntries) {
  for (const entry of leaderboardEntries) {
    const profile = profilesByKey[entry.key];
    if (!profile) {
      continue;
    }
    profile.rating = entry.rating;
  }
}

function loadRuntimeStore() {
  const profiles = cloneProfiles(baseProfileByParam);
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJson(rawValue);
  const gameState = {
    finished: false,
    winnerKey: null,
    frozenLeaderboard: null,
  };

  if (parsed && typeof parsed === "object") {
    const savedProfiles = parsed.profiles;
    if (savedProfiles && typeof savedProfiles === "object") {
      for (const [key, saved] of Object.entries(savedProfiles)) {
        const target = profiles[key];
        if (!target || !saved || typeof saved !== "object") {
          continue;
        }
        if (Array.isArray(saved.logs)) {
          target.logs = saved.logs.slice(-20);
        }
        if (Number.isFinite(saved.level)) {
          target.level = Math.max(1, Math.floor(saved.level));
        }
      }
    }

    const savedGame = parsed.game;
    if (savedGame && typeof savedGame === "object") {
      gameState.finished = Boolean(savedGame.finished);
      gameState.winnerKey = typeof savedGame.winnerKey === "string" ? savedGame.winnerKey : null;
      if (Array.isArray(savedGame.frozenLeaderboard)) {
        gameState.frozenLeaderboard = savedGame.frozenLeaderboard;
      }
    }
  }

  const leaderboard = gameState.frozenLeaderboard || buildLeaderboardEntries(profiles);
  applyRatingsFromLeaderboard(profiles, leaderboard);

  return {
    profiles,
    gameState,
  };
}

function persistRuntimeStore(runtimeStore) {
  const profilePayload = Object.fromEntries(
    Object.entries(runtimeStore.profiles).map(([key, profile]) => [
      key,
      {
        level: profile.level,
        logs: (profile.logs || []).slice(-20),
      },
    ]),
  );

  const payload = {
    profiles: profilePayload,
    game: {
      finished: Boolean(runtimeStore.gameState.finished),
      winnerKey: runtimeStore.gameState.winnerKey || null,
      frozenLeaderboard: runtimeStore.gameState.frozenLeaderboard || null,
    },
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildCombatLogText() {
  const isVictory = Math.random() >= 0.5;
  const combatResult = isVictory ? "victory" : "defeat";
  const outcomeLabel = isVictory ? "победа" : "поражение";
  const phrase = isVictory
    ? pickRandomFrom(combatOutcomePhrases.victory, "удар прошел")
    : pickRandomFrom(combatOutcomePhrases.defeat, "удар смазан");
  return {
    combatResult,
    text: `${outcomeLabel}: ${phrase}`,
  };
}

function pickRandomRegularAdjective() {
  const regularAdjectives = randomClassAdjectives.filter((word) => !specialAdjectiveSet.has(word));
  return regularAdjectives[Math.floor(Math.random() * regularAdjectives.length)] || "Дикий";
}

function pickRandomAdjectiveMeta(preset) {
  const adaptive = getPresetColorTierWeights(preset);
  const weightedTiers = [
    { id: "uncommon", weight: adaptive.weights.uncommon },
    { id: "rare", weight: adaptive.weights.rare },
    { id: "seraph", weight: adaptive.weights.seraph },
    { id: "amber", weight: adaptive.weights.amber },
    { id: "reggae", weight: adaptive.weights.reggae },
    { id: "palmerin", weight: adaptive.weights.palmerin },
  ];
  const selectedTier = pickByWeight(weightedTiers)?.id || "uncommon";

  if (selectedTier === "palmerin") {
    return {
      text: "Палмерин",
      color: "#fe0f0e",
      isReggae: false,
      placeAfterClass: false,
    };
  }

  if (selectedTier === "reggae") {
    return {
      text: "Регги",
      color: null,
      isReggae: true,
      placeAfterClass: false,
    };
  }

  const adjective = pickRandomRegularAdjective();
  const color = RANDOM_COLOR_HEX_BY_TIER[selectedTier] || "#2f78ff";

  return {
    text: adjective,
    color,
    isReggae: false,
    placeAfterClass: false,
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

const componentNameRuById = {
  hat_warrior: "Шлем",
  hat_mage: "Шляпа волшебника",
  hat_cowboy: "Ковбойская шляпа",
  arms_warrior: "Щит и меч",
  arms_mage: "Рубаха",
  arms_mage_mantle_top: "Магическое ожерелье",
  arms_cowboy: "Револьверы",
  torso_warrior: "Кираса",
  torso_mage: "Мантия",
  torso_mage_mantle_bottom: "Мантия колдуна",
  torso_cowboy: "Ремень охотника",
  legs_boots: "Ботинки",
};

const baseClassLabelRuById = {
  mage: "Волшебник",
  cowboy: "Ковбой",
  warrior: "Воин",
};

function openProfileSelectorPage() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "profiles");
  url.searchParams.set("startapp", activeProfileParam);
  window.location.href = url.toString();
}

function openAdminPage() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "admin");
  url.searchParams.set("startapp", activeProfileParam);
  window.location.href = url.toString();
}

function openProfilePage(profileParam) {
  const nextParam = profileByParam[profileParam] ? profileParam : "club";
  const url = new URL(window.location.href);
  url.searchParams.set("startapp", nextParam);
  url.searchParams.delete("view");
  window.location.href = url.toString();
}

function renderProfileSelectorPage() {
  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }

  document.body.classList.add("profile-selector-mode");

  appRootEl.innerHTML = `
    <section class="profile-selector-screen" aria-label="Profile Selector">
      <pre class="profile-selector-title">$ profiles/</pre>
      <div class="profile-selector-list" id="profileSelectorList"></div>
    </section>
  `;

  const listEl = document.getElementById("profileSelectorList");
  if (!listEl) {
    return;
  }

  const profileEntries = Object.entries(profileByParam);
  for (const [key, profile] of profileEntries) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "profile-selector-item";
    if (key === activeProfileParam) {
      row.classList.add("profile-selector-item-active");
    }
    row.textContent = `----------  ${profile.classId.padEnd(7, " ")}  ${key}`;
    row.setAttribute("aria-label", `Open profile ${key}`);
    row.addEventListener("click", () => openProfilePage(key));
    listEl.appendChild(row);
  }
}

function buildLeaderboardForView() {
  if (runtimeStore.gameState.finished && Array.isArray(runtimeStore.gameState.frozenLeaderboard)) {
    return runtimeStore.gameState.frozenLeaderboard;
  }
  const entries = buildLeaderboardEntries(profileByParam);
  applyRatingsFromLeaderboard(profileByParam, entries);
  for (const [key, profile] of Object.entries(profileByParam)) {
    if (key === activeProfileParam) {
      state.rating = profile.rating;
      state.level = profile.level;
    }
  }
  persistRuntimeStore(runtimeStore);
  return entries;
}

function appendSystemLogToAllProfiles(text) {
  for (const profile of Object.values(profileByParam)) {
    const nextLogs = [...(profile.logs || []), { time: nowTime(), type: "system", text }];
    profile.logs = nextLogs.slice(-20);
  }
  state.logs = [...(profileByParam[activeProfileParam]?.logs || [])];
}

function finishGameAndFreezeLeaderboard() {
  if (runtimeStore.gameState.finished) {
    return;
  }

  const leaderboard = buildLeaderboardEntries(profileByParam);
  applyRatingsFromLeaderboard(profileByParam, leaderboard);
  const winnerEntry = leaderboard[0] || null;
  runtimeStore.gameState.finished = true;
  runtimeStore.gameState.winnerKey = winnerEntry?.key || null;
  runtimeStore.gameState.frozenLeaderboard = leaderboard;

  const winnerName = winnerEntry?.name || "неизвестный пользователь";
  appendSystemLogToAllProfiles(`битва завершена, победитель: ${winnerName}`);
  persistRuntimeStore(runtimeStore);
}

function renderAdminPage() {
  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }

  const leaderboard = buildLeaderboardForView();
  const winnerKey = runtimeStore.gameState.winnerKey || leaderboard[0]?.key || null;

  document.body.classList.add("profile-selector-mode");
  appRootEl.innerHTML = `
    <section class="admin-screen" aria-label="Admin panel">
      <pre class="admin-title">$ admin/leaderboard</pre>
      <p class="admin-summary">${runtimeStore.gameState.finished ? "status: frozen" : "status: live"}</p>
      <div class="admin-list" id="adminList"></div>
      <div class="admin-actions">
        <button class="admin-btn" id="adminBackBtn" type="button">[profiles]</button>
        <button class="admin-btn" id="finishGameBtn" type="button"${runtimeStore.gameState.finished ? " disabled" : ""}>[finish game]</button>
      </div>
      <p class="admin-note" id="adminNote"></p>
    </section>
  `;

  const listEl = document.getElementById("adminList");
  for (const entry of leaderboard) {
    const row = document.createElement("pre");
    row.className = "admin-row";
    if (entry.key === winnerKey) {
      row.classList.add("admin-row-winner");
    }
    row.textContent =
      `${String(entry.rating).padStart(2, "0")}. ${entry.name.padEnd(14, " ")} ` +
      `${entry.classId.padEnd(7, " ")} Lv${String(entry.level).padStart(2, " ")} ` +
      `HP${String(entry.hp).padStart(2, " ")} ATK${String(entry.attack).padStart(2, " ")} ` +
      `PWR ${entry.power.toFixed(2)}`;
    listEl?.appendChild(row);
  }

  const noteEl = document.getElementById("adminNote");
  noteEl.textContent = runtimeStore.gameState.finished
    ? `winner: ${profileByParam[winnerKey]?.name || "неизвестный"}`
    : "press [finish game] to freeze leaderboard";

  const backBtn = document.getElementById("adminBackBtn");
  backBtn?.addEventListener("click", openProfileSelectorPage);

  const finishBtn = document.getElementById("finishGameBtn");
  finishBtn?.addEventListener("click", () => {
    finishGameAndFreezeLeaderboard();
    renderAdminPage();
  });
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
  const preset =
    state.classId === "random"
      ? randomPreset
      : characterPresetByClassId[state.classId] || characterPresetByClassId.warrior;
  const getLabel = (componentId) => componentNameRuById[componentId] || "Неизвестно";
  const dominantBaseClass = detectPresetDominantBaseClass(preset);
  const dominantBaseClassLabel = baseClassLabelRuById[dominantBaseClass] || "Воин";
  currentCombatStats = getPresetCombatStats(preset);
  let randomAdjectiveMeta = null;

  if (state.classId === "random") {
    randomAdjectiveMeta = pickRandomAdjectiveMeta(preset);
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

  if (state.classId === "random" && randomAdjectiveMeta) {
    // For reggae gradient text, use the central stripe color for sprite tint.
    spriteEl.style.color = randomAdjectiveMeta.isReggae
      ? "#fff500"
      : (randomAdjectiveMeta.color || "#2f78ff");
  } else {
    spriteEl.style.color = rarityToCssVar[state.rarity] || "var(--rare)";
  }
  try {
    const rendered = renderPresetToSprite(preset, state.classId);
    latestRenderedSpriteMeta = rendered;
    if (state.classId === "random" && randomAdjectiveMeta?.isReggae) {
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

function pushRandomLog() {
  if (!character || !replyTypewriter) {
    return;
  }
  if (runtimeStore.gameState.finished) {
    return;
  }

  const weightedTypes = [
    { id: "combat", weight: 0.52 },
    { id: "system", weight: 0.2 },
    { id: "drop", weight: 0.2 },
    { id: "levelup", weight: 0.08 },
  ];
  const selectedType = pickByWeight(weightedTypes)?.id || "combat";
  const combatMeta = selectedType === "combat" ? buildCombatLogText() : null;
  const randomText =
    selectedType === "combat"
      ? combatMeta.text
      : pickRandomFrom(logPoolByType[selectedType] || logPoolByType.system, "signal stable");

  state.logs.push({
    time: nowTime(),
    type: selectedType,
    ...(combatMeta ? { combatResult: combatMeta.combatResult } : {}),
    text: randomText,
  });
  state.logs = state.logs.slice(-5);
  if (profileByParam[activeProfileParam]) {
    profileByParam[activeProfileParam].logs = [...state.logs];
  }
  persistRuntimeStore(runtimeStore);

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

  logoEl.style.transform = "scale(1)";
  const wrapWidth = logoWrapEl.clientWidth;
  const logoWidth = logoEl.scrollWidth;

  if (!wrapWidth || !logoWidth) {
    return;
  }

  const scale = Math.min(1, wrapWidth / logoWidth);
  logoEl.style.transform = `scale(${scale})`;
}

if (isAdminMode()) {
  renderAdminPage();
} else if (isProfileSelectorMode()) {
  renderProfileSelectorPage();
} else {
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

  window.setInterval(pushRandomLog, 10000);

  if (closeAsciiBtnEl) {
    closeAsciiBtnEl.addEventListener("click", openProfileSelectorPage);
  }
  if (adminAsciiBtnEl) {
    adminAsciiBtnEl.addEventListener("click", openAdminPage);
  }
}
