import {
  COMPONENT_SLOTS,
  componentById,
  randomPoolBySlot,
  characterPresetByClassId,
  buildRandomPreset,
  detectPresetDominantBaseClass,
  getPresetCombatStats,
  getPresetColorTierWeights,
  validatePresetOrThrow,
} from './sprite-constructor.js';

const BATTLE_POWER_K = 1;
const BATTLE_W_LVL = 0.55;
const MATCHMAKING_PRIORITY_QUANTILE = 0.25;
const MATCHMAKING_STALE_TICKS = 3;
const MATCHMAKING_RELAX_OFFSETS = Object.freeze([0, 0.4, 0.8]);
const MATCHMAKING_FORCED_PAIR_CAP = 1;
const DEFAULT_MATCHMAKING_MAX_DELTA = 1.75;
const COLOR_TIER_SEQUENCE = ['uncommon', 'rare', 'seraph', 'amber', 'reggae', 'palmerin'];
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
const LEVEL_GAIN_UPSET_THRESHOLD = 0.35;
const LEVEL_GAIN_BALANCED_THRESHOLD = 0.54;
const LOSER_STREAK_SHIELD_PER_LOSS = 0.03;
const LOSER_STREAK_SHIELD_MAX = 0.15;
const TIME_NORMALIZATION_BASE_MS = 18000;
const MIN_TIME_SCALE = 0.25;
const MAX_TIME_SCALE = 1;

export const MAX_STORED_LOGS_PER_USER = 20;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeTimeScale(battleTickIntervalMs) {
  const intervalMs = Number(battleTickIntervalMs);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return 1;
  }
  return clamp(intervalMs / TIME_NORMALIZATION_BASE_MS, MIN_TIME_SCALE, MAX_TIME_SCALE);
}

function scaleChanceByTime(chance, timeScale) {
  return clamp((Number(chance) || 0) * timeScale, 0, 1);
}

function drawRandom(rngTrace, label) {
  const value = Math.random();
  if (Array.isArray(rngTrace)) {
    rngTrace.push({ label, value: Number(value.toFixed(6)) });
  }
  return value;
}

function pickRandomFrom(items, fallback = null) {
  if (!Array.isArray(items) || !items.length) {
    return fallback;
  }
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
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

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildSystemLogText() {
  return pickRandomFrom(['arena sync', 'match queue ready', 'signal stable'], 'arena sync');
}

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

function buildCombatLogText(forcedResult = null) {
  const combatResult = forcedResult === 'victory' || forcedResult === 'defeat'
    ? forcedResult
    : (Math.random() >= 0.5 ? 'victory' : 'defeat');
  const isVictory = combatResult === 'victory';
  const outcomeLabel = isVictory ? 'победа' : 'поражение';
  const phrase = isVictory
    ? pickRandomFrom(combatOutcomePhrases.victory, 'удар прошел')
    : pickRandomFrom(combatOutcomePhrases.defeat, 'удар смазан');
  return {
    combatResult,
    text: `${outcomeLabel}: ${phrase}`,
  };
}

export function computeBattlePower(level, hp, attack) {
  const safeLevel = Number(level) || 0;
  const safeHp = Math.max(1, Number(hp) || 1);
  const safeAttack = Math.max(1, Number(attack) || 1);
  return (safeAttack / (safeHp + BATTLE_POWER_K)) + (safeHp / (safeAttack + BATTLE_POWER_K)) + (BATTLE_W_LVL * safeLevel);
}

function buildProfilePreset(user) {
  if (!user) {
    return characterPresetByClassId.warrior;
  }
  const candidate = user?.components;
  if (candidate && typeof candidate === 'object') {
    const preset = {};
    for (const slot of COMPONENT_SLOTS) {
      preset[slot] = candidate[slot];
    }
    try {
      validatePresetOrThrow(preset);
      return preset;
    } catch {
      // continue to fallback
    }
  }
  if (user.templateKey === 'random') {
    return buildRandomPreset();
  }
  return { ...(characterPresetByClassId[user.classId] || characterPresetByClassId.warrior) };
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

function stepColorTier(currentTier, direction) {
  const currentStep = getTierStep(currentTier);
  const nextStep = currentStep + direction;
  return COLOR_TIER_SEQUENCE[clamp(nextStep, 0, COLOR_TIER_SEQUENCE.length - 1)];
}

function pickRandomRegularAdjectiveWord() {
  const regularAdjectives = RANDOM_ADJECTIVES.filter((word) => !SPECIAL_ADJECTIVES.has(word));
  return regularAdjectives[Math.floor(Math.random() * regularAdjectives.length)] || 'Дикий';
}

function buildAdjectiveFromTier(tier) {
  if (tier === 'palmerin') {
    return 'Палмерин';
  }
  if (tier === 'reggae') {
    return 'Регги';
  }
  return pickRandomRegularAdjectiveWord();
}

function ensureUserCombatIdentity(user) {
  const preset = buildProfilePreset(user);
  const stats = getPresetCombatStats(preset);
  user.components = preset;
  user.classId = detectPresetDominantBaseClass(preset);
  user.level = clamp(Math.max(1, Number(user.level) || 1), 1, 999);
  user.hp = Math.max(1, Number(stats.hp) || 1);
  user.attack = Math.max(1, Number(stats.attack) || 1);
  user.battlesTotal = Math.max(0, Number(user.battlesTotal) || 0);
  user.lastBattleTick = Math.max(0, Number(user.lastBattleTick) || 0);
  user.winStreak = Math.max(0, Number(user.winStreak) || 0);
  user.loseStreak = Math.max(0, Number(user.loseStreak) || 0);
  if (!user.colorTier) {
    user.colorTier = pickRandomTierByPreset(preset);
  }
  if (!user.adjective) {
    user.adjective = buildAdjectiveFromTier(user.colorTier);
  }
  return { preset, stats };
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

function pickWeightedCandidate(items, getWeight, rngTrace = null, rollLabel = 'weighted_pick') {
  if (!items.length) {
    return { item: null, meta: { poolSize: 0, totalWeight: 0, roll: null, mode: 'empty', selectedWeight: 0 } };
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
        mode: 'uniform_fallback',
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
          mode: 'weighted',
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
      mode: 'weighted_fallback',
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

function tryApplyWinnerDrop(user, powerDelta, rngTrace = null, timeScale = 1) {
  const preset = buildProfilePreset(user);
  const slotsWithUpgrades = COMPONENT_SLOTS
    .map((slot) => ({ slot, upgrades: getSlotUpgradePool(slot, preset[slot]) }))
    .filter((entry) => entry.upgrades.length > 0);
  if (!slotsWithUpgrades.length) {
    return {
      item: null,
      meta: {
        reason: 'no_upgrade_pool',
        selection: {
          context: 'winner_upgrade',
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
          selectionMode: 'empty_pool',
        },
      },
    };
  }

  const rawDropChance = clamp(0.26 + (powerDelta * 0.12), 0.1, 0.62);
  const dropChance = scaleChanceByTime(rawDropChance, timeScale);
  const dropRoll = drawRandom(rngTrace, 'winner.drop.roll');
  if (dropRoll > dropChance) {
    return {
      item: null,
      meta: {
        reason: 'chance_failed',
        rawDropChance: Number(rawDropChance.toFixed(4)),
        dropChance: Number(dropChance.toFixed(4)),
        dropRoll: Number(dropRoll.toFixed(6)),
        selection: {
          context: 'winner_upgrade',
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
          selectionMode: 'chance_failed',
        },
      },
    };
  }

  const slotIdx = Math.floor(drawRandom(rngTrace, 'winner.drop.slot_roll') * slotsWithUpgrades.length);
  const slotEntry = slotsWithUpgrades[slotIdx];
  if (!slotEntry) {
    return { item: null, meta: { reason: 'invalid_slot_selection' } };
  }
  const currentComponentId = preset[slotEntry.slot];
  const currentScore = getComponentScore(currentComponentId);
  const upgradeCandidates = slotEntry.upgrades.map((candidateId) => {
    const gain = Math.max(1, getComponentScore(candidateId) - currentScore);
    const antiJumpWeight = 1 / (gain * gain);
    const componentWeight = getComponentWeight(candidateId);
    return {
      componentId: candidateId,
      gain,
      antiJumpWeight: Number(antiJumpWeight.toFixed(6)),
      componentWeight: Number(componentWeight.toFixed(6)),
      finalWeight: antiJumpWeight * componentWeight,
    };
  });
  const pickedUpgradeResult = pickWeightedCandidate(
    upgradeCandidates,
    (candidate) => candidate.finalWeight,
    rngTrace,
    'winner.drop.component_roll',
  );
  const pickedUpgrade = pickedUpgradeResult.item;
  if (!pickedUpgrade?.componentId) {
    return { item: null, meta: { reason: 'no_component_selected' } };
  }

  const nextPreset = { ...preset, [slotEntry.slot]: pickedUpgrade.componentId };
  try {
    validatePresetOrThrow(nextPreset);
  } catch {
    return { item: null, meta: { reason: 'validation_failed' } };
  }

  user.components = nextPreset;
  user.classId = detectPresetDominantBaseClass(nextPreset);
  return {
    item: { slot: slotEntry.slot, componentId: pickedUpgrade.componentId },
    meta: {
      reason: 'applied',
      rawDropChance: Number(rawDropChance.toFixed(4)),
      dropChance: Number(dropChance.toFixed(4)),
      dropRoll: Number(dropRoll.toFixed(6)),
      slotPoolSize: slotsWithUpgrades.length,
      selection: {
        context: 'winner_upgrade',
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

function tryApplyLoserDowngrade(user, powerDelta, rngTrace = null, timeScale = 1) {
  const preset = buildProfilePreset(user);
  const slotsWithDowngrades = COMPONENT_SLOTS
    .map((slot) => ({ slot, downgrades: getSlotDowngradePool(slot, preset[slot]) }))
    .filter((entry) => entry.downgrades.length > 0);
  if (!slotsWithDowngrades.length) {
    return {
      item: null,
      meta: {
        reason: 'no_downgrade_pool',
        selection: {
          context: 'loser_downgrade',
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
          selectionMode: 'empty_pool',
        },
      },
    };
  }

  const loseStreak = Math.max(0, Number(user.loseStreak) || 0);
  const streakShield = Math.min(
    LOSER_STREAK_SHIELD_MAX,
    loseStreak * LOSER_STREAK_SHIELD_PER_LOSS * timeScale,
  );
  const rawDowngradeChance = clamp((0.24 + (powerDelta * 0.16)) - streakShield, 0.08, 0.72);
  const downgradeChance = scaleChanceByTime(rawDowngradeChance, timeScale);
  const downgradeRoll = drawRandom(rngTrace, 'loser.downgrade.roll');
  if (downgradeRoll > downgradeChance) {
    return {
      item: null,
      meta: {
        reason: 'chance_failed',
        rawDowngradeChance: Number(rawDowngradeChance.toFixed(4)),
        downgradeChance: Number(downgradeChance.toFixed(4)),
        downgradeRoll: Number(downgradeRoll.toFixed(6)),
        streakShield: Number(streakShield.toFixed(4)),
        selection: {
          context: 'loser_downgrade',
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
          selectionMode: 'chance_failed',
        },
      },
    };
  }

  const slotIdx = Math.floor(drawRandom(rngTrace, 'loser.downgrade.slot_roll') * slotsWithDowngrades.length);
  const slotEntry = slotsWithDowngrades[slotIdx];
  if (!slotEntry) {
    return { item: null, meta: { reason: 'invalid_slot_selection' } };
  }
  const currentComponentId = preset[slotEntry.slot];
  const currentScore = getComponentScore(currentComponentId);
  const downgradeCandidates = slotEntry.downgrades.map((candidateId) => {
    const drop = Math.max(1, currentScore - getComponentScore(candidateId));
    const antiJumpWeight = 1 / (drop * drop * drop);
    const componentWeight = getComponentWeight(candidateId);
    return {
      componentId: candidateId,
      drop,
      antiJumpWeight: Number(antiJumpWeight.toFixed(6)),
      componentWeight: Number(componentWeight.toFixed(6)),
      finalWeight: antiJumpWeight * componentWeight,
    };
  });
  const pickedDowngradeResult = pickWeightedCandidate(
    downgradeCandidates,
    (candidate) => candidate.finalWeight,
    rngTrace,
    'loser.downgrade.component_roll',
  );
  const pickedDowngrade = pickedDowngradeResult.item;
  if (!pickedDowngrade?.componentId) {
    return { item: null, meta: { reason: 'no_component_selected' } };
  }

  const nextPreset = { ...preset, [slotEntry.slot]: pickedDowngrade.componentId };
  try {
    validatePresetOrThrow(nextPreset);
  } catch {
    return { item: null, meta: { reason: 'validation_failed' } };
  }

  user.components = nextPreset;
  user.classId = detectPresetDominantBaseClass(nextPreset);
  return {
    item: { slot: slotEntry.slot, componentId: pickedDowngrade.componentId },
    meta: {
      reason: 'applied',
      rawDowngradeChance: Number(rawDowngradeChance.toFixed(4)),
      downgradeChance: Number(downgradeChance.toFixed(4)),
      downgradeRoll: Number(downgradeRoll.toFixed(6)),
      slotPoolSize: slotsWithDowngrades.length,
      streakShield: Number(streakShield.toFixed(4)),
      selection: {
        context: 'loser_downgrade',
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

function applyScaledLevelGain(baseGain, timeScale, rngTrace = null) {
  const safeGain = Math.max(0, Number(baseGain) || 0);
  if (safeGain <= 0) {
    return 0;
  }
  if (timeScale >= 1) {
    return safeGain;
  }
  let appliedGain = 0;
  for (let idx = 0; idx < safeGain; idx += 1) {
    if (drawRandom(rngTrace, `winner.level.scale.roll_${idx + 1}`) < timeScale) {
      appliedGain += 1;
    }
  }
  return appliedGain;
}

function updateUserAfterBattleVictory(winner, powerDelta, winnerWinProbability, timeScale, rngTrace = null) {
  const baseLevelGain = computeWinnerLevelGain(winnerWinProbability);
  const levelGain = applyScaledLevelGain(baseLevelGain, timeScale, rngTrace);
  winner.level = Math.max(1, Number(winner.level) || 1) + levelGain;
  winner.winStreak = (Number(winner.winStreak) || 0) + 1;
  winner.loseStreak = 0;
  const dropResult = tryApplyWinnerDrop(winner, powerDelta, rngTrace, timeScale);
  const item = dropResult.item;

  let colorChanged = false;
  let colorMeta = { reason: 'not_random_template' };
  if (winner.templateKey === 'random') {
    const rawUpChance = clamp(0.15 + (powerDelta * 0.08), 0.04, 0.42);
    const upChance = scaleChanceByTime(rawUpChance, timeScale);
    const upRoll = drawRandom(rngTrace, 'winner.color.roll');
    if (upRoll < upChance) {
      const nextTier = stepColorTier(winner.colorTier || DEFAULT_RANDOM_TIER, 1);
      if (nextTier !== winner.colorTier) {
        winner.colorTier = nextTier;
        winner.adjective = buildAdjectiveFromTier(nextTier);
        colorChanged = true;
        colorMeta = {
          reason: 'applied',
          rawUpChance: Number(rawUpChance.toFixed(4)),
          upChance: Number(upChance.toFixed(4)),
          upRoll: Number(upRoll.toFixed(6)),
          nextTier,
        };
      } else {
        colorMeta = {
          reason: 'at_cap',
          rawUpChance: Number(rawUpChance.toFixed(4)),
          upChance: Number(upChance.toFixed(4)),
          upRoll: Number(upRoll.toFixed(6)),
        };
      }
    } else {
      colorMeta = {
        reason: 'chance_failed',
        rawUpChance: Number(rawUpChance.toFixed(4)),
        upChance: Number(upChance.toFixed(4)),
        upRoll: Number(upRoll.toFixed(6)),
      };
    }
  }

  return {
    item,
    colorChanged,
    baseLevelGain,
    levelGain,
    winnerWinProbability: Number(winnerWinProbability.toFixed(4)),
    dropMeta: dropResult.meta,
    colorMeta,
  };
}

function updateUserAfterBattleDefeat(loser, powerDelta, loserWinProbability, timeScale, rngTrace = null) {
  loser.winStreak = 0;
  loser.loseStreak = (Number(loser.loseStreak) || 0) + 1;
  const downgradeResult = tryApplyLoserDowngrade(loser, powerDelta, rngTrace, timeScale);
  const item = downgradeResult.item;

  let colorChanged = false;
  let colorMeta = { reason: 'not_random_template' };
  if (loser.templateKey === 'random') {
    const streakShield = Math.min(
      LOSER_STREAK_SHIELD_MAX,
      (Number(loser.loseStreak) || 0) * LOSER_STREAK_SHIELD_PER_LOSS * timeScale,
    );
    const rawDownChance = clamp((0.21 + (powerDelta * 0.12)) - streakShield, 0.04, 0.46);
    const downChance = scaleChanceByTime(rawDownChance, timeScale);
    const downRoll = drawRandom(rngTrace, 'loser.color.roll');
    if (downRoll < downChance) {
      const nextTier = stepColorTier(loser.colorTier || DEFAULT_RANDOM_TIER, -1);
      if (nextTier !== loser.colorTier) {
        loser.colorTier = nextTier;
        loser.adjective = buildAdjectiveFromTier(nextTier);
        colorChanged = true;
        colorMeta = {
          reason: 'applied',
          rawDownChance: Number(rawDownChance.toFixed(4)),
          downChance: Number(downChance.toFixed(4)),
          downRoll: Number(downRoll.toFixed(6)),
          nextTier,
          streakShield: Number(streakShield.toFixed(4)),
        };
      } else {
        colorMeta = {
          reason: 'at_floor',
          rawDownChance: Number(rawDownChance.toFixed(4)),
          downChance: Number(downChance.toFixed(4)),
          downRoll: Number(downRoll.toFixed(6)),
          streakShield: Number(streakShield.toFixed(4)),
        };
      }
    } else {
      colorMeta = {
        reason: 'chance_failed',
        rawDownChance: Number(rawDownChance.toFixed(4)),
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

function runBattleForPair(firstEntry, secondEntry, pairingMeta = null, timeScale = 1) {
  const rngTrace = [];
  const firstUser = firstEntry.user;
  const secondUser = secondEntry.user;
  const first = buildUserCombatSnapshot(firstUser);
  const second = buildUserCombatSnapshot(secondUser);
  const firstBefore = snapshotUserForBattle(firstUser);
  const secondBefore = snapshotUserForBattle(secondUser);
  const pFirst = 1 / (1 + Math.exp(second.power - first.power));
  const pSecond = 1 - pFirst;
  const outcomeRoll = drawRandom(rngTrace, 'battle.outcome.roll');
  const firstWins = outcomeRoll < pFirst;
  const winner = firstWins ? first : second;
  const loser = firstWins ? second : first;
  const powerDelta = Math.abs(first.power - second.power);
  const winnerBefore = firstWins ? firstBefore : secondBefore;
  const loserBefore = firstWins ? secondBefore : firstBefore;
  const winnerWinProbability = firstWins ? pFirst : pSecond;
  const loserWinProbability = firstWins ? pSecond : pFirst;

  const winnerUpdates = updateUserAfterBattleVictory(
    winner.user,
    powerDelta,
    winnerWinProbability,
    timeScale,
    rngTrace,
  );
  const loserUpdates = updateUserAfterBattleDefeat(
    loser.user,
    powerDelta,
    loserWinProbability,
    timeScale,
    rngTrace,
  );
  return {
    pair: {
      leftUserId: firstUser.id,
      rightUserId: secondUser.id,
      leftMmScore: Number(firstEntry.mmScore.toFixed(4)),
      rightMmScore: Number(secondEntry.mmScore.toFixed(4)),
      leftWinProbability: Number(pFirst.toFixed(4)),
      rightWinProbability: Number(pSecond.toFixed(4)),
      matchKind: pairingMeta?.matchKind || 'strict',
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

function buildComponentDetails(preset) {
  return COMPONENT_SLOTS.map((slot) => {
    const id = preset?.[slot] || null;
    const component = id ? componentById[id] : null;
    return {
      slot,
      id,
      baseClass: component?.baseClass || 'shared',
      stats: {
        hp: Number(component?.stats?.hp) || 0,
        attack: Number(component?.stats?.attack) || 0,
      },
    };
  });
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
    adjective: user.adjective || '',
    stats: {
      hp,
      attack,
      power: computeBattlePower(user.level, hp, attack),
    },
    preset,
    components: buildComponentDetails(preset),
  };
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
    ['level', before.level, after.level],
    ['rating', before.rating, after.rating],
    ['winStreak', before.winStreak, after.winStreak],
    ['loseStreak', before.loseStreak, after.loseStreak],
    ['classId', before.classId, after.classId],
    ['colorTier', before.colorTier, after.colorTier],
    ['adjective', before.adjective, after.adjective],
    ['stats.hp', before.stats?.hp, after.stats?.hp],
    ['stats.attack', before.stats?.attack, after.stats?.attack],
    ['stats.power', before.stats?.power, after.stats?.power],
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
        decision: 'accepted',
        matchKind: passIndex === 0 ? 'strict' : 'relaxed',
        deltaLimitUsed: Number(currentMaxDelta.toFixed(4)),
        leftWasPriority: leftPriority,
        rightWasPriority: best.rightPriority,
      });
      pairs.push({
        left,
        right: best.entry,
        meta: {
          matchKind: passIndex === 0 ? 'strict' : 'relaxed',
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
        decision: 'accepted',
        matchKind: 'forced',
        deltaLimitUsed: Number(best.delta.toFixed(4)),
        leftWasPriority: true,
        rightWasPriority: isPriorityUser(best.entry),
      });
      pairs.push({
        left,
        right: best.entry,
        meta: {
          matchKind: 'forced',
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
        decision: 'rejected',
        reason: forcedPairsCount >= MATCHMAKING_FORCED_PAIR_CAP ? 'forced_cap_reached' : 'delta_exceeded',
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
      unmatchedReason: forcedPairsCount >= MATCHMAKING_FORCED_PAIR_CAP ? 'forced_cap_reached' : 'no_candidate_within_relaxed',
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

export function buildLeaderboardEntries(users) {
  const entries = users.map((user) => {
    const { stats } = ensureUserCombatIdentity(user);
    const level = Math.max(1, Number(user.level) || 1);
    const hp = Math.max(1, Number(stats.hp) || 1);
    const attack = Math.max(1, Number(stats.attack) || 1);
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
  return entries.map((entry, index) => ({ ...entry, rating: index + 1 }));
}

export function applyRatingsFromLeaderboard(users, leaderboard) {
  const byUserId = new Map(leaderboard.map((entry) => [entry.userId, entry.rating]));
  for (const user of users) {
    user.rating = byUserId.get(user.id) || 0;
  }
}

export function pushUserLog(user, logItem) {
  const current = Array.isArray(user.logs) ? user.logs : [];
  const next = [...current, logItem];
  user.logs = next.slice(-MAX_STORED_LOGS_PER_USER);
}

export function runSystemTick(users) {
  const text = buildSystemLogText();
  for (const user of users) {
    pushUserLog(user, {
      time: nowTime(),
      type: 'system',
      text,
    });
  }
}

export function runBattleTick(users, options = {}) {
  if (!Array.isArray(users) || users.length < 2) {
    return { fights: 0, pairs: [] };
  }

  const currentTick = Math.max(1, Number(options.currentTick) || 1);
  const matchmakingMaxDeltaRaw = Number(options.matchmakingMaxDelta);
  const matchmakingMaxDelta = Number.isFinite(matchmakingMaxDeltaRaw)
    ? matchmakingMaxDeltaRaw
    : DEFAULT_MATCHMAKING_MAX_DELTA;
  const timeScale = computeTimeScale(options.battleTickIntervalMs);

  for (const user of users) {
    ensureUserCombatIdentity(user);
  }

  const matchmakingRngTrace = [];
  const shuffled = shuffleUsers(users, matchmakingRngTrace);
  const queue = shuffled
    .map((user) => ({ user, mmScore: computeMatchmakingScore(user, matchmakingRngTrace) }))
    .sort((a, b) => a.mmScore - b.mmScore);

  const leaderboardBefore = buildLeaderboardEntries(users);
  const pairingResult = buildBattlePairs(queue, matchmakingMaxDelta, currentTick);
  const effectiveMaxDelta = Number(pairingResult.effectiveMaxDelta || matchmakingMaxDelta);
  const matchmakingPool = buildMatchmakingPoolSnapshot(queue, effectiveMaxDelta);
  const battleEvents = [];
  for (const pairing of pairingResult.pairs) {
    battleEvents.push(runBattleForPair(pairing.left, pairing.right, pairing.meta, timeScale));
  }

  if (!battleEvents.length) {
    const leaderboardNoFight = buildLeaderboardEntries(users);
    applyRatingsFromLeaderboard(users, leaderboardNoFight);
    return {
      fights: 0,
      pairs: [],
      unmatchedUserIds: pairingResult.unmatchedUserIds,
      pairing: {
        decisions: pairingResult.pairDecisions || [],
        unmatchedDetails: pairingResult.unmatchedDetails || [],
        passStats: pairingResult.passStats || [],
        priorityLowBattleThreshold: pairingResult.priorityLowBattleThreshold,
        forcedPairsCount: pairingResult.forcedPairsCount || 0,
        effectiveMaxDelta,
        pool: matchmakingPool,
      },
      rngTrace: {
        matchmaking: matchmakingRngTrace,
      },
      timeScale: Number(timeScale.toFixed(4)),
      battles: [],
      leaderboardBefore,
      leaderboard: leaderboardNoFight,
      leaderboardAfter: leaderboardNoFight,
    };
  }

  for (const event of battleEvents) {
    event.winner.battlesTotal = (Number(event.winner.battlesTotal) || 0) + 1;
    event.winner.lastBattleTick = currentTick;
    event.loser.battlesTotal = (Number(event.loser.battlesTotal) || 0) + 1;
    event.loser.lastBattleTick = currentTick;
    ensureUserCombatIdentity(event.winner);
    ensureUserCombatIdentity(event.loser);

    const winnerMeta = buildCombatLogText('victory');
    const loserMeta = buildCombatLogText('defeat');
    pushUserLog(event.winner, {
      time: nowTime(),
      type: 'combat',
      combatResult: 'victory',
      text: winnerMeta.text,
    });
    if ((Number(event.winnerUpdates.levelGain) || 0) > 0) {
      pushUserLog(event.winner, {
        time: nowTime(),
        type: 'levelup',
        text: `уровень повышен: Lv ${event.winner.level}`,
      });
    }
    if (event.winnerUpdates.item) {
      pushUserLog(event.winner, {
        time: nowTime(),
        type: 'drop',
        text: `дроп: улучшен слот ${event.winnerUpdates.item.slot}`,
      });
    }
    if (event.winnerUpdates.colorChanged) {
      pushUserLog(event.winner, {
        time: nowTime(),
        type: 'levelup',
        text: 'аура усилена',
      });
    }

    pushUserLog(event.loser, {
      time: nowTime(),
      type: 'combat',
      combatResult: 'defeat',
      text: loserMeta.text,
    });
    if (event.loserUpdates.item) {
      pushUserLog(event.loser, {
        time: nowTime(),
        type: 'drop',
        text: `потеря: ослаблен слот ${event.loserUpdates.item.slot}`,
      });
    }
    if (event.loserUpdates.colorChanged) {
      pushUserLog(event.loser, {
        time: nowTime(),
        type: 'system',
        text: 'аура ослабла',
      });
    }
  }

  const leaderboard = buildLeaderboardEntries(users);
  applyRatingsFromLeaderboard(users, leaderboard);
  return {
    fights: battleEvents.length,
    pairs: battleEvents.map((event) => [event.pair.leftUserId, event.pair.rightUserId]),
    unmatchedUserIds: pairingResult.unmatchedUserIds,
    pairing: {
      decisions: pairingResult.pairDecisions || [],
      unmatchedDetails: pairingResult.unmatchedDetails || [],
      passStats: pairingResult.passStats || [],
      priorityLowBattleThreshold: pairingResult.priorityLowBattleThreshold,
      forcedPairsCount: pairingResult.forcedPairsCount || 0,
      effectiveMaxDelta,
      pool: matchmakingPool,
    },
    rngTrace: {
      matchmaking: matchmakingRngTrace,
      battles: battleEvents.map((event) => ({
        pair: event.pair,
        trace: event.rngTrace || [],
      })),
    },
    timeScale: Number(timeScale.toFixed(4)),
    battles: battleEvents.map((event) => ({
      pair: event.pair,
      winnerUserId: event.winner.id,
      loserUserId: event.loser.id,
      winnerUpdates: event.winnerUpdates,
      loserUpdates: event.loserUpdates,
      winnerDiff: computeStateDiff(event.winnerBefore, event.winnerAfter),
      loserDiff: computeStateDiff(event.loserBefore, event.loserAfter),
      powerDelta: Number(event.powerDelta.toFixed(4)),
    })),
    leaderboardBefore,
    leaderboard,
    leaderboardAfter: leaderboard,
  };
}
